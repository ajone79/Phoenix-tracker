#!/usr/bin/env python3
"""
Phoenix EU168 roster sync.

Scrapes the alliance's stfc.pro page (which embeds the full member list,
including permanent player IDs, in a Next.js data blob) and reconciles it
against the Supabase `roster` table.

Matching logic:
  - roster.stfc_player_id is the permanent key. If a scraped player's ID
    matches a roster row, that row's name/level are updated to match
    the scrape (this is how renames get picked up automatically).
  - If a roster row has no stfc_player_id yet (first run, or a manually
    added player), we try a one-time fallback match by normalised name
    (stripping accents/special characters) so existing rows get linked up
    without needing a separate manual backfill step.
  - A scraped player matching no roster row (by ID or normalised name) is
    flagged in roster_sync_review as 'new_member' - never auto-inserted.
  - A roster row with a stfc_player_id that doesn't appear in this scrape
    is flagged as 'possibly_left' - never auto-deleted or auto-deactivated.
  - Any rename detected (matched by ID, but scraped name != stored name)
    is flagged as 'rename' for the audit trail, in addition to being applied.

Run with --dry-run to see exactly what would happen without writing
anything to Supabase.
"""

import argparse
import json
import os
import re
import sys
import unicodedata

import requests

ALLIANCE_URL = "https://stfc.pro/alliances/2469265874"
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

HEADERS_SUPABASE = {
    "apikey": SUPABASE_SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
    "Content-Type": "application/json",
}


def normalize_name(name: str) -> str:
    """Strip accents/diacritics/special marks and lowercase, for fuzzy
    one-time bootstrap matching only. Not used once stfc_player_id is set."""
    if not name:
        return ""
    decomposed = unicodedata.normalize("NFKD", name)
    stripped = "".join(ch for ch in decomposed if not unicodedata.combining(ch))
    # Drop anything that isn't a letter or digit (handles CJK-ish combining
    # marks like ᄼ, decorative dashes like ー, etc.)
    return re.sub(r"[^a-zA-Z0-9]", "", stripped).lower()


def fetch_alliance_members():
    """Fetch the alliance page and pull member data out of the embedded
    Next.js __NEXT_DATA__ JSON blob. Returns a list of dicts with at
    least: name, level, stfc_player_id."""
    resp = requests.get(
        ALLIANCE_URL,
        headers={"User-Agent": "Mozilla/5.0 (compatible; PhoenixRosterSync/1.0)"},
        timeout=30,
    )
    resp.raise_for_status()
    html = resp.text

    match = re.search(
        r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>',
        html,
        re.DOTALL,
    )
    if not match:
        raise RuntimeError(
            "Could not find __NEXT_DATA__ in the page. stfc.pro may have "
            "changed how it renders this page - the parsing logic here "
            "will need updating."
        )

    data = json.loads(match.group(1))
    members = _find_member_list(data)
    if not members:
        raise RuntimeError(
            "Found __NEXT_DATA__ but could not locate a member list inside "
            "it. Dumping top-level keys for debugging: "
            + str(list(data.get("props", {}).get("pageProps", {}).keys()))
        )

    result = []
    for m in members:
        player_id = str(
            m.get("id") or m.get("playerId") or m.get("player_id") or ""
        ).strip()
        name = (m.get("name") or "").strip()
        level = m.get("level")
        if not player_id or not name or level is None:
            continue
        result.append(
            {
                "stfc_player_id": player_id,
                "name": name,
                "level": int(level),
            }
        )
    return result


def _find_member_list(node, _depth=0):
    """Recursively search the Next.js data tree for the list of alliance
    members. We look for a list of dicts that each have a 'name' and a
    'level' key, and pick the longest such list we find."""
    if _depth > 12:
        return None

    best = None

    if isinstance(node, list):
        if node and all(
            isinstance(item, dict) and "name" in item and "level" in item
            for item in node
        ):
            best = node
        for item in node:
            candidate = _find_member_list(item, _depth + 1)
            if candidate and (best is None or len(candidate) > len(best)):
                best = candidate

    elif isinstance(node, dict):
        for value in node.values():
            candidate = _find_member_list(value, _depth + 1)
            if candidate and (best is None or len(candidate) > len(best)):
                best = candidate

    return best


def fetch_roster():
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/roster",
        headers=HEADERS_SUPABASE,
        params={"select": "id,name,level,status,stfc_player_id"},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()


def update_roster_row(roster_id, name=None, level=None, stfc_player_id=None, dry_run=True):
    payload = {}
    if name is not None:
        payload["name"] = name
    if level is not None:
        payload["level"] = level
    if stfc_player_id is not None:
        payload["stfc_player_id"] = stfc_player_id

    if dry_run:
        print(f"  [DRY RUN] would PATCH roster id={roster_id} with {payload}")
        return

    resp = requests.patch(
        f"{SUPABASE_URL}/rest/v1/roster",
        headers=HEADERS_SUPABASE,
        params={"id": f"eq.{roster_id}"},
        json=payload,
        timeout=30,
    )
    resp.raise_for_status()


def insert_review(review_type, stfc_player_id=None, roster_id=None,
                   scraped_name=None, scraped_level=None, previous_name=None,
                   detail=None, dry_run=True):
    payload = {
        "review_type": review_type,
        "stfc_player_id": stfc_player_id,
        "roster_id": roster_id,
        "scraped_name": scraped_name,
        "scraped_level": scraped_level,
        "previous_name": previous_name,
        "detail": detail,
    }
    if dry_run:
        print(f"  [DRY RUN] would flag review: {payload}")
        return

    resp = requests.post(
        f"{SUPABASE_URL}/rest/v1/roster_sync_review",
        headers=HEADERS_SUPABASE,
        json=payload,
        timeout=30,
    )
    resp.raise_for_status()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", default=False)
    args = parser.parse_args()
    dry_run = args.dry_run

    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.", file=sys.stderr)
        sys.exit(1)

    print(f"Mode: {'DRY RUN (no writes)' if dry_run else 'LIVE'}")
    print(f"Fetching alliance members from {ALLIANCE_URL} ...")
    scraped = fetch_alliance_members()
    print(f"  Found {len(scraped)} members on stfc.pro")

    print("Fetching current roster from Supabase ...")
    roster = fetch_roster()
    print(f"  Found {len(roster)} roster rows")

    by_stfc_id = {r["stfc_player_id"]: r for r in roster if r.get("stfc_player_id")}
    by_norm_name = {}
    for r in roster:
        if not r.get("stfc_player_id"):
            by_norm_name.setdefault(normalize_name(r["name"]), []).append(r)

    seen_stfc_ids = set()
    renames = updates = bootstrapped = new_flags = 0

    for member in scraped:
        pid = member["stfc_player_id"]
        seen_stfc_ids.add(pid)

        roster_row = by_stfc_id.get(pid)

        if roster_row:
            # Known player - update name/level, detect renames.
            changes = {}
            if roster_row["name"] != member["name"]:
                changes["name"] = member["name"]
                print(f"RENAME: '{roster_row['name']}' -> '{member['name']}' (id={roster_row['id']})")
                insert_review(
                    "rename",
                    stfc_player_id=pid,
                    roster_id=roster_row["id"],
                    scraped_name=member["name"],
                    scraped_level=member["level"],
                    previous_name=roster_row["name"],
                    dry_run=dry_run,
                )
                renames += 1
            if roster_row["level"] != member["level"]:
                changes["level"] = member["level"]

            if changes:
                update_roster_row(roster_row["id"], dry_run=dry_run, **changes)
                updates += 1
            continue

        # No stfc_player_id match - try one-time bootstrap by normalised name.
        norm = normalize_name(member["name"])
        candidates = by_norm_name.get(norm, [])
        if len(candidates) == 1:
            match_row = candidates[0]
            print(f"BOOTSTRAP: linking '{member['name']}' -> roster id={match_row['id']} (stfc_player_id={pid})")
            update_roster_row(
                match_row["id"],
                name=member["name"],
                level=member["level"],
                stfc_player_id=pid,
                dry_run=dry_run,
            )
            bootstrapped += 1
            continue

        # No confident match at all - flag as a new/unmatched member.
        print(f"NEW/UNMATCHED: '{member['name']}' (stfc_player_id={pid}) - no roster match found")
        insert_review(
            "new_member",
            stfc_player_id=pid,
            scraped_name=member["name"],
            scraped_level=member["level"],
            detail="No existing roster row matched this player by ID or name.",
            dry_run=dry_run,
        )
        new_flags += 1

    # Roster rows with a known stfc_player_id that weren't seen in this scrape.
    left_flags = 0
    for r in roster:
        pid = r.get("stfc_player_id")
        if pid and pid not in seen_stfc_ids:
            print(f"POSSIBLY LEFT: '{r['name']}' (roster id={r['id']}) not found in current scrape")
            insert_review(
                "possibly_left",
                stfc_player_id=pid,
                roster_id=r["id"],
                previous_name=r["name"],
                detail="Player has a stored stfc_player_id but did not appear in the latest scrape.",
                dry_run=dry_run,
            )
            left_flags += 1

    print("\nSummary:")
    print(f"  Renames applied:        {renames}")
    print(f"  Level/name updates:     {updates}")
    print(f"  Bootstrap ID links:     {bootstrapped}")
    print(f"  New/unmatched flagged:  {new_flags}")
    print(f"  Possibly-left flagged:  {left_flags}")


if __name__ == "__main__":
    main()
