<?php
/**
 * Intelligent UI in posts: match cards, lineups, standings, tickets, weather and more from JSON
 * (written by you, your AI or your API). Two ways:
 *
 *   [lumafx_ui lang="sq"]{"blocks":[{"type":"match", ...}]}[/lumafx_ui]
 *   [lumafx_ui src="https://example.com/api/match/123/ui.json"]
 *
 * or an <fx-ui> element in a Custom HTML block. The scripts load only on pages that use them.
 *
 * @package lumafx
 */

defined( 'ABSPATH' ) || exit;

function lumafx_ui_register_assets() {
	wp_register_style( 'lumafx-ui', LUMAFX_URL . 'assets/lumafx-ui.css', array(), LUMAFX_VERSION );
	wp_register_script( 'lumafx-ui', LUMAFX_URL . 'assets/lumafx-ui.global.js', array(), LUMAFX_VERSION, array( 'strategy' => 'defer' ) );
}
add_action( 'wp_enqueue_scripts', 'lumafx_ui_register_assets', 5 );

function lumafx_ui_enqueue() {
	if ( ! wp_style_is( 'lumafx-ui', 'registered' ) ) {
		lumafx_ui_register_assets();
	}
	wp_enqueue_style( 'lumafx-ui' );
	wp_enqueue_script( 'lumafx-ui' );
}

/**
 * Cleans JSON written in the editor: removes paragraphs and line breaks the classic editor may add,
 * and smart quotes from older content.
 *
 * @param string $raw Shortcode content.
 * @return array|null Decoded document, or null when it is not valid JSON.
 */
function lumafx_ui_parse( $raw ) {
	$raw = str_replace( array( '<p>', '</p>', '<br />', '<br/>', '<br>' ), array( '', "\n", "\n", "\n", "\n" ), (string) $raw );
	$raw = html_entity_decode( $raw, ENT_QUOTES | ENT_HTML5, 'UTF-8' );
	$raw = str_replace( array( "\u{201C}", "\u{201D}", "\u{2033}" ), '"', $raw );
	$raw = trim( $raw );
	if ( '' === $raw ) {
		return null;
	}
	$data = json_decode( $raw, true );
	return is_array( $data ) ? $data : null;
}

/**
 * [lumafx_ui] shortcode.
 *
 * @param array|string $atts    lang, src, time-zone, ask-url, class.
 * @param string|null  $content The JSON document.
 * @return string
 */
function lumafx_ui_shortcode( $atts, $content = null ) {
	$atts = shortcode_atts(
		array(
			'lang'      => '',
			'src'       => '',
			'time-zone' => '',
			'timezone'  => '',
			'ask-url'   => '',
			'class'     => '',
		),
		$atts,
		'lumafx_ui'
	);
	$attrs = '';
	if ( $atts['lang'] && preg_match( '/^[a-z]{2}(-[A-Za-z]{2})?$/', $atts['lang'] ) ) {
		$attrs .= ' lang="' . esc_attr( $atts['lang'] ) . '"';
	}
	$tz = $atts['time-zone'] ? $atts['time-zone'] : ( $atts['timezone'] ? $atts['timezone'] : wp_timezone_string() );
	if ( '+00:00' === $tz ) {
		$tz = 'UTC';
	}
	if ( $tz && preg_match( '#^[A-Za-z_]+(/[A-Za-z0-9_+-]+)*$#', $tz ) ) {
		$attrs .= ' time-zone="' . esc_attr( $tz ) . '"';
	}
	if ( $atts['ask-url'] ) {
		$attrs .= ' ask-url="' . esc_url( $atts['ask-url'] ) . '"';
	}
	if ( $atts['class'] ) {
		$attrs .= ' class="' . esc_attr( implode( ' ', array_map( 'sanitize_html_class', preg_split( '/\s+/', $atts['class'] ) ) ) ) . '"';
	}

	$doc = lumafx_ui_parse( $content );
	if ( $doc ) {
		lumafx_ui_enqueue();
		// JSON_HEX_TAG turns < and > into < and >, so nothing can close the script tag.
		$json = wp_json_encode( $doc, JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES );
		return '<fx-ui' . $attrs . '><script type="application/json">' . $json . '</script></fx-ui>';
	}
	if ( $atts['src'] ) {
		$src = esc_url( $atts['src'] );
		if ( $src ) {
			lumafx_ui_enqueue();
			return '<fx-ui' . $attrs . ' src="' . $src . '"></fx-ui>';
		}
	}
	if ( null !== $content && '' !== trim( (string) $content ) && current_user_can( 'edit_posts' ) ) {
		return '<p class="lumafx-ui-error"><strong>lumafx UI:</strong> ' . esc_html__( 'the JSON in this shortcode is not valid.', 'lumafx' ) . '</p>';
	}
	return '';
}
add_shortcode( 'lumafx_ui', 'lumafx_ui_shortcode' );

/** Keep quotes in the JSON straight. */
function lumafx_ui_no_texturize( $shortcodes ) {
	$shortcodes[] = 'lumafx_ui';
	return $shortcodes;
}
add_filter( 'no_texturize_shortcodes', 'lumafx_ui_no_texturize' );

/** Load the UI scripts for <fx-ui> written in a Custom HTML block (or any block). */
function lumafx_ui_detect( $html ) {
	if ( is_string( $html ) && false !== strpos( $html, '<fx-ui' ) ) {
		lumafx_ui_enqueue();
	}
	return $html;
}
add_filter( 'render_block', 'lumafx_ui_detect', 20 );
add_filter( 'the_content', 'lumafx_ui_detect', 20 );
