<?php
/**
 * Settings → lumafx: site-wide pieces (page transitions, preloader, scrollbar, chat, header).
 *
 * @package lumafx
 */

defined( 'ABSPATH' ) || exit;

/**
 * Default settings.
 *
 * @return array
 */
function lumafx_defaults() {
	return array(
		'pt_style'        => 'off',
		'pt_color'        => '#0b0c12',
		'pt_accent'       => '#ffb547',
		'pt_label'        => '',
		'pl_style'        => 'off',
		'pl_text'         => '',
		'pl_color'        => '#0b0c12',
		'sb_on'           => false,
		'sb_color'        => '#ffb547',
		'sp_on'           => false,
		'sp_color'        => '#ffb547',
		'chat_on'         => false,
		'chat_title'      => '',
		'chat_subtitle'   => '',
		'chat_greeting'   => '',
		'chat_quick'      => '',
		'chat_color'      => '#ffb547',
		'chat_position'   => 'right',
		'chat_whatsapp'   => '',
		'chat_reply'      => '',
		'header_selector' => '',
		'header_hide'     => true,
		'menu_selector'   => '',
	);
}

/**
 * Current settings merged over the defaults.
 *
 * @return array
 */
function lumafx_settings() {
	$saved = get_option( 'lumafx_settings', array() );
	return array_merge( lumafx_defaults(), is_array( $saved ) ? $saved : array() );
}

/**
 * Sanitises the settings form.
 *
 * @param mixed $in Submitted values.
 * @return array
 */
function lumafx_sanitize_settings( $in ) {
	$in  = is_array( $in ) ? $in : array();
	$d   = lumafx_defaults();
	$out = array();
	$pick = function ( $key, $allowed ) use ( $in, $d ) {
		$v = isset( $in[ $key ] ) ? sanitize_key( $in[ $key ] ) : $d[ $key ];
		return in_array( $v, $allowed, true ) ? $v : $d[ $key ];
	};
	$hex = function ( $key ) use ( $in, $d ) {
		$v = isset( $in[ $key ] ) ? sanitize_hex_color( $in[ $key ] ) : '';
		return $v ? $v : $d[ $key ];
	};
	$text = function ( $key, $max = 200 ) use ( $in ) {
		return isset( $in[ $key ] ) ? substr( sanitize_text_field( $in[ $key ] ), 0, $max ) : '';
	};
	$selector = function ( $key ) use ( $in ) {
		$v = isset( $in[ $key ] ) ? wp_strip_all_tags( (string) $in[ $key ] ) : '';
		return substr( trim( str_replace( array( '{', '}', ';', '<', '>', '"', '`' ), '', $v ) ), 0, 300 );
	};

	$out['pt_style']        = $pick( 'pt_style', array( 'off', 'wave', 'curtain', 'circle', 'slide' ) );
	$out['pt_color']        = $hex( 'pt_color' );
	$out['pt_accent']       = $hex( 'pt_accent' );
	$out['pt_label']        = $text( 'pt_label', 60 );
	$out['pl_style']        = $pick( 'pl_style', array( 'off', 'slide', 'wave', 'fade' ) );
	$out['pl_text']         = $text( 'pl_text', 60 );
	$out['pl_color']        = $hex( 'pl_color' );
	$out['sb_on']           = ! empty( $in['sb_on'] );
	$out['sb_color']        = $hex( 'sb_color' );
	$out['sp_on']           = ! empty( $in['sp_on'] );
	$out['sp_color']        = $hex( 'sp_color' );
	$out['chat_on']         = ! empty( $in['chat_on'] );
	$out['chat_title']      = $text( 'chat_title', 60 );
	$out['chat_subtitle']   = $text( 'chat_subtitle', 80 );
	$out['chat_greeting']   = $text( 'chat_greeting', 300 );
	$out['chat_quick']      = $text( 'chat_quick', 300 );
	$out['chat_color']      = $hex( 'chat_color' );
	$out['chat_position']   = $pick( 'chat_position', array( 'right', 'left' ) );
	$out['chat_whatsapp']   = isset( $in['chat_whatsapp'] ) ? substr( preg_replace( '/\D+/', '', (string) $in['chat_whatsapp'] ), 0, 20 ) : '';
	$out['chat_reply']      = $text( 'chat_reply', 300 );
	$out['header_selector'] = $selector( 'header_selector' );
	$out['header_hide']     = ! empty( $in['header_hide'] );
	$out['menu_selector']   = $selector( 'menu_selector' );
	return $out;
}

function lumafx_register_settings() {
	register_setting(
		'lumafx',
		'lumafx_settings',
		array(
			'type'              => 'array',
			'sanitize_callback' => 'lumafx_sanitize_settings',
			'default'           => lumafx_defaults(),
		)
	);
}
add_action( 'admin_init', 'lumafx_register_settings' );

function lumafx_settings_menu() {
	add_options_page( 'lumafx', 'lumafx', 'manage_options', 'lumafx', 'lumafx_settings_page' );
}
add_action( 'admin_menu', 'lumafx_settings_menu' );

/**
 * One form row.
 *
 * @param string $label Row label.
 * @param string $html  Field HTML (already escaped).
 * @param string $help  Help text.
 */
function lumafx_row( $label, $html, $help = '' ) {
	echo '<tr><th scope="row">' . esc_html( $label ) . '</th><td>' . $html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built from escaped parts below.
	if ( $help ) {
		echo '<p class="description">' . esc_html( $help ) . '</p>';
	}
	echo '</td></tr>';
}

function lumafx_settings_page() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}
	$s    = lumafx_settings();
	$name = function ( $key ) {
		return 'lumafx_settings[' . $key . ']';
	};
	$select = function ( $key, $choices ) use ( $s, $name ) {
		$h = '<select name="' . esc_attr( $name( $key ) ) . '" id="lumafx-' . esc_attr( $key ) . '">';
		foreach ( $choices as $value => $label ) {
			$h .= '<option value="' . esc_attr( $value ) . '"' . selected( $s[ $key ], $value, false ) . '>' . esc_html( $label ) . '</option>';
		}
		return $h . '</select>';
	};
	$color = function ( $key ) use ( $s, $name ) {
		return '<input type="color" name="' . esc_attr( $name( $key ) ) . '" id="lumafx-' . esc_attr( $key ) . '" value="' . esc_attr( $s[ $key ] ) . '">';
	};
	$text = function ( $key, $placeholder = '', $class = 'regular-text' ) use ( $s, $name ) {
		return '<input type="text" class="' . esc_attr( $class ) . '" name="' . esc_attr( $name( $key ) ) . '" id="lumafx-' . esc_attr( $key ) . '" value="' . esc_attr( $s[ $key ] ) . '" placeholder="' . esc_attr( $placeholder ) . '">';
	};
	$check = function ( $key, $label ) use ( $s, $name ) {
		return '<label><input type="checkbox" name="' . esc_attr( $name( $key ) ) . '" id="lumafx-' . esc_attr( $key ) . '" value="1"' . checked( ! empty( $s[ $key ] ), true, false ) . '> ' . esc_html( $label ) . '</label>';
	};
	$off = __( 'Off', 'lumafx' );
	?>
	<div class="wrap lumafx-settings">
		<h1>lumafx</h1>
		<p><?php esc_html_e( 'Effects for single blocks live in the block editor: select a block and open the Effects panel in the sidebar. The pieces below run across the whole site.', 'lumafx' ); ?></p>
		<form method="post" action="options.php">
			<?php settings_fields( 'lumafx' ); ?>

			<h2><?php esc_html_e( 'Page transitions', 'lumafx' ); ?></h2>
			<table class="form-table" role="presentation">
				<?php
				lumafx_row( __( 'Style', 'lumafx' ), $select( 'pt_style', array( 'off' => $off, 'wave' => __( 'Wave', 'lumafx' ), 'curtain' => __( 'Curtain', 'lumafx' ), 'circle' => __( 'Circle from the click', 'lumafx' ), 'slide' => __( 'Slide', 'lumafx' ) ) ), __( 'Covers the page when a visitor clicks a link and reveals the next page as it arrives.', 'lumafx' ) );
				lumafx_row( __( 'Colors', 'lumafx' ), $color( 'pt_color' ) . ' ' . $color( 'pt_accent' ) );
				lumafx_row( __( 'Label', 'lumafx' ), $text( 'pt_label', get_bloginfo( 'name' ) ), __( 'Optional text shown on the cover, such as your brand.', 'lumafx' ) );
				?>
			</table>

			<h2><?php esc_html_e( 'Preloader', 'lumafx' ); ?></h2>
			<table class="form-table" role="presentation">
				<?php
				lumafx_row( __( 'Exit', 'lumafx' ), $select( 'pl_style', array( 'off' => $off, 'slide' => __( 'Slide up', 'lumafx' ), 'wave' => __( 'Wave', 'lumafx' ), 'fade' => __( 'Fade', 'lumafx' ) ) ), __( 'A 000 → 100 counter that follows real loading, then lifts away. Entrance animations wait for it.', 'lumafx' ) );
				lumafx_row( __( 'Text', 'lumafx' ), $text( 'pl_text', get_bloginfo( 'name' ) ) );
				lumafx_row( __( 'Background', 'lumafx' ), $color( 'pl_color' ) );
				?>
			</table>

			<h2><?php esc_html_e( 'Scrollbar and reading progress', 'lumafx' ); ?></h2>
			<table class="form-table" role="presentation">
				<?php
				lumafx_row( __( 'Animated scrollbar', 'lumafx' ), $check( 'sb_on', __( 'Springy scrollbar with section marks and a hover label', 'lumafx' ) ) . ' ' . $color( 'sb_color' ), __( 'Headings (h2) become section marks. Touch screens keep the native scrollbar.', 'lumafx' ) );
				lumafx_row( __( 'Reading progress', 'lumafx' ), $check( 'sp_on', __( 'Thin bar along the top of the page', 'lumafx' ) ) . ' ' . $color( 'sp_color' ) );
				?>
			</table>

			<h2><?php esc_html_e( 'Chat widget', 'lumafx' ); ?></h2>
			<table class="form-table" role="presentation">
				<?php
				lumafx_row( __( 'Show', 'lumafx' ), $check( 'chat_on', __( 'Animated chat button in the corner', 'lumafx' ) ) . ' ' . $select( 'chat_position', array( 'right' => __( 'Right', 'lumafx' ), 'left' => __( 'Left', 'lumafx' ) ) ) . ' ' . $color( 'chat_color' ) );
				lumafx_row( __( 'Title', 'lumafx' ), $text( 'chat_title', get_bloginfo( 'name' ) ) );
				lumafx_row( __( 'Subtitle', 'lumafx' ), $text( 'chat_subtitle', __( 'We usually reply within an hour', 'lumafx' ) ) );
				lumafx_row( __( 'Greeting', 'lumafx' ), $text( 'chat_greeting', __( 'Hi! How can we help?', 'lumafx' ), 'large-text' ) );
				lumafx_row( __( 'Quick replies', 'lumafx' ), $text( 'chat_quick', __( 'Opening hours, Prices, Book a visit', 'lumafx' ), 'large-text' ), __( 'Comma-separated.', 'lumafx' ) );
				lumafx_row( __( 'WhatsApp number', 'lumafx' ), $text( 'chat_whatsapp', '355691234567' ), __( 'Optional. Messages open WhatsApp with the text filled in, so you answer from your phone. Country code, digits only.', 'lumafx' ) );
				lumafx_row( __( 'Automatic reply', 'lumafx' ), $text( 'chat_reply', __( 'Thanks! We will get back to you shortly.', 'lumafx' ), 'large-text' ), __( 'Developers can answer instead by listening for the fx:chat-send event.', 'lumafx' ) );
				?>
			</table>

			<h2><?php esc_html_e( 'Theme header and menus', 'lumafx' ); ?></h2>
			<table class="form-table" role="presentation">
				<?php
				lumafx_row( __( 'Smart header', 'lumafx' ), $text( 'header_selector', 'header.wp-block-template-part, #masthead, .site-header' ) . '<br>' . $check( 'header_hide', __( 'Hide while scrolling down', 'lumafx' ) ), __( 'CSS selector of your theme header. It turns to glass when you scroll and slides back when you scroll up. In a block theme you can also pick smart-header in the Effects panel of the header.', 'lumafx' ) );
				lumafx_row( __( 'Menu hover icons', 'lumafx' ), $text( 'menu_selector', '.wp-block-navigation, .main-navigation' ), __( 'CSS selector of your menus. Links slide in an arrow on hover. Add a class like fx-hover-icon to single menu items instead if you prefer.', 'lumafx' ) );
				?>
			</table>
			<?php submit_button(); ?>
		</form>

		<h2><?php esc_html_e( 'Page builders and themes', 'lumafx' ); ?></h2>
		<p><?php esc_html_e( 'In Elementor, Bricks, Divi or any theme, add an effect as a CSS class: fx-reveal, fx-glass, fx-border-beam, fx-tilt, fx-marquee … Options go in data attributes, such as data-fx-duration="4s".', 'lumafx' ); ?></p>
		<p><?php esc_html_e( 'Liquid modal: give a Group block an HTML anchor (Advanced → HTML anchor), add the modal effect, then link any button to #your-anchor.', 'lumafx' ); ?></p>
	</div>
	<?php
}
