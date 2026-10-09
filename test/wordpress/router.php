<?php
// Router for PHP's built-in server: real files are served as is, everything else goes to WordPress.
$root = getenv( 'WP_DIR' ) ?: __DIR__ . '/.wp';
$path = urldecode( parse_url( $_SERVER['REQUEST_URI'], PHP_URL_PATH ) );
$file = $root . $path;
if ( $path !== '/' && is_file( $file ) ) {
	if ( substr( $file, -4 ) === '.php' ) {
		$_SERVER['SCRIPT_NAME'] = $path;
		$_SERVER['SCRIPT_FILENAME'] = $file;
		chdir( dirname( $file ) );
		require $file;
		return true;
	}
	return false;
}
if ( is_dir( $file ) && is_file( rtrim( $file, '/' ) . '/index.php' ) ) {
	$_SERVER['SCRIPT_NAME'] = rtrim( $path, '/' ) . '/index.php';
	$_SERVER['SCRIPT_FILENAME'] = rtrim( $file, '/' ) . '/index.php';
	chdir( rtrim( $file, '/' ) );
	require rtrim( $file, '/' ) . '/index.php';
	return true;
}
$_SERVER['SCRIPT_NAME'] = '/index.php';
$_SERVER['SCRIPT_FILENAME'] = $root . '/index.php';
chdir( $root );
require $root . '/index.php';
