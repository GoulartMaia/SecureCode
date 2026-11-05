#!/bin/sh
# Builds the hosted milestone demo: the participant site only, without the server folder or team notes,
# and with the lesson server address removed, so the demo sends no lesson logs or chat messages anywhere.
set -e
cd "$(dirname "$0")/.."
OUT=${1:-../demo-dist}
rm -rf "$OUT" && mkdir -p "$OUT"
cp index.html "$OUT/" && cp -R js "$OUT/js"
sed -i.bak "s|^const API_URL=.*|const API_URL=''; /* milestone demo build: lesson server disconnected */|" "$OUT/js/config.js" && rm "$OUT/js/config.js.bak"
grep -n "API_URL=" "$OUT/js/config.js"
