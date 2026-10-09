<?php
/**
 * Effect metadata (assets/effects.json, generated from the library) and sanitising helpers.
 *
 * @package lumafx
 */

defined( 'ABSPATH' ) || exit;

/**
 * All effects with their options, keyed by name.
 *
 * @return array<string, array>
 */
function lumafx_effects() {
	static $effects = null;
	if ( null === $effects ) {
		$effects = array();
		$file    = LUMAFX_DIR . 'assets/effects.json';
		if ( is_readable( $file ) ) {
			// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- local file.
			$data = json_decode( (string) file_get_contents( $file ), true );
			if ( is_array( $data ) && isset( $data['effects'] ) && is_array( $data['effects'] ) ) {
				$effects = $data['effects'];
			}
		}
	}
	return $effects;
}

/**
 * Effects handled site-wide from Settings → lumafx rather than per block.
 *
 * @return string[]
 */
function lumafx_site_effects() {
	return array( 'page-transition', 'preloader', 'scrollbar', 'scroll-progress', 'chat' );
}

/**
 * Keeps only known effect names, without duplicates.
 *
 * @param mixed $names Effect names.
 * @return string[]
 */
function lumafx_valid_effects( $names ) {
	if ( is_string( $names ) ) {
		$names = preg_split( '/[\s,]+/', $names );
	}
	if ( ! is_array( $names ) ) {
		return array();
	}
	$known = lumafx_effects();
	$out   = array();
	foreach ( $names as $name ) {
		$name = is_string( $name ) ? strtolower( trim( $name ) ) : '';
		if ( '' !== $name && isset( $known[ $name ] ) && ! in_array( $name, $out, true ) ) {
			$out[] = $name;
		}
	}
	return $out;
}

/**
 * Cleans one option value for an HTML attribute. Booleans stay booleans.
 *
 * @param mixed  $value Raw value.
 * @param array  $opt   Option metadata.
 * @return string|bool|null Null when the value should be dropped.
 */
function lumafx_clean_value( $value, $opt ) {
	$type = isset( $opt['type'] ) ? $opt['type'] : 'string';
	if ( 'boolean' === $type ) {
		if ( is_bool( $value ) ) {
			return $value;
		}
		$v = strtolower( trim( (string) $value ) );
		if ( '' === $v ) {
			return null;
		}
		return ! in_array( $v, array( 'false', '0', 'no', 'off' ), true );
	}
	if ( is_bool( $value ) || is_array( $value ) || is_object( $value ) ) {
		return null;
	}
	$v = trim( wp_strip_all_tags( (string) $value ) );
	if ( '' === $v ) {
		return null;
	}
	$v = substr( $v, 0, 600 );
	if ( 'enum' === $type ) {
		$values = isset( $opt['values'] ) && is_array( $opt['values'] ) ? $opt['values'] : array();
		return in_array( $v, $values, true ) ? $v : null;
	}
	if ( in_array( $type, array( 'time', 'length', 'percent', 'number' ), true ) ) {
		// Numbers with an optional CSS unit, or a CSS function like calc()/clamp().
		return preg_match( '/^(-?\d*\.?\d+[a-z%]*|(calc|clamp|min|max|var)\([^;{}<>]*\))$/i', $v ) ? $v : null;
	}
	// Colours and free text: no characters that could break out of CSS or markup.
	return str_replace( array( '<', '>', '{', '}', ';' ), '', $v );
}

/**
 * Keeps only options that belong to the chosen effects, cleaned.
 *
 * @param string[] $effects Effect names (already validated).
 * @param mixed    $options Raw options map.
 * @return array<string, string|bool>
 */
function lumafx_clean_options( $effects, $options ) {
	if ( ! is_array( $options ) ) {
		return array();
	}
	$known = lumafx_effects();
	$out   = array();
	foreach ( $effects as $name ) {
		$defs = isset( $known[ $name ]['options'] ) && is_array( $known[ $name ]['options'] ) ? $known[ $name ]['options'] : array();
		foreach ( $defs as $key => $opt ) {
			if ( isset( $out[ $key ] ) || ! array_key_exists( $key, $options ) ) {
				continue;
			}
			$clean = lumafx_clean_value( $options[ $key ], $opt );
			if ( null !== $clean ) {
				$out[ $key ] = $clean;
			}
		}
	}
	return $out;
}
