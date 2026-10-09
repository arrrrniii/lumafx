<?php
/**
 * Effects on any block.
 *
 * The editor stores the choice in a `lumafx` block attribute ({ effects: [], options: {} }).
 * Nothing is written into the saved block markup: the attributes are added while the page
 * renders, so deactivating the plugin leaves every post valid and unchanged.
 *
 * @package lumafx
 */

defined( 'ABSPATH' ) || exit;

/**
 * Registers the `lumafx` attribute on every block type, including server-rendered ones,
 * so their editor previews accept it.
 *
 * @param array $args Block type arguments.
 * @return array
 */
function lumafx_block_type_args( $args ) {
	if ( ! isset( $args['attributes'] ) || ! is_array( $args['attributes'] ) ) {
		$args['attributes'] = array();
	}
	if ( ! isset( $args['attributes']['lumafx'] ) ) {
		$args['attributes']['lumafx'] = array( 'type' => 'object' );
	}
	return $args;
}
add_filter( 'register_block_type_args', 'lumafx_block_type_args', 20 );

/**
 * Adds data-fx attributes to the block's outer element as it renders.
 *
 * @param string $content Rendered block HTML.
 * @param array  $block   Parsed block.
 * @return string
 */
function lumafx_render_block( $content, $block ) {
	if ( empty( $block['attrs']['lumafx'] ) || ! is_array( $block['attrs']['lumafx'] ) || '' === trim( (string) $content ) ) {
		return $content;
	}
	$fx      = $block['attrs']['lumafx'];
	$effects = array_values( array_diff( lumafx_valid_effects( isset( $fx['effects'] ) ? $fx['effects'] : array() ), lumafx_site_effects() ) );
	if ( ! $effects ) {
		return $content;
	}
	$raw = isset( $fx['options'] ) ? $fx['options'] : array();
	// A modal or a drawer wraps the block in a <dialog>: the dialog gets that effect's options
	// and the block keeps the rest.
	$dialogs = array_values( array_intersect( $effects, array( 'modal', 'drawer' ) ) );
	$modal   = $dialogs ? $dialogs[0] : '';
	$inner   = array_values( array_diff( $effects, array( 'modal', 'drawer' ) ) );
	$options = lumafx_clean_options( $inner, $raw );

	$p = new WP_HTML_Tag_Processor( $content );
	if ( ! $p->next_tag() ) {
		return $content;
	}
	$id = $p->get_attribute( 'id' );
	if ( $inner ) {
		$existing = $p->get_attribute( 'data-fx' );
		$names    = is_string( $existing ) ? preg_split( '/\s+/', trim( $existing ) ) : array();
		$p->set_attribute( 'data-fx', implode( ' ', array_unique( array_filter( array_merge( $names, $inner ) ) ) ) );
		foreach ( $options as $key => $value ) {
			$p->set_attribute( 'data-fx-' . $key, false === $value ? 'false' : $value );
		}
	}
	if ( $modal && is_string( $id ) && '' !== $id ) {
		// The dialog takes over the anchor so links to #anchor open it.
		$p->remove_attribute( 'id' );
	}
	$html = $p->get_updated_html();

	if ( ! $modal ) {
		return $html;
	}
	return lumafx_wrap_modal( $html, is_string( $id ) ? $id : '', lumafx_clean_options( array( $modal ), $raw ), $modal );
}
add_filter( 'render_block', 'lumafx_render_block', 10, 2 );

/**
 * Wraps a block in a <dialog> for the modal or drawer effect. Any link to #anchor (a Button
 * block, a menu item) opens it; a close button is added for keyboard and touch users.
 *
 * @param string $html    Block HTML.
 * @param string $id      The block's HTML anchor.
 * @param array  $options Cleaned options.
 * @param string $kind    'modal' or 'drawer'.
 * @return string
 */
function lumafx_wrap_modal( $html, $id, $options, $kind = 'modal' ) {
	static $n = 0;
	++$n;
	$kind = 'drawer' === $kind ? 'drawer' : 'modal';
	if ( '' === $id ) {
		$id = 'lumafx-' . $kind . '-' . $n;
	}
	$attrs = ' id="' . esc_attr( $id ) . '" data-fx="' . $kind . '" class="lumafx-modal" aria-label="' . esc_attr__( 'Dialog', 'lumafx' ) . '"';
	foreach ( $options as $key => $value ) {
		if ( is_string( $value ) || is_numeric( $value ) ) {
			$attrs .= ' data-fx-' . esc_attr( $key ) . '="' . esc_attr( (string) $value ) . '"';
		}
	}
	$close = '<button type="button" class="lumafx-close" data-fx-close aria-label="' . esc_attr__( 'Close', 'lumafx' ) . '">&times;</button>';
	return '<dialog' . $attrs . '><div class="fx-md-panel">' . $close . $html . '</div></dialog>';
}

/** Small front-end styles for pieces the plugin adds itself. */
function lumafx_front_inline_css() {
	if ( ! wp_style_is( 'lumafx', 'enqueued' ) ) {
		return;
	}
	wp_add_inline_style(
		'lumafx',
		'.lumafx-modal .fx-md-panel{color:#f2f1ee}.lumafx-close{position:absolute;top:12px;right:12px;width:34px;height:34px;border:0;border-radius:50%;background:rgb(255 255 255 / .1);color:inherit;font-size:20px;line-height:1;cursor:pointer;z-index:2}.lumafx-close:hover{background:rgb(255 255 255 / .18)}'
	);
}
add_action( 'wp_enqueue_scripts', 'lumafx_front_inline_css', 20 );

/** Block editor: the Effects panel. Plain script, no build step. */
function lumafx_editor_assets() {
	$deps = array( 'wp-hooks', 'wp-compose', 'wp-element', 'wp-components', 'wp-block-editor', 'wp-i18n', 'wp-blocks' );
	wp_enqueue_script( 'lumafx-editor', LUMAFX_URL . 'assets/editor.js', $deps, LUMAFX_VERSION, true );
	wp_enqueue_style( 'lumafx-editor', LUMAFX_URL . 'assets/editor.css', array(), LUMAFX_VERSION );

	$effects = array();
	foreach ( lumafx_effects() as $name => $m ) {
		if ( in_array( $name, lumafx_site_effects(), true ) ) {
			continue;
		}
		$opts = array();
		foreach ( (array) $m['options'] as $key => $o ) {
			$opts[ $key ] = array(
				'type'    => isset( $o['type'] ) ? $o['type'] : 'string',
				'default' => isset( $o['default'] ) ? $o['default'] : '',
				'values'  => isset( $o['values'] ) ? $o['values'] : null,
				'desc'    => isset( $o['desc'] ) ? $o['desc'] : '',
			);
		}
		$effects[ $name ] = array(
			'title'   => isset( $m['title'] ) ? $m['title'] : $name,
			'kind'    => isset( $m['kind'] ) ? $m['kind'] : 'js',
			'desc'    => isset( $m['desc'] ) ? $m['desc'] : '',
			'options' => $opts,
		);
	}
	wp_add_inline_script( 'lumafx-editor', 'window.lumafxEditor = ' . wp_json_encode( array( 'effects' => $effects ) ) . ';', 'before' );
	if ( function_exists( 'wp_set_script_translations' ) ) {
		wp_set_script_translations( 'lumafx-editor', 'lumafx' );
	}
}
add_action( 'enqueue_block_editor_assets', 'lumafx_editor_assets' );

/** The canvas badge must load inside the (iframed) editor canvas, never on the front end. */
function lumafx_canvas_assets() {
	if ( is_admin() ) {
		wp_enqueue_style( 'lumafx-canvas', LUMAFX_URL . 'assets/canvas.css', array(), LUMAFX_VERSION );
	}
}
add_action( 'enqueue_block_assets', 'lumafx_canvas_assets' );
