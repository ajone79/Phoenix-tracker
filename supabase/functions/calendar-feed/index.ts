// Public, live iCalendar (.ics) subscription feed built from the game-event data that the
// scrape-events GitHub Action refreshes every 4 hours. Calendar apps can't sign in, so this is
// deployed with verify_jwt=false; it only exposes public game events.
//
//   /functions/v1/calendar-feed?cats=territory,tournament,incursion&regions=eu
//     cats    : territory | tournament | incursion   (default: all three)
//               territory   = Phx weekly territory takeovers (phx_territory_schedule, repeating weekly)
//               tournament / incursion = game-wide events from events-data-game.json,
//               matched on the words "alliance tournament" / "incursion" anywhere in the title (any event type)
//     regions : eu | us | apac  (incursions only; default: eu)
//   Reminders: territory = 12 hours and 1 hour before; incursion = 6 days, 12 hours and 1 hour before;
//   tournament = 6 days, 3 days and 1 day before. (Incursions and tournaments are announced ~7 days ahead.)
//   One-off events only carry reminders that have not already passed (past reminders are dropped after a short
//   grace period) so calendar apps such as Thunderbird do not keep re-firing missed reminders on every refresh.
//   Calendar name: stfc-phx.
//   DTSTAMP / LAST-MODIFIED / territory DTSTART are fixed so event data only changes when the event really changes.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const DATA_URL = "https://raw.githubusercontent.com/ajone79/Phoenix-tracker/refs/heads/main/events-data-game.json";
const SB_URL = "https://mmzizgsanwqjpiumpqay.supabase.co";
const SB_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1teml6Z3NhbndxanBpdW1wcWF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwMjk5MzksImV4cCI6MjEwMTYwNTkzOX0.KqvY2Ib33J8h8ztEi8qxtfutSdVIPAaJRtj7cSUSKFM"; // public anon key (table is public-read)
const CAL_NAME = "stfc-phx";
const STABLE_STAMP = "20260101T000000Z";
const ALARM_GRACE_MS = 15 * 60000; // keep a reminder in the feed for this long after it is due
const BYDAY = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
const CATS: Record<string, { label: string; match: (e: any) => boolean }> = {
  territory: { label: "Territory Takeovers", match: (_e) => false }, // built from phx_territory_schedule below
  tournament: { label: "Alliance Tournaments", match: (e) => /alliance\s+tournament/i.test(e.title ?? "") },
  incursion: { label: "Incursions", match: (e) => /incursion/i.test(e.title ?? "") },
};

type Alarm = { trigger: string; label: string; ms: number };
const DEFAULT_ALARMS: Alarm[] = [
  { trigger: "-PT720M", label: "12 hours", ms: 720 * 60000 },
  { trigger: "-PT60M", label: "1 hour", ms: 60 * 60000 },
];
const SIX_DAYS: Alarm = { trigger: "-P6D", label: "6 days", ms: 6 * 86400000 };
const ALARMS: Record<string, Alarm[]> = {
  tournament: [
    SIX_DAYS,
    { trigger: "-P3D", label: "3 days", ms: 3 * 86400000 },
    { trigger: "-P1D", label: "1 day", ms: 86400000 },
  ],
  incursion: [SIX_DAYS, ...DEFAULT_ALARMS],
};
// startMs given (one-off events): drop reminders that were due more than the grace period ago.
// startMs omitted (repeating territory events): keep every reminder, it applies to each weekly occurrence.
function alarmLines(cat: string, title: string, startMs?: number): string[] {
  const out: string[] = [];
  const now = Date.now();
  for (const a of ALARMS[cat] ?? DEFAULT_ALARMS) {
    if (startMs !== undefined && startMs - a.ms < now - ALARM_GRACE_MS) continue;
    out.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc(title)} starts in ${a.label}`, `TRIGGER:${a.trigger}`, "END:VALARM");
  }
  return out;
}

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

  const L = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Phoenix EU168//Game Event Feed//EN", "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH", `X-WR-CALNAME:${esc(CAL_NAME)}`, `NAME:${esc(CAL_NAME)}`, "X-WR-TIMEZONE:UTC",
    "REFRESH-INTERVAL;VALUE=DURATION:PT15M", "X-PUBLISHED-TTL:PT15M",
  ];
  for (const { e, cat } of events) {
    const title = String(e.title ?? "").replace(/\u26A0\uFE0F?/g, "").trim();
    L.push(
      "BEGIN:VEVENT",
      `UID:${e.id ?? e.startUTC}-${cat}@events.phoenixeu168.space`,
      `DTSTAMP:${STABLE_STAMP}`,
      `LAST-MODIFIED:${STABLE_STAMP}`,
      "SEQUENCE:0",
      `DTSTART:${icsDate(new Date(e.startUTC))}`,
      `DTEND:${icsDate(new Date(e.endUTC))}`,
      `SUMMARY:${esc(title)}`,
      `CATEGORIES:${esc(CATS[cat].label)}`,
    );
    if (e.description) L.push(`DESCRIPTION:${esc(String(e.description).slice(0, 800))}`);
    L.push(...alarmLines(cat, title, new Date(e.startUTC).getTime()), "END:VEVENT");
  }
  if (cats.includes("territory")) {
    try {
      const r = await fetch(`${SB_URL}/rest/v1/phx_territory_schedule?select=system,weekday,start_utc,duration_min`,
        { headers: { apikey: SB_ANON, Authorization: `Bearer ${SB_ANON}` } });
      const rows = r.ok ? await r.json() : [];
      for (const row of rows) {
        const [hh, mm] = String(row.start_utc).split(":").map(Number);
        // Fixed anchor (Sunday 4 Jan 2026 + weekday offset, UTC) so DTSTART never changes from week to week.
        const start = new Date(Date.UTC(2026, 0, 4 + Number(row.weekday), hh, mm));
        const end = new Date(start.getTime() + (row.duration_min ?? 30) * 60000);
        const tTitle = "Phx \u2022 " + row.system;
        L.push(
          "BEGIN:VEVENT",
          `UID:territory-${String(row.system).toLowerCase().replace(/[^a-z0-9]+/g, "-")}@events.phoenixeu168.space`,
          `DTSTAMP:${STABLE_STAMP}`,
          `LAST-MODIFIED:${STABLE_STAMP}`,
          "SEQUENCE:0",
          `DTSTART:${icsDate(start)}`,
          `DTEND:${icsDate(end)}`,
          `RRULE:FREQ=WEEKLY;BYDAY=${BYDAY[row.weekday]}`,
          `SUMMARY:${esc(tTitle)}`,
          `CATEGORIES:${esc(CATS.territory.label)}`,
          `DESCRIPTION:${esc("Phx territory takeover: " + row.system + " (repeats weekly)")}`,
          ...alarmLines("territory", tTitle),
          "END:VEVENT",
        );
      }
    } catch { /* schedule is best-effort */ }
  }
  L.push("END:VCALENDAR");

  return new Response(L.map(fold).join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      "Access-Control-Allow-Origin": "*",
    },
  });
});
