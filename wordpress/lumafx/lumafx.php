<?php
/**
 * Plugin Name:       lumafx
 * Description:       Premium web effects for any block: glass, reveals, border beams, liquid modals and drawers, cards, smart forms, a 3D loader, video that scrubs with the scroll, page transitions, a chat widget and more. Plus intelligent UI: match cards, lineups, standings, tickets and more from JSON with [lumafx_ui]. Free and open source.
 * Version:           0.4.0
 * Requires at least: 6.3
 * Requires PHP:      7.4
 * Author:            Arnold Kajolli
 * License:           MIT
 * License URI:       https://opensource.org/licenses/MIT
 * Text Domain:       lumafx
 *
 * @package lumafx
 */

defined( 'ABSPATH' ) || exit;

define( 'LUMAFX_VERSION', '0.4.0' );
define( 'LUMAFX_FILE', __FILE__ );
define( 'LUMAFX_DIR', plugin_dir_path( __FILE__ ) );
define( 'LUMAFX_URL', plugin_dir_url( __FILE__ ) );

require_once LUMAFX_DIR . 'includes/effects.php';
require_once LUMAFX_DIR . 'includes/blocks.php';
require_once LUMAFX_DIR . 'includes/site.php';
require_once LUMAFX_DIR . 'includes/settings.php';
require_once LUMAFX_DIR . 'includes/ui.php';

/**
 * Front end: the stylesheet and the runtime load in <head> so hidden starting states
 * never flash. Both are small, cached, and have no dependencies.
 */
function lumafx_enqueue_front() {
	/**
	 * Filters whether lumafx loads on the current request.
	 *
	 * @param bool $load Default true.
	 */
	if ( ! apply_filters( 'lumafx_enqueue', true ) ) {
		return;
	}
	wp_enqueue_style( 'lumafx', LUMAFX_URL . 'assets/lumafx.css', array(), LUMAFX_VERSION );
	wp_enqueue_script( 'lumafx', LUMAFX_URL . 'assets/lumafx.global.js', array(), LUMAFX_VERSION, false );
}
add_action( 'wp_enqueue_scripts', 'lumafx_enqueue_front' );

/** Settings link on the Plugins screen. */
function lumafx_action_links( $links ) {
	$url = admin_url( 'options-general.php?page=lumafx' );
	array_unshift( $links, '<a href="' . esc_url( $url ) . '">' . esc_html__( 'Settings', 'lumafx' ) . '</a>' );
	return $links;
}
add_filter( 'plugin_action_links_' . plugin_basename( __FILE__ ), 'lumafx_action_links' );
