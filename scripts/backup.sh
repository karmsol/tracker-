#!/bin/sh
# Daily logical backup. Keep two weeks of custom-format dumps.
set -eu
: "${DATABASE_URL:?Set DATABASE_URL}"
mkdir -p backups
stamp=$(date -u +%Y%m%dT%H%M%SZ)
file="backups/karmkaro-${stamp}.dump"
pg_dump "$DATABASE_URL" --no-owner --format=custom --file="$file"
find backups -name 'karmkaro-*.dump' -mtime +14 -delete
echo "Wrote $file"
