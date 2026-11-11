// Pure logic for the discord-raid-timers edge function.

export type RaidRow = { system: string; weekday: number; start_utc: string };
export type Raid = { system: string; start: Date };

const DAY = 86400000;

/** Next occurrence (UTC) of each weekly raid, soonest first. weekday: 0 = Sunday ... 6 = Saturday. */
export function nextRaids(rows: RaidRow[], now: Date): Raid[] {
  const out = rows.map((r) => {
    const [hh, mm] = String(r.start_utc).split(":").map(Number);
    let t = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hh, mm);
    while (new Date(t).getUTCDay() !== Number(r.weekday) || t <= now.getTime()) t += DAY;
    return { system: r.system, start: new Date(t) };
  });
  return out.sort((a, b) => a.start.getTime() - b.start.getTime());
}

const ts = (d: Date, style: string) => `<t:${Math.floor(d.getTime() / 1000)}:${style}>`;

export function buildRaidMessage(raids: Raid[]): string {
  return raids.map((r) => `**${r.system}** • ${ts(r.start, "F")} • ${ts(r.start, "R")} sb`).join("\n");
}
