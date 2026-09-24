#!/usr/bin/env bash
set -euo pipefail

# Weekly Supabase backup — pulls every fully public-read table via the REST API
# using the same anon key already embedded in the site's own pages (not a secret).
#
# NOT included (require a more privileged key, not just the anon key):
#   tracker_profiles, tracker_admin_allowlist, incursion_profiles, incursion_system_claims
# These hold Discord IDs / admin-approval state, not game data, and are lower-stakes
# to lose since they're easy to reconstruct by re-approving members.

SUPABASE_URL="https://mmzizgsanwqjpiumpqay.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1teml6Z3NhbndxanBpdW1wcWF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwMjk5MzksImV4cCI6MjEwMTYwNTkzOX0.KqvY2Ib33J8h8ztEi8qxtfutSdVIPAaJRtj7cSUSKFM"

TABLES=(
  roster
  events
  scores
  arcs
  f2p_tasks
  arc_promo_codes
  arc_trivia
  crews
  fc_commanders
  fc_ratings
  fc_skills
)

DATE_STAMP=$(date -u +%Y-%m-%d)
OUT_DIR="backups/${DATE_STAMP}"
mkdir -p "$OUT_DIR"

echo "Backing up to ${OUT_DIR}/ ..."

# Supabase returns at most 1000 rows per request, so each table is fetched in pages of 1000
# using Range headers and merged. (A single request silently truncated `scores` at 1000 rows.)
PAGE=1000

fetch_table() {
  local table="$1" out="$2" offset=0 order="" tmp http_code n
  if [ "$table" = "scores" ]; then order="&order=event_id.asc,player_id.asc"; fi  # stable order across pages
  echo "[]" > "$out"
  while true; do
    tmp=$(mktemp)
    http_code=$(curl -s -o "$tmp" -w "%{http_code}" \
      "${SUPABASE_URL}/rest/v1/${table}?select=*${order}" \
      -H "apikey: ${SUPABASE_ANON_KEY}" \
      -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
      -H "Range-Unit: items" \
      -H "Range: ${offset}-$((offset + PAGE - 1))")
    if [ "$http_code" = "416" ]; then rm -f "$tmp"; break; fi   # past the last row
    if [ "$http_code" != "200" ] && [ "$http_code" != "206" ]; then
      echo "    !! HTTP ${http_code} fetching ${table} -- see ${out} for the error body"
      cp "$tmp" "$out"; rm -f "$tmp"; exit 1
    fi
    n=$(python3 scripts/merge_page.py "$out" "$tmp")
    rm -f "$tmp"
    if [ "$n" -lt "$PAGE" ]; then break; fi
    offset=$((offset + PAGE))
  done
}

for table in "${TABLES[@]}"; do
  echo "  - ${table}"
  fetch_table "$table" "${OUT_DIR}/${table}.json"
  # sanity check: valid JSON array
  python3 -c "import json,sys; d=json.load(open('${OUT_DIR}/${table}.json')); assert isinstance(d, list); print(f'    {len(d)} rows')"
done

# manifest for quick reference
python3 - "$OUT_DIR" "$DATE_STAMP" <<'PYEOF'
import json, sys, os
out_dir, date_stamp = sys.argv[1], sys.argv[2]
manifest = {"backup_date": date_stamp, "tables": {}}
for fname in sorted(os.listdir(out_dir)):
    if fname.endswith('.json') and fname != 'manifest.json':
        with open(os.path.join(out_dir, fname)) as f:
            manifest["tables"][fname[:-5]] = len(json.load(f))
with open(os.path.join(out_dir, "manifest.json"), "w") as f:
    json.dump(manifest, f, indent=2)
print(f"Manifest written: {manifest}")
PYEOF

echo "Backup complete."
