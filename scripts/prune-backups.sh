#!/usr/bin/env bash
set -euo pipefail

# Keeps the most recent N weekly backup folders under backups/, deletes the rest.
KEEP=${1:-12}   # default: keep ~3 months of weekly snapshots

if [ ! -d backups ]; then
  echo "No backups/ directory yet -- nothing to prune."
  exit 0
fi

mapfile -t dirs < <(ls -1 backups | sort)
count=${#dirs[@]}

if [ "$count" -le "$KEEP" ]; then
  echo "Have ${count} backup(s), keeping up to ${KEEP} -- nothing to prune."
  exit 0
fi

to_remove=$(( count - KEEP ))
echo "Have ${count} backups, keeping ${KEEP}, removing oldest ${to_remove}."

for ((i=0; i<to_remove; i++)); do
  echo "  removing backups/${dirs[$i]}"
  rm -rf "backups/${dirs[$i]}"
done
