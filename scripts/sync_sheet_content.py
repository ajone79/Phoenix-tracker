#!/usr/bin/env python3
"""
Fetches the master sheets catalog, pulls the actual content of each linked
Google Sheet, and upserts it into Supabase's sheet_content_index table.

This is what lets Spock's Wisdom search sheets by what's actually *in* them,
not just their title/category/tags — and keeps that index reasonably fresh
without anyone needing to do anything (runs daily via GitHub Actions).
"""
import csv
import io
import os
import re
import time
import urllib.parse
import urllib.request

CATALOG_URL = "https://docs.google.com/spreadsheets/d/1AHbQfUYpL3_DpRV-J0m2PbPVYCuzZe3P5t763xaJ5uA/export?format=csv"
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_ROLE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

MAX_CONTENT_CHARS = 8000
MAX_ROWS = 150
REQUEST_TIMEOUT = 20
DELAY_BETWEEN_SHEETS = 1.0  # be polite to Google's endpoint


def fetch_text(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT) as resp:
        return resp.read().decode("utf-8", errors="replace")


def sheet_key(row):
    return (row.get("Title") or "").strip() or (row.get("Sheet URL") or "").strip()


def build_csv_export_url(sheet_url):
    """Mirrors the logic in the spocks-wisdom Edge Function — most sheets are
    'Published to web' links (/spreadsheets/d/e/{id}/pubhtml), which need a
    different export URL than a normal sheet link."""
    try:
        parsed = urllib.parse.urlparse(sheet_url)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)
        gid = (query.get("gid") or [None])[0]
        if not gid and "gid=" in (parsed.fragment or ""):
            m = re.search(r"gid=(\d+)", parsed.fragment)
            if m:
                gid = m.group(1)

        if "/spreadsheets/d/e/" in path or "/pubhtml" in path:
            pub_path = re.sub(r"/pubhtml.*$", "/pubhtml", path) if "/pubhtml" not in path else path
            pub_path = pub_path.replace("/pubhtml", "/pub")
            url = f"https://docs.google.com{pub_path}?output=csv"
            if gid:
                url += f"&gid={gid}&single=true"
            return url

        m2 = re.search(r"/spreadsheets/d/([a-zA-Z0-9-_]+)", path)
        if not m2 or m2.group(1) == "e":
            return None
        sheet_id = m2.group(1)
        url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=csv"
        if gid:
            url += f"&gid={gid}"
        return url
    except Exception:
        return None


def clean_sheet_content(text):
    lines = text.splitlines()[:MAX_ROWS]
    # Drop lines that are just separator commas (fully empty rows)
    lines = [ln for ln in lines if ln.strip(",")]
    return "\n".join(lines)[:MAX_CONTENT_CHARS]


def upsert_rows(rows):
    if not rows:
        return
    url = f"{SUPABASE_URL}/rest/v1/sheet_content_index?on_conflict=sheet_key"
    body = __import__("json").dumps(rows).encode("utf-8")
    req = urllib.request.Request(url, data=body, method="POST", headers={
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
    })
    with urllib.request.urlopen(req, timeout=30) as resp:
        resp.read()


def main():
    print("Fetching sheets catalog…")
    catalog_text = fetch_text(f"{CATALOG_URL}&_cacheBust={int(time.time())}")
    reader = csv.DictReader(io.StringIO(catalog_text))
    rows = [r for r in reader if sheet_key(r)]
    print(f"Catalog has {len(rows)} sheets.")

    indexed = []
    for i, row in enumerate(rows):
        key = sheet_key(row)
        sheet_url = (row.get("Sheet URL") or "").strip()
        content_text = ""

        if "docs.google.com/spreadsheets" in sheet_url:
            export_url = build_csv_export_url(sheet_url)
            if export_url:
                try:
                    raw = fetch_text(export_url)
                    if raw.strip()[:15].lower().startswith("<!doctype") or raw.strip()[:5].lower() == "<html":
                        print(f"  [{i+1}/{len(rows)}] {key}: got an HTML page, not CSV — skipping content, keeping metadata")
                    else:
                        content_text = clean_sheet_content(raw)
                        print(f"  [{i+1}/{len(rows)}] {key}: indexed {len(content_text)} chars")
                except Exception as e:
                    print(f"  [{i+1}/{len(rows)}] {key}: fetch failed ({e}) — keeping metadata only")
            time.sleep(DELAY_BETWEEN_SHEETS)
        else:
            print(f"  [{i+1}/{len(rows)}] {key}: not a Google Sheet, indexing metadata only")

        indexed.append({
            "sheet_key": key,
            "title": row.get("Title") or "",
            "category": row.get("Category") or "",
            "tags": row.get("Tags") or "",
            "description": row.get("Description") or "",
            "sheet_url": sheet_url,
            "content_text": content_text,
        })

        # Upsert in small batches so a single crash partway through doesn't lose everything already done.
        if len(indexed) >= 20:
            upsert_rows(indexed)
            indexed = []

    upsert_rows(indexed)
    print("Done.")


if __name__ == "__main__":
    main()
