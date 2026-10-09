<?php
// Direct checks of the plugin's render filter and sanitisers inside a real WordPress.
$_SERVER['HTTP_HOST'] = '127.0.0.1:8899';
$_SERVER['REQUEST_URI'] = '/';
require ( getenv( 'WP_DIR' ) ?: __DIR__ . '/.wp' ) . '/wp-load.php';
$fails = 0; $n = 0;
function ok( $name, $cond, $detail = '' ) { global $fails, $n; $n++; if ( ! $cond ) $fails++; echo ( $cond ? '  ✓ ' : '  ✗ ' ) . $name . ( $cond || ! $detail ? '' : "  [$detail]" ) . "\n"; }
$r = function ( $html, $effects, $options = array() ) { return lumafx_render_block( $html, array( 'blockName' => 'core/paragraph', 'attrs' => array( 'lumafx' => array( 'effects' => $effects, 'options' => $options ) ) ) ); };

$o = $r( '<p>Hi</p>', array( 'nonexistent', 'reveal' ), array( 'from' => '"><script>alert(1)</script>', 'duration' => 'expression(alert(1))', 'distance' => '40' ) );
ok( 'unknown effects dropped, valid ones kept', false !== strpos( $o, 'data-fx="reveal"' ) && false === strpos( $o, 'nonexistent' ), $o );
ok( 'enum and numeric options are validated', false === strpos( $o, 'data-fx-from' ) && false === strpos( $o, 'data-fx-duration' ) && false !== strpos( $o, 'data-fx-distance="40"' ), $o );
ok( 'no markup injection', false === strpos( $o, '<script' ), $o );

$o = $r( '<p>Hi</p>', array( 'chat', 'reveal' ) );
ok( 'site-wide effects are not applied per block', false !== strpos( $o, 'data-fx="reveal"' ) && false === strpos( $o, 'chat' ), $o );

$o = $r( '<div data-fx="tilt" class="x">Hi</div>', array( 'glass' ) );
ok( 'merges with an existing data-fx', false !== strpos( $o, 'data-fx="tilt glass"' ), $o );

$o = $r( '<div>Hi</div>', array( 'border-beam' ), array( 'glow' => true, 'color' => 'red;}body{display:none', 'mode' => 'full' ) );
ok( 'booleans become bare attributes, CSS breakouts are stripped', false !== strpos( $o, 'data-fx-glow' ) && false === strpos( $o, '}' ) && false === strpos( $o, ';' ) && false !== strpos( $o, 'data-fx-mode="full"' ), $o );

$o = $r( '<p>Hi</p>', array( 'typewriter' ), array( 'loop' => false ) );
ok( 'false booleans are written as "false"', false !== strpos( $o, 'data-fx-loop="false"' ), $o );

$o = $r( '<div id="join" class="wp-block-group"><p>Hi</p></div>', array( 'modal', 'reveal' ), array( 'style' => 'glass', 'distance' => '20' ) );
ok( 'modal wraps the block in a dialog that takes over the anchor', 0 === strpos( $o, '<dialog id="join" data-fx="modal"' ) && false !== strpos( $o, 'data-fx-style="glass"' ) && 1 === substr_count( $o, 'id="join"' ), $o );
ok( 'modal adds a close button and keeps other effects on the block', false !== strpos( $o, 'data-fx-close' ) && false !== strpos( $o, 'data-fx="reveal"' ) && false !== strpos( $o, 'data-fx-distance="20"' ), $o );
$o = $r( '<div id="cart" class="wp-block-group"><p>Cart</p></div>', array( 'drawer', 'stagger' ), array( 'side' => 'left', 'style' => 'push', 'size' => '420', 'stagger' => '90' ) );
ok( 'drawer wraps the block in a dialog with its side, style and size', 0 === strpos( $o, '<dialog id="cart" data-fx="drawer"' ) && false !== strpos( $o, 'data-fx-side="left"' ) && false !== strpos( $o, 'data-fx-style="push"' ) && false !== strpos( $o, 'data-fx-size="420' ) && false !== strpos( $o, 'data-fx="stagger"' ) && false === strpos( $o, '<div id="cart"' ), $o );

$o = $r( '', array( 'reveal' ) );
ok( 'empty blocks are left alone', '' === $o );

$o = lumafx_render_block( '<p>Hi</p>', array( 'blockName' => 'core/paragraph', 'attrs' => array() ) );
ok( 'blocks without effects are untouched', '<p>Hi</p>' === $o, $o );

$s = lumafx_sanitize_settings( array( 'pt_style' => 'evil', 'pt_color' => 'javascript:1', 'chat_whatsapp' => '+355 69-123 4567', 'header_selector' => 'header{}<script>', 'chat_greeting' => '<b>Hi</b>' ) );
ok( 'settings: enums, colors, phone and selectors are sanitised', 'off' === $s['pt_style'] && '#0b0c12' === $s['pt_color'] && '355691234567' === $s['chat_whatsapp'] && 'header' === $s['header_selector'] && 'Hi' === $s['chat_greeting'], wp_json_encode( $s ) );

$types = WP_Block_Type_Registry::get_instance()->get_all_registered();
$missing = array();
foreach ( $types as $name => $t ) { if ( empty( $t->attributes['lumafx'] ) ) $missing[] = $name; }
ok( 'every registered block type accepts the lumafx attribute (' . count( $types ) . ' types)', ! $missing, implode( ',', array_slice( $missing, 0, 5 ) ) );

echo "\n" . ( $n - $fails ) . "/$n WordPress unit checks passed\n";
exit( $fails ? 1 : 0 );
