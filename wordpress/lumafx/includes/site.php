<?php
/**
 * Site-wide pieces printed into every front-end page, driven by Settings → lumafx.
 *
 * @package lumafx
 */

defined( 'ABSPATH' ) || exit;

/** Whether the site-wide pieces should print on this request. */
function lumafx_site_active() {
	return ! is_admin() && ! is_feed() && ! is_embed() && ! wp_doing_ajax() && ! ( defined( 'REST_REQUEST' ) && REST_REQUEST ) && apply_filters( 'lumafx_enqueue', true );
}

/**
 * Builds an element with data attributes; every value is escaped.
 *
 * @param string $tag   Tag name.
 * @param array  $attrs Attribute => value (true for boolean attributes, null to skip).
 * @param string $inner Inner HTML (already escaped).
 * @return string
 */
function lumafx_el( $tag, $attrs, $inner = '' ) {
	$h = '<' . $tag;
	foreach ( $attrs as $k => $v ) {
		if ( null === $v || '' === $v || false === $v ) {
			continue;
		}
		$h .= true === $v ? ' ' . esc_attr( $k ) : ' ' . esc_attr( $k ) . '="' . esc_attr( $v ) . '"';
	}
	return $h . '>' . $inner . '</' . $tag . '>';
}

/** The preloader belongs at the very top of <body>. */
function lumafx_print_preloader() {
	static $done = false;
	$s = lumafx_settings();
	if ( $done || 'off' === $s['pl_style'] || ! lumafx_site_active() ) {
		return;
	}
	$done  = true;
	$text  = '' !== $s['pl_text'] ? $s['pl_text'] : get_bloginfo( 'name' );
	$inner = '<span class="lumafx-pl-brand">' . esc_html( $text ) . '</span><span data-fx-count>000</span>';
	echo lumafx_el( // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped in lumafx_el.
		'div',
		array(
			'class'         => 'lumafx-preloader',
			'data-fx'       => 'preloader',
			'data-fx-style' => $s['pl_style'],
			'data-fx-color' => $s['pl_color'],
		),
		$inner
	);
}
add_action( 'wp_body_open', 'lumafx_print_preloader', 1 );

function lumafx_print_footer() {
	if ( ! lumafx_site_active() ) {
		return;
	}
	$s = lumafx_settings();
	// Themes without wp_body_open still get the preloader (it is a fixed overlay).
	lumafx_print_preloader();

	$out = '';
	if ( 'off' !== $s['pt_style'] ) {
		$out .= lumafx_el(
			'div',
			array(
				'data-fx'         => 'page-transition',
				'data-fx-style'   => $s['pt_style'],
				'data-fx-color'   => $s['pt_color'],
				'data-fx-color-2' => $s['pt_accent'],
				'data-fx-label'   => $s['pt_label'],
				// Leave the dashboard, login, files and opt-outs alone.
				'data-fx-links'   => 'a[href]:not([href*="/wp-admin"]):not([href*="wp-login.php"]):not([href$=".pdf"]):not([href$=".zip"]):not(.no-transition)',
			)
		);
	}
	if ( $s['sb_on'] ) {
		$out .= lumafx_el( 'div', array( 'data-fx' => 'scrollbar', 'data-fx-color' => $s['sb_color'] ) );
	}
	if ( $s['sp_on'] ) {
		$out .= lumafx_el( 'div', array( 'data-fx' => 'scroll-progress', 'data-fx-color' => $s['sp_color'] ) );
	}
	if ( $s['chat_on'] ) {
		$out .= lumafx_el(
			'div',
			array(
				'id'               => 'lumafx-chat',
				'data-fx'          => 'chat',
				'data-fx-title'    => '' !== $s['chat_title'] ? $s['chat_title'] : get_bloginfo( 'name' ),
				'data-fx-subtitle' => $s['chat_subtitle'],
				'data-fx-greeting' => $s['chat_greeting'],
				'data-fx-quick'    => $s['chat_quick'],
				'data-fx-color'    => $s['chat_color'],
				'data-fx-position' => $s['chat_position'],
				'data-wa'          => $s['chat_whatsapp'],
				'data-reply'       => $s['chat_reply'],
			)
		);
	}
	echo $out; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped in lumafx_el.

	$config = array(
		'header'     => $s['header_selector'],
		'headerHide' => (bool) $s['header_hide'],
		'menu'       => $s['menu_selector'],
		'opening'    => __( 'Opening WhatsApp so we can reply there…', 'lumafx' ),
	);
	$script = '(function(c){'
		. 'function add(sel,name,extra){if(!sel)return;try{document.querySelectorAll(sel).forEach(function(e){var n=(e.getAttribute("data-fx")||"").split(/\\s+/);if(n.indexOf(name)<0)n.push(name);e.setAttribute("data-fx",n.join(" ").trim());if(extra)extra(e);});}catch(x){}}'
		. 'add(c.header,"smart-header",function(e){if(!c.headerHide)e.setAttribute("data-fx-hide","false");});'
		. 'add(c.menu,"hover-icon");'
		. 'var chat=document.getElementById("lumafx-chat");'
		. 'if(chat){chat.addEventListener("fx:chat-send",function(ev){var api=chat.fxChat;if(!api)return;'
		. 'if(chat.dataset.wa){window.open("https://wa.me/"+chat.dataset.wa+"?text="+encodeURIComponent(ev.detail.text),"_blank","noopener");api.reply(c.opening,{typing:600});}'
		. 'else if(chat.dataset.reply){api.reply(chat.dataset.reply);}});}'
		. '})(' . wp_json_encode( $config ) . ');';
	wp_print_inline_script_tag( $script, array( 'id' => 'lumafx-site' ) );
}
add_action( 'wp_footer', 'lumafx_print_footer', 5 );

/** Preloader brand styling (kept tiny; the counter is styled by lumafx.css). */
function lumafx_site_inline_css() {
	if ( ! wp_style_is( 'lumafx', 'enqueued' ) ) {
		return;
	}
	wp_add_inline_style( 'lumafx', '.lumafx-pl-brand{font-size:clamp(1.4rem,4vw,2.4rem);font-weight:700;letter-spacing:-.02em}' );
}
add_action( 'wp_enqueue_scripts', 'lumafx_site_inline_css', 21 );
