#!/usr/bin/env bash
# Tests the WordPress plugin in a real WordPress: block theme, SQLite database, PHP's built-in server.
# Needs: git, php (with pdo_sqlite), python3 + playwright. Usage: bash test/wordpress/run.sh
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
export WP_DIR="${WP_DIR:-$HERE/.wp}"
WP_VERSION="${WP_VERSION:-7.1.3}"
PORT=8899

if [ ! -f "$WP_DIR/wp-load.php" ]; then
  git clone -q --depth 1 --branch "$WP_VERSION" https://github.com/WordPress/WordPress "$WP_DIR"
  tmp="$(mktemp -d)"
  git clone -q --depth 1 https://github.com/WordPress/sqlite-database-integration "$tmp/sqlite"
  cp -rL "$tmp/sqlite/packages/plugin-sqlite-database-integration" "$WP_DIR/wp-content/plugins/sqlite-database-integration"
  rm -rf "$tmp"
  sed -e "s#{SQLITE_IMPLEMENTATION_FOLDER_PATH}#$WP_DIR/wp-content/plugins/sqlite-database-integration#; s#{SQLITE_PLUGIN}#sqlite-database-integration/load.php#g" \
    "$WP_DIR/wp-content/plugins/sqlite-database-integration/db.copy" > "$WP_DIR/wp-content/db.php"
  cp "$HERE/wp-config.php" "$WP_DIR/wp-config.php"
  mkdir -p "$WP_DIR/wp-content/database" "$WP_DIR/wp-content/uploads/lumafx"
fi
ln -sfn "$ROOT/wordpress/lumafx" "$WP_DIR/wp-content/plugins/lumafx"
cp "$ROOT"/demo/img/*.jpg "$ROOT"/demo/media/flight.* "$WP_DIR/wp-content/uploads/lumafx/"

php "$HERE/setup.php"
php -S 127.0.0.1:$PORT -t "$WP_DIR" "$HERE/router.php" > "$HERE/.server.log" 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null || true' EXIT
sleep 1

echo; echo "Plugin internals (PHP)"
php "$HERE/unit.php"
WP_URL="http://127.0.0.1:$PORT" python3 "$HERE/wp_browser.py" "$ROOT/test/shots"
