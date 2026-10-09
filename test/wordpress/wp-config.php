<?php
define( 'DB_NAME', 'wp' );
define( 'DB_USER', 'wp' );
define( 'DB_PASSWORD', 'wp' );
define( 'DB_HOST', 'localhost' );
define( 'DB_CHARSET', 'utf8' );
define( 'DB_COLLATE', '' );
define( 'DB_DIR', __DIR__ . '/wp-content/database/' );
define( 'DB_FILE', 'wp.sqlite' );
define( 'AUTH_KEY', 'lumafx-test-1' ); define( 'SECURE_AUTH_KEY', 'lumafx-test-2' ); define( 'LOGGED_IN_KEY', 'lumafx-test-3' ); define( 'NONCE_KEY', 'lumafx-test-4' );
define( 'AUTH_SALT', 'lumafx-test-5' ); define( 'SECURE_AUTH_SALT', 'lumafx-test-6' ); define( 'LOGGED_IN_SALT', 'lumafx-test-7' ); define( 'NONCE_SALT', 'lumafx-test-8' );
$table_prefix = 'wp_';
define( 'WP_DEBUG', true );
define( 'WP_DEBUG_LOG', __DIR__ . '/wp-content/debug.log' );
define( 'WP_DEBUG_DISPLAY', false );
define( 'WP_HTTP_BLOCK_EXTERNAL', true );
define( 'AUTOMATIC_UPDATER_DISABLED', true );
define( 'DISABLE_WP_CRON', true );
if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', __DIR__ . '/' );
}
require_once ABSPATH . 'wp-settings.php';
