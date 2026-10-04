// Public, live iCalendar (.ics) subscription feed built from the game-event data that the
// scrape-events GitHub Action refreshes every 4 hours. Calendar apps can't sign in, so this is
// deployed with verify_jwt=false; it only exposes public game events.
//
//   /functions/v1/calendar-feed?cats=territory,tournament,incursion&regions=eu
//     cats    : territory | tournament | incursion   (default: all three)
//               territory   = Phx weekly territory takeovers (phx_territory_schedule, repeating weekly)
//               tournament / incursion = game-wide events from events-data-game.json
//     regions : eu | us | apac  (incursions only; default: eu)
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const DATA_URL = "https://raw.githubusercontent.com/ajone79/Phoenix-tracker/refs/heads/main/events-data-game.json";
const SB_URL = "https://mmzizgsanwqjpiumpqay.supabase.co";
const SB_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1teml6Z3NhbndxanBpdW1wcWF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwMjk5MzksImV4cCI6MjEwMTYwNTkzOX0.KqvY2Ib33J8h8ztEi8qxtfutSdVIPAaJRtj7cSUSKFM"; // public anon key (table is public-read)
const BYDAY = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
const CATS: Record<string, { label: string; match: (e: any) => boolean }> = {
  territory: { label: "Territory Takeovers", match: (_e) => false }, // built from phx_territory_schedule below
  tournament: { label: "Alliance Tournaments", match: (e) => /alliance tournament/i.test(e.title ?? "") },
  incursion: { label: "Incursions", match: (e) => /incursion/i.test(e.title ?? "") && e.eventType === "pvp" },
};

function region(title: string): string | null {
  if (/\be\.?u\.?(\s|$)/i.test(title)) return "eu";
  if (/\bu\.?s\.?(\s|$)/i.test(title)) return "us";
  if (/apac/i.test(title)) return "apac";
  return null;
}

const icsDate = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

// RFC 5545: lines must be folded at 75 octets (never splitting a UTF-8 character).
function fold(line: string): string {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const out: string[] = [];
  let cur = "";
  let limit = 75;
  for (const ch of line) {
    if (enc.encode(cur + ch).length > limit) {
      out.push(cur);
      cur = ch;
      limit = 74; // continuation lines start with a space
    } else cur += ch;
  }
  out.push(cur);
  return out.join("\r\n ");
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const wantCats = (url.searchParams.get("cats") ?? "territory,tournament,incursion")
    .split(",").map((s) => s.trim().toLowerCase()).filter((c) => CATS[c]);
  const cats = wantCats.length ? wantCats : Object.keys(CATS);
  const regions = (url.searchParams.get("regions") ?? "eu").split(",").map((s) => s.trim().toLowerCase());

  const res = await fetch(`${DATA_URL}?cb=${Math.floor(Date.now() / 60000)}`, { cache: "no-store" }); // cache-bust: raw.githubusercontent serves stale content
  if (!res.ok) return new Response("Event data unavailable", { status: 502 });
  const data = await res.json();
  const stamp = icsDate(new Date(data.generatedAt ?? Date.now()));
  const cutoff = Date.now() - 2 * 86400000; // keep recent past so a running event still shows

  const events = (data.events ?? [])
    .map((e: any) => ({ e, cat: cats.find((c) => CATS[c].match(e)) }))
    .filter((x: any) => x.cat && new Date(x.e.endUTC).getTime() >= cutoff)
    .filter((x: any) => {
      if (x.cat !== "incursion") return true;
      const r = region(x.e.title ?? "");
      return r === null || regions.includes(r);
    })
    .sort((a: any, b: any) => (a.e.startUTC ?? "").localeCompare(b.e.startUTC ?? ""));

  const name = "Phx – " + cats.map((c) => CATS[c].label).join(", ");
  const L = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Phoenix EU168//Game Event Feed//EN", "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH", `X-WR-CALNAME:${esc(name)}`, "X-WR-TIMEZONE:UTC",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H", "X-PUBLISHED-TTL:PT1H",
  ];
  for (const { e, cat } of events) {
    const title = String(e.title ?? "").replace(/\u26A0\uFE0F?/g, "").trim();
    L.push(
      "BEGIN:VEVENT",
      `UID:${e.id ?? e.startUTC}-${cat}@events.phoenixeu168.space`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${icsDate(new Date(e.startUTC))}`,
      `DTEND:${icsDate(new Date(e.endUTC))}`,
      `SUMMARY:${esc(title)}`,
      `CATEGORIES:${esc(CATS[cat].label)}`,
    );
    if (e.description) L.push(`DESCRIPTION:${esc(String(e.description).slice(0, 800))}`);
    L.push(
      "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc(title)} starts in 12 hours`, "TRIGGER:-PT720M", "END:VALARM",
      "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc(title)} starts in 1 hour`, "TRIGGER:-PT60M", "END:VALARM",
      "END:VEVENT",
    );
  }
  if (cats.includes("territory")) {
    try {
      const r = await fetch(`${SB_URL}/rest/v1/phx_territory_schedule?select=system,weekday,start_utc,duration_min`,
        { headers: { apikey: SB_ANON, Authorization: `Bearer ${SB_ANON}` } });
      const rows = r.ok ? await r.json() : [];
      const now = new Date();
      for (const row of rows) {
        const [hh, mm] = String(row.start_utc).split(":").map(Number);
        // Anchor the weekly series on the most recent occurrence (UTC) so it is always valid.
        const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hh, mm));
        while (start.getUTCDay() !== row.weekday || start.getTime() > now.getTime()) start.setUTCDate(start.getUTCDate() - 1);
        const end = new Date(start.getTime() + (row.duration_min ?? 30) * 60000);
        L.push(
          "BEGIN:VEVENT",
          `UID:territory-${String(row.system).toLowerCase().replace(/[^a-z0-9]+/g, "-")}@events.phoenixeu168.space`,
          `DTSTAMP:${icsDate(now)}`,
          `DTSTART:${icsDate(start)}`,
          `DTEND:${icsDate(end)}`,
          `RRULE:FREQ=WEEKLY;BYDAY=${BYDAY[row.weekday]}`,
          `SUMMARY:${esc("Phx \u2022 " + row.system)}`,
          `CATEGORIES:${esc(CATS.territory.label)}`,
          `DESCRIPTION:${esc("Phx territory takeover: " + row.system + " (repeats weekly)")}`,
          "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc("Phx \u2022 " + row.system + " in 12 hours")}`, "TRIGGER:-PT720M", "END:VALARM",
          "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc("Phx \u2022 " + row.system + " in 1 hour")}`, "TRIGGER:-PT60M", "END:VALARM",
          "END:VEVENT",
        );
      }
    } catch { /* schedule is best-effort */ }
  }
  L.push("END:VCALENDAR");

  return new Response(L.map(fold).join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "public, max-age=900",
      "Access-Control-Allow-Origin": "*",
    },
  });
});
