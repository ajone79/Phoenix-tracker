"""Backup source for game events: read the official STFC #event-information post from Discord.

The post is followed into a channel on the Phoenix server; scripts/discord_announcements_sync.py copies it
into the Supabase table discord_announcements. When stfc.cfd stops updating, the scraper uses the events
parsed here instead (stfc.cfd still wins whenever it lists the same event - see merge_manual).

Each event in the post looks like:

    Outbreak: Battlelines Hostile Offensive (Heroic) - SMS (Level 20-34 Solo Milestone)
    November 12-13, 19-20, 26-27; December 3-4
    Score in this event by destroying hostiles.

Dates are inclusive day ranges; an event runs from the daily reset (09:00 Los Angeles) on the first day to
the reset after the last day.
"""
import json
import re
import zlib
from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo

import requests

SUPABASE_URL = "https://mmzizgsanwqjpiumpqay.supabase.co"
# Public read-only (anon) key - the same one the website ships to every browser.
ANON_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1teml6Z3NhbndxanBpdW1wcWF5Iiwicm9sZSI6ImFub24i"
    "LCJpYXQiOjE3ODYwMjk5MzksImV4cCI6MjEwMTYwNTkzOX0.KqvY2Ib33J8h8ztEi8qxtfutSdVIPAaJRtj7cSUSKFM"
)
CHANNEL_ID = "1570880489420488704"  # Phoenix server channel that follows the official #event-information

LA = ZoneInfo("America/Los_Angeles")
MONTHS = {m: i for i, m in enumerate(
    ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"], 1)}
TOKEN = re.compile(r"(?:(?P<m1>[A-Z][a-z]+)\s+)?(?P<d1>\d+)(?:\s*-\s*(?:(?P<m2>[A-Z][a-z]+)\s+)?(?P<d2>\d+))?$")
MONTH_START = re.compile(r"^(?:Part\s*\d+\s+)?(" + "|".join(MONTHS) + r")\b")
FORMAT = re.compile(r"-\s*(SMS|SLB|XSLB|AMS|XALB|IMS|XLB|ALB)\b")


def parse_dates(spec, year):
    """'November 12-13, 19-20; December 3-4' -> [(first_day, last_day)]. Runs of single days are merged."""
    out, month = [], None
    for tok in re.split(r"[;,]", spec):
        tok = tok.strip()
        if not tok:
            continue
        m = TOKEN.match(tok)
        if not m:
            raise ValueError(f"cannot parse {tok!r}")
        m1 = MONTHS[m["m1"]] if m["m1"] else month
        if m1 is None:
            raise ValueError(f"no month before {tok!r}")
        start = date(year, m1, int(m["d1"]))
        if m["d2"]:
            m2 = MONTHS[m["m2"]] if m["m2"] else m1
            end, month, single = date(year if m2 >= m1 else year + 1, m2, int(m["d2"])), m2, False
        else:
            end, month, single = start, m1, True
        out.append([start, end, single])
    merged = []
    for s, e, single in out:
        if merged and single and merged[-1][2] and s == merged[-1][1] + timedelta(days=1):
            merged[-1][1] = e
        else:
            merged.append([s, e, single])
    return [(s, e) for s, e, _ in merged]


def reset_utc(d):
    return datetime(d.year, d.month, d.day, 9, 0, tzinfo=LA).astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")


def _clean(line):
    line = re.sub(r"[*_~`>|]+", "", line)
    return re.sub(r"\s+", " ", line).strip()


def _event_type(title, desc, has_format):
    low, d = title.lower(), desc.lower()
    if "meta" in low:
        return "meta"
    if "recruit" in low:
        return "recruit"
    if "starter set" in low:
        return ""
    if "research center" in low:
        return "building"
    if "armada" in d:
        return "armadas"
    return "hostiles" if has_format else ""


def parse_message(content, posted_at):
    """Events found in one Discord message. Blocks that do not look like an event are skipped."""
    events = []
    posted = posted_at.date()
    for block in re.split(r"\n\s*\n|\n[-─━=_ ]{3,}\n", content or ""):
        lines = [_clean(l) for l in block.split("\n")]
        lines = [l for l in lines if l and not re.fullmatch(r"[-─━=_ ]+", l)]
        date_lines = [l for l in lines if MONTH_START.match(l)]
        if not date_lines:
            continue
        head = [l for l in lines if not MONTH_START.match(l) and not l.lower().startswith("score")]
        if not head:
            continue
        heading = head[0]
        desc = " ".join(l for l in lines if l.lower().startswith("score"))
        spec = ", ".join(re.sub(r"^Part\s*\d+\s+", "", l) for l in date_lines)
        fmt = FORMAT.search(heading)
        lvl = re.search(r"\(Level (\d+)-(\d+)", heading)
        title = re.sub(r"\s*\((Heroic|Level [^)]*)\)", "", heading)
        title = re.sub(r"\s+", " ", title).strip()
        try:
            # Year: the post is about the next few weeks, so a month far behind the post date means next year.
            year = posted.year
            first_month = MONTHS[MONTH_START.match(date_lines[0]).group(1)]
            if first_month < posted.month - 6:
                year += 1
            ranges = parse_dates(spec, year)
        except Exception:
            continue
        for s, e in ranges:
            start, end = reset_utc(s), reset_utc(e + timedelta(days=1))
            events.append({
                "id": 800_000_000 + zlib.crc32(f"{title}|{start}".encode()) % 100_000_000,
                "title": title,
                "description": desc,
                "imageUrl": None,
                "startUTC": start,
                "endUTC": end,
                "eventType": _event_type(title, desc, fmt is not None),
                "eventSubType": "season_pass" if fmt is None else ("heroic" if "(Heroic)" in heading else None),
                "eventFormat": fmt.group(1) if fmt else None,
                "priority": "arc",
                "minOpsLevel": int(lvl.group(1)) if lvl else None,
                "maxOpsLevel": int(lvl.group(2)) if lvl else None,
                "repeatType": "none",
                "manual": True,
            })
    return events


def fetch_events(limit=60):
    """Events from the most recent posts in the synced channel (newest post wins on duplicates)."""
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/discord_announcements",
        params={"select": "content,posted_at", "channel_id": f"eq.{CHANNEL_ID}", "order": "posted_at.desc", "limit": str(limit)},
        headers={"apikey": ANON_KEY, "Authorization": f"Bearer {ANON_KEY}"},
        timeout=20,
    )
    resp.raise_for_status()
    seen, out = set(), []
    for row in resp.json():
        posted = datetime.fromisoformat(row["posted_at"].replace("Z", "+00:00"))
        for e in parse_message(row.get("content") or "", posted):
            key = (e["title"], e["startUTC"], e["endUTC"])
            if key not in seen:
                seen.add(key)
                out.append(e)
    return out


if __name__ == "__main__":
    events = fetch_events()
    print(json.dumps(events[:3], indent=2))
    print(len(events), "events parsed from Discord")
