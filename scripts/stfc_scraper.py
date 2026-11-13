import requests
import json
import os
import re
from datetime import datetime, timezone

URL = "https://stfc-cfd-api.fly.dev/api/events"
HEADERS = {
    "Origin": "https://stfc.cfd",
    "Referer": "https://stfc.cfd/",
    "Accept": "*/*",
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36",
}

OUT_FILE = "events-data-game.json"
# Hand-written events (e.g. test events, or events copied from the official Discord while stfc.cfd is behind)
# merged into the output so a scrape never wipes them. Anything stfc.cfd also lists wins over these.
MANUAL_FILE = "scripts/manual-events.json"


def strip_html(text):
    if not text:
        return ""
    return re.sub(r"<[^>]+>", "", text).strip()


_FORMATS = {"sms", "slb", "xslb", "ams", "alb", "xalb", "ims", "xlb", "rlb"}
_NOISE = {"outbreak", "battlelines"}


def _event_key(title):
    """Comparable name for an event: no brackets, season prefix or format suffix ("(Heroic)", "- SMS")."""
    t = re.sub(r"\(.*?\)", " ", title or "").lower()
    words = [w for w in re.sub(r"[^a-z0-9]+", " ", t).split() if w not in _NOISE and w not in _FORMATS]
    return " ".join(words)


def merge_manual(slim, manual):
    """Add hand-written events, but let stfc.cfd win: a manual event is dropped as soon as the feed
    has an event with the same name and format whose dates overlap it. Returns (merged, dropped)."""
    live = {}
    for e in slim:
        live.setdefault((_event_key(e["title"]), e.get("eventFormat")), []).append(e)
    kept, dropped = [], 0
    for m in manual:
        clash = any(
            (e["startUTC"] or "") < (m["endUTC"] or "") and (m["startUTC"] or "") < (e["endUTC"] or "")
            for e in live.get((_event_key(m["title"]), m.get("eventFormat")), [])
        )
        if clash:
            dropped += 1
        else:
            kept.append(m)
    return slim + kept, dropped


def main():
    response = requests.get(URL, headers=HEADERS, timeout=30)
    response.raise_for_status()
    raw_events = response.json()
    print(f"Fetched {len(raw_events)} events from stfc.cfd")

    filtered = [
        e for e in raw_events
        if e.get("eventType") != "stream" and e.get("eventSubType") != "cc"
    ]
    print(f"{len(raw_events) - len(filtered)} content-creator/stream events excluded")
    print(f"{len(filtered)} events remaining")

    slim = []
    for e in filtered:
        slim.append({
            "id": e.get("id"),
            "title": e.get("title", ""),
            "description": strip_html(e.get("description", "")),
            "imageUrl": e.get("imageUrl"),
            "startUTC": e.get("startTime"),
            "endUTC": e.get("endTime"),
            "eventType": e.get("eventType") or "",
            "eventSubType": e.get("eventSubType"),
            "eventFormat": e.get("eventFormat"),
            "priority": e.get("priority", "normal"),
            "minOpsLevel": e.get("minOpsLevel"),
            "maxOpsLevel": e.get("maxOpsLevel"),
            "repeatType": e.get("repeatType", "none"),
        })

    if os.path.exists(MANUAL_FILE):
        with open(MANUAL_FILE, encoding="utf-8") as f:
            manual = json.load(f)
        slim, dropped = merge_manual(slim, manual)
        print(f"{len(manual) - dropped} manual events merged from {MANUAL_FILE} ({dropped} superseded by stfc.cfd)")

    slim.sort(key=lambda e: e["startUTC"] or "")

    payload = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "events": slim,
    }

    with open(OUT_FILE, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)

    print(f"Wrote {OUT_FILE}")


if __name__ == "__main__":
    main()
