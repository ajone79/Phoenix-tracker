import requests
import json
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


def strip_html(text):
    if not text:
        return ""
    return re.sub(r"<[^>]+>", "", text).strip()


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
