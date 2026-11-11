// Pure logic for the discord-events edge function (no Deno / network APIs, so it can be tested anywhere).

export type Cat = "tournament" | "incursion" | "territory";
export type Occ = { uid: string; title: string; cat: Cat; start: Date; end: Date };
export type Row = { system: string; weekday: number; start_utc: string; duration_min: number | null };

const DAY = 86400000;

export const SECTIONS: { cat: Cat; label: string; days: number }[] = [
  { cat: "tournament", label: "Alliance Tournaments", days: 14 },
  { cat: "incursion", label: "Incursions", days: 14 },
  { cat: "territory", label: "Territory defences", days: 7 },
];

// Incursions get an @here this long before they start. A reminder is only sent inside its window
// (due time .. due time + grace) so a late run never sends a stale one.
export const REMINDERS = [
  { ms: DAY, label: "1 day" },
  { ms: 2 * 3600000, label: "2 hours" },
];
export const REMINDER_GRACE_MS = 45 * 60000;

export const FEED_URL =
  "https://mmzizgsanwqjpiumpqay.supabase.co/functions/v1/calendar-feed?cats=territory,tournament,incursion&regions=eu";
export const EVENTS_PAGE_URL = "https://stfc.phoenixeu168.space/phx-events.html";
export const FOOTER =
  "\n\n\u{1F4C5} **Calendar feed** (auto-updating, with reminders)\n" +
  "In your calendar app choose *Add calendar → From URL* and paste:\n" +
  `<${FEED_URL}>\n` +
  `One-tap Google / app buttons: <${EVENTS_PAGE_URL}>\n` +
  "Google Calendar ignores reminders in feeds, so set notifications for it in Google Calendar.";

// Same keyword rules as the calendar-feed function.
function regionOf(title: string): string | null {
  if (/\be\.?u\.?(\s|$)/i.test(title)) return "eu";
  if (/\bu\.?s\.?(\s|$)/i.test(title)) return "us";
  if (/apac/i.test(title)) return "apac";
  return null;
}

export function classify(title: string): "tournament" | "incursion" | null {
  if (/alliance\s+tournament/i.test(title)) return "tournament";
  if (/incursion/i.test(title) && [null, "eu"].includes(regionOf(title))) return "incursion";
  return null;
}

/** Tournaments and EU incursions that have not finished yet, from events-data-game.json. */
export function gameOccurrences(events: any[], now: Date): Occ[] {
  const out: Occ[] = [];
  for (const e of events) {
    const title = String(e.title ?? "").replace(/⚠️?/g, "").trim();
    const cat = classify(title);
    if (!cat) continue;
    const start = new Date(e.startUTC);
    const end = new Date(e.endUTC);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end.getTime() <= now.getTime()) continue;
    out.push({ uid: `${e.id ?? e.startUTC}-${cat}`, title, cat, start, end });
  }
  return out.sort((a, b) => a.start.getTime() - b.start.getTime());
}

/** Weekly territory takeovers starting within the next `days` days (or still running). */
export function territoryOccurrences(rows: Row[], now: Date, days: number): Occ[] {
  const out: Occ[] = [];
  const horizon = now.getTime() + days * DAY;
  for (const row of rows) {
    const [hh, mm] = String(row.start_utc).split(":").map(Number);
    const dur = (row.duration_min ?? 30) * 60000;
    let start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hh, mm));
    while (start.getUTCDay() !== Number(row.weekday) || start.getTime() > now.getTime()) {
      start = new Date(start.getTime() - DAY);
    }
    for (let t = start.getTime(); t < horizon; t += 7 * DAY) {
      if (t + dur <= now.getTime()) continue;
      out.push({
        uid: `territory-${row.system}-${t}`,
        title: row.system,
        cat: "territory",
        start: new Date(t),
        end: new Date(t + dur),
      });
    }
  }
  return out.sort((a, b) => a.start.getTime() - b.start.getTime());
}

export const ts = (d: Date, style: string) => `<t:${Math.floor(d.getTime() / 1000)}:${style}>`;

function line(e: Occ, now: Date): string {
  if (e.start.getTime() <= now.getTime()) return `• **${e.title}** • live now • ends ${ts(e.end, "R")}`;
  return `• **${e.title}** • ${ts(e.start, "F")} • ${ts(e.start, "R")}`;
}

export function buildMessage(occs: Occ[], now: Date): string {
  const parts: string[] = [];
  for (const s of SECTIONS) {
    const horizon = now.getTime() + s.days * DAY;
    const items = occs
      .filter((e) => e.cat === s.cat && e.end.getTime() > now.getTime() && e.start.getTime() < horizon)
      .sort((a, b) => a.start.getTime() - b.start.getTime());
    const empty = s.cat === "territory"
      ? "• None scheduled"
      : "• None scheduled yet — this will update when they're announced";
    const body = items.map((e) => line(e, now)).join("\n") || empty;
    parts.push(`**${s.label}** (next ${s.days} days) sb\n${body}`);
  }
  return parts.join("\n\n").slice(0, 1990 - FOOTER.length) + FOOTER;
}

export function alertText(e: Occ): string {
  const kind = e.cat === "tournament" ? "alliance tournament" : "incursion";
  return `@here New ${kind} announced: **${e.title}** sb\n` +
    `Starts ${ts(e.start, "F")} (${ts(e.start, "R")}) • Ends ${ts(e.end, "F")}`;
}

export function reminderText(e: Occ, label: string): string {
  return `@here Incursion starts in ${label}: **${e.title}** sb\n` +
    `Starts ${ts(e.start, "F")} (${ts(e.start, "R")}) • Ends ${ts(e.end, "F")}`;
}

/** Incursion reminders whose window is open right now. */
export function dueReminders(game: Occ[], now: Date): { e: Occ; label: string }[] {
  const out: { e: Occ; label: string }[] = [];
  const n = now.getTime();
  for (const e of game) {
    if (e.cat !== "incursion" || n >= e.start.getTime()) continue;
    for (const r of REMINDERS) {
      const due = e.start.getTime() - r.ms;
      if (n >= due && n < due + REMINDER_GRACE_MS) out.push({ e, label: r.label });
    }
  }
  return out;
}
