<?php
// Installs WordPress, activates lumafx and creates test content. Run with: php setup.php
define( 'WP_INSTALLING', true );
$_SERVER['HTTP_HOST']   = '127.0.0.1:8899';
$_SERVER['REQUEST_URI'] = '/';
$_SERVER['SERVER_NAME'] = '127.0.0.1';
require ( getenv( 'WP_DIR' ) ?: __DIR__ . '/.wp' ) . '/wp-load.php';
require_once ABSPATH . 'wp-admin/includes/upgrade.php';
require_once ABSPATH . 'wp-admin/includes/plugin.php';

if ( ! is_blog_installed() ) {
	$r = wp_install( 'lumafx test', 'admin', 'admin@example.com', true, '', 'password' );
	echo "installed user {$r['user_id']}\n";
}
update_option( 'siteurl', 'http://127.0.0.1:8899' );
update_option( 'home', 'http://127.0.0.1:8899' );
update_option( 'permalink_structure', '/%postname%/' );
update_option( 'blogname', 'Sphere Tirana' );
flush_rewrite_rules();
foreach ( array( 'sqlite-database-integration/load.php', 'lumafx/lumafx.php' ) as $p ) {
	$res = activate_plugin( $p );
	echo $p . ': ' . ( is_wp_error( $res ) ? $res->get_error_message() : 'active' ) . "\n";
}
update_user_meta( 1, 'wp_persisted_preferences', array( 'core/edit-post' => array( 'welcomeGuide' => false ), 'core' => array( 'welcomeGuide' => false ), '_modified' => gmdate( 'c' ) ) );

$u = 'http://127.0.0.1:8899/wp-content/uploads/lumafx/';
$fx = function ( $effects, $options = array(), $extra = array() ) {
	return wp_json_encode( array_merge( $extra, array( 'lumafx' => array( 'effects' => $effects, 'options' => (object) $options ) ) ) );
};
$content = '<!-- wp:heading ' . $fx( array( 'text-reveal' ), array( 'split' => 'chars', 'style' => 'flip' ) ) . ' -->
<h2 class="wp-block-heading">Tonight in Tirana</h2>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>Concerts, theatre and late-night sets across the city. Pick a plan.</p>
<!-- /wp:paragraph -->

<!-- wp:group ' . $fx( array( 'border-beam', 'reveal' ), array( 'duration' => '4s', 'color' => '#ffb547', 'glow' => true ), array( 'layout' => array( 'type' => 'constrained' ) ) ) . ' -->
<div class="wp-block-group"><!-- wp:paragraph -->
<p>Featured: Rooftop session at Blloku, 22:00.</p>
<!-- /wp:paragraph --></div>
<!-- /wp:group -->

<!-- wp:buttons -->
<div class="wp-block-buttons"><!-- wp:button -->
<div class="wp-block-button"><a class="wp-block-button__link wp-element-button" href="#join">Join the list</a></div>
<!-- /wp:button --></div>
<!-- /wp:buttons -->

<!-- wp:group ' . $fx( array( 'modal' ), array( 'style' => 'liquid' ), array( 'layout' => array( 'type' => 'constrained' ) ) ) . ' -->
<div id="join" class="wp-block-group"><!-- wp:heading {"level":3} -->
<h3 class="wp-block-heading">Get the weekly list</h3>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>One email every Thursday with the best events.</p>
<!-- /wp:paragraph --></div>
<!-- /wp:group -->

<!-- wp:gallery ' . $fx( array( 'lightbox' ), array(), array( 'linkTo' => 'media' ) ) . ' -->
<figure class="wp-block-gallery has-nested-images columns-default is-cropped"><!-- wp:image {"linkDestination":"media"} -->
<figure class="wp-block-image"><a href="' . $u . 'theth-wide.jpg"><img src="' . $u . 'theth.jpg" alt="Theth"/></a></figure>
<!-- /wp:image -->

<!-- wp:image {"linkDestination":"media"} -->
<figure class="wp-block-image"><a href="' . $u . 'ksamil-wide.jpg"><img src="' . $u . 'ksamil.jpg" alt="Ksamil"/></a></figure>
<!-- /wp:image -->

<!-- wp:image {"linkDestination":"media"} -->
<figure class="wp-block-image"><a href="' . $u . 'valbona.jpg"><img src="' . $u . 'valbona.jpg" alt="Valbona"/></a></figure>
<!-- /wp:image --></figure>
<!-- /wp:gallery -->

<!-- wp:paragraph ' . $fx( array( 'rotate-words' ), array( 'words' => 'jazz, theatre, techno', 'style' => 'slide' ) ) . ' -->
<p>concerts</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph ' . $fx( array( 'clock' ), array( 'tz' => 'Europe/Tirane' ) ) . ' -->
<p>--:--</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph ' . $fx( array( 'nonexistent-effect', 'reveal' ), array( 'from' => '"><script>alert(1)</script>', 'duration' => 'expression(alert(1))' ) ) . ' -->
<p>Sanitised options.</p>
<!-- /wp:paragraph -->

<!-- wp:heading -->
<h2 class="wp-block-heading">Venues</h2>
<!-- /wp:heading -->

<!-- wp:video ' . $fx( array( 'video-scrub' ), array( 'length' => '250vh' ) ) . ' -->
<figure class="wp-block-video"><video muted playsinline preload="auto" src="' . $u . 'flight.mp4"></video></figure>
<!-- /wp:video -->

<!-- wp:paragraph -->
<p><a href="/next-week/">See next week</a></p>
<!-- /wp:paragraph -->';

$existing = get_page_by_path( 'tonight', OBJECT, 'post' );
$id = wp_insert_post( array( 'ID' => $existing ? $existing->ID : 0, 'post_title' => 'Tonight', 'post_name' => 'tonight', 'post_status' => 'publish', 'post_content' => $content ), true );
echo 'post ' . ( is_wp_error( $id ) ? $id->get_error_message() : $id ) . "\n";
$existing2 = get_page_by_path( 'next-week', OBJECT, 'post' );
$id2 = wp_insert_post( array( 'ID' => $existing2 ? $existing2->ID : 0, 'post_title' => 'Next week', 'post_name' => 'next-week', 'post_status' => 'publish', 'post_content' => "<!-- wp:paragraph -->\n<p>Arrived with a page transition. <a href=\"/tonight/\">Back</a></p>\n<!-- /wp:paragraph -->" ), true );
echo 'post2 ' . $id2 . "\n";

update_option( 'lumafx_settings', array(
	'pt_style' => 'wave', 'pt_color' => '#0b0c12', 'pt_accent' => '#ffb547', 'pt_label' => 'Sphere',
	'pl_style' => 'slide', 'pl_text' => 'Sphere', 'pl_color' => '#0b0c12',
	'sb_on' => true, 'sb_color' => '#ffb547', 'sp_on' => true, 'sp_color' => '#ffb547',
	'chat_on' => true, 'chat_title' => 'Sphere', 'chat_subtitle' => 'Replies in minutes', 'chat_greeting' => 'Përshëndetje! Looking for something tonight?',
	'chat_quick' => 'Concerts, Theatre', 'chat_color' => '#ffb547', 'chat_position' => 'right', 'chat_whatsapp' => '', 'chat_reply' => 'Thanks! A human will reply shortly.',
	'header_selector' => 'header.wp-block-template-part', 'header_hide' => true, 'menu_selector' => '.wp-block-navigation',
) );
echo "settings saved\n";
