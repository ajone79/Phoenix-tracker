"""Scrape the stfc.club crew library into club-crews.json (read by the spocks-wisdom edge function).

Polite by design: honours robots.txt, identifies itself, 1s between requests, and
refuses to overwrite the existing JSON unless the scrape looks complete.
"""
import json
import re
import sys
import time
from datetime import datetime, timezone
from urllib.parse import urljoin, urlparse, parse_qs
from urllib.robotparser import RobotFileParser

import requests
from bs4 import BeautifulSoup

BASE = "https://stfc.club"
UA = "PhoenixEU168-tracker/1.0 (alliance crew reference; +https://github.com/ajone79/Phoenix-tracker)"
HEADERS = {"User-Agent": UA, "Accept": "text/html"}
DELAY = 1.0
OUT_FILE = "club-crews.json"
SLOTS = {"CAPTAIN": "captain", "1ST OFFICER": "officer1", "2ND OFFICER": "officer2"}

session = requests.Session()
session.headers.update(HEADERS)


def check_robots():
    rp = RobotFileParser()
    r = session.get(BASE + "/robots.txt", timeout=30)
    if r.status_code == 404:
        print("No robots.txt (404) - nothing disallowed")
        return
    r.raise_for_status()
    rp.parse(r.text.splitlines())
    for path in ("/crews", "/crews/example-crew"):
        if not rp.can_fetch(UA, BASE + path):
            print(f"robots.txt disallows {path} - aborting")
            sys.exit(1)
    print("robots.txt allows /crews")


def get(url):
    last = None
    for attempt in range(3):
        try:
            time.sleep(DELAY)
            r = session.get(url, timeout=30)
            if r.status_code == 200:
                return r.text
            last = f"HTTP {r.status_code}"
        except requests.RequestException as e:
            last = str(e)
        time.sleep(3 * (attempt + 1))
    raise RuntimeError(f"Failed to fetch {url}: {last}")


def crew_slugs(html):
    soup = BeautifulSoup(html, "html.parser")
    slugs = []
    for a in soup.find_all("a", href=True):
        path = urlparse(urljoin(BASE, a["href"])).path
        m = re.fullmatch(r"/crews/([^/]+)", path)
        if m and m.group(1) not in slugs:
            slugs.append(m.group(1))
    return slugs, soup


def situation_slugs(soup):
    out = []
    for a in soup.find_all("a", href=True):
        q = parse_qs(urlparse(urljoin(BASE, a["href"])).query)
        for s in q.get("situation", []):
            if s not in out:
                out.append(s)
    return out


def parse_crew(slug, html):
    soup = BeautifulSoup(html, "html.parser")
    title = soup.title.get_text(strip=True) if soup.title else slug
    name = title.split(" | ")[0].strip()
    crew = {"slug": slug, "name": name, "url": f"{BASE}/crews/{slug}",
            "captain": None, "officer1": None, "officer2": None, "situations": [], "notes": ""}
    for a in soup.find_all("a", href=True):
        if not re.fullmatch(r"/officers/[^/]+", urlparse(urljoin(BASE, a["href"])).path):
            continue
        text = re.sub(r"\s+", " ", a.get_text(" ", strip=True))
        m = re.match(r"^(CAPTAIN|1ST OFFICER|2ND OFFICER)\s+(.+?)\s+MIN\s+(\S+)$", text, re.I)
        if m:
            crew[SLOTS[m.group(1).upper()]] = {"name": m.group(2), "minRank": m.group(3)}
    page_text = soup.get_text("\n", strip=True)
    m = re.search(r"CREW NOTES\s*(.*?)\s*EFFECTIVE AGAINST", page_text, re.S | re.I)
    notes = m.group(1).strip() if m else ""
    if not notes:
        meta = soup.find("meta", attrs={"name": "description"})
        notes = (meta.get("content") or "").strip() if meta else ""
    crew["notes"] = re.sub(r"\s+", " ", notes)
    return crew


def main():
    check_robots()
    list_html = get(BASE + "/crews")
    slugs, soup = crew_slugs(list_html)
    print(f"{len(slugs)} crews on list page")

    by_slug = {}
    for sit in situation_slugs(soup):
        s_slugs, _ = crew_slugs(get(f"{BASE}/crews?situation={sit}"))
        for s in s_slugs:
            by_slug.setdefault(s, []).append(sit.replace("-", " "))
    print(f"Situation filters mapped for {len(by_slug)} crews")

    crews = []
    for i, slug in enumerate(slugs, 1):
        crew = parse_crew(slug, get(f"{BASE}/crews/{slug}"))
        crew["situations"] = by_slug.get(slug, [])
        crews.append(crew)
        if i % 25 == 0:
            print(f"  {i}/{len(slugs)}")

    full = sum(1 for c in crews if c["captain"] and c["officer1"] and c["officer2"])
    print(f"{len(crews)} crews parsed, {full} with full 3-officer bridge")
    if len(crews) < 100 or full < 0.8 * len(crews):
        print("Scrape looks incomplete - NOT overwriting existing file")
        sys.exit(1)

    payload = {"generatedAt": datetime.now(timezone.utc).isoformat(), "source": BASE + "/crews", "crews": crews}
    with open(OUT_FILE, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))
    print(f"Wrote {OUT_FILE}")


if __name__ == "__main__":
    main()
