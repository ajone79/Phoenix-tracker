import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = "https://mmzizgsanwqjpiumpqay.supabase.co";
const DATA_URL = "https://raw.githubusercontent.com/ajone79/Phoenix-tracker/refs/heads/main/events-data-game.json";

// Minutes before start at which reminders fire.
const ALERTS = [720, 60];
// A reminder is skipped if we are more than this many minutes past its fire
// time (e.g. event added late) so nobody gets a stale "12 hours" alert.
const GRACE_MIN = 30;

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });
}

function label(mins: number) {
  if (mins >= 120) return `${Math.round(mins / 60)} hours`;
  if (mins >= 60) return "1 hour";
  return `${Math.max(mins, 1)} min`;
}

const fmtUtc = (iso: string) => new Date(iso).toUTCString().slice(0, 22) + " UTC";

type Sub = { id: string; endpoint: string; p256dh: string; auth: string; notify_territory: boolean; notify_game_events: boolean };

// Pull EU incursions and alliance tournaments from the game-event data into phx_events.
// Cache-busted: raw.githubusercontent.com serves stale content otherwise.
async function ingestGameEvents(sb: ReturnType<typeof createClient>) {
  const res = await fetch(`${DATA_URL}?cb=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) return 0;
  const data = await res.json();
  const now = Date.now();
  const rows: { name: string; starts_at: string; kind: string }[] = [];
  for (const e of data.events ?? []) {
    const title = String(e.title ?? "").replace(/\u26A0\uFE0F?/g, "").trim();
    let kind: string | null = null;
    if (/alliance tournament/i.test(title)) kind = "tournament";
    else if (/incursion/i.test(title) && e.eventType === "pvp" && /\be\.?u\.?(\s|$)/i.test(title)) kind = "incursion";
    if (!kind) continue;
    if (new Date(e.endUTC).getTime() < now) continue; // already over
    rows.push({ name: title, starts_at: new Date(e.startUTC).toISOString(), kind });
  }
  if (rows.length) {
    await sb.from("phx_events").upsert(rows, { onConflict: "name,starts_at", ignoreDuplicates: true });
  }
  return rows.length;
}

// Idempotent: only sends what is due and not already recorded, so it is safe to expose
// without auth (repeat calls do nothing). Everything is opt-in per person via the
// notify_* switches on push_subscriptions.
Deno.serve(async (_req: Request) => {
  try {
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:ajaykhoulowa@gmail.com";
    if (!vapidPublicKey || !vapidPrivateKey) return json({ error: "Missing VAPID keys" }, 500);
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const sb = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const now = Date.now();
    const nowIso = new Date(now).toISOString();

    let ingested = 0;
    try { ingested = await ingestGameEvents(sb); } catch (e) { console.error("ingest failed:", (e as Error).message); }

    const { data: subRows, error: subErr } = await sb.from("push_subscriptions")
      .select("id,endpoint,p256dh,auth,notify_territory,notify_game_events");
    if (subErr) return json({ error: subErr.message }, 500);
    const subs = (subRows ?? []) as Sub[];
    const wants = (kind: string) =>
      subs.filter((s) => (kind === "territory" ? s.notify_territory : s.notify_game_events));

    let sent = 0, failed = 0;
    const stale: string[] = [];
    const send = async (targets: Sub[], payload: string) => {
      await Promise.all(targets.map(async (s) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload);
          sent++;
        } catch (e) {
          failed++;
          const code = (e as { statusCode?: number })?.statusCode;
          if (code === 404 || code === 410) stale.push(s.id);
        }
      }));
    };

    // 1. "New event" announcements for incursions / tournaments that just hit the calendar.
    let announced = 0;
    const { data: fresh } = await sb.from("phx_events").select("id")
      .in("kind", ["tournament", "incursion"]).is("announced_at", null).gt("starts_at", nowIso);
    if (fresh?.length) {
      const { data: claimed } = await sb.from("phx_events")
        .update({ announced_at: nowIso }).in("id", fresh.map((f) => f.id)).is("announced_at", null)
        .select("id,name,starts_at");
      for (const ev of claimed ?? []) {
        announced++;
        await send(wants("game"), JSON.stringify({
          title: `New: ${ev.name}`,
          body: `Starts ${fmtUtc(ev.starts_at)}`,
          url: "/phx-events.html",
          tag: `phx-new-${ev.id}`,
        }));
      }
    }

    // 2. 12h and 1h reminders for everything in phx_events.
    const { data: events, error: evErr } = await sb.from("phx_events")
      .select("id,name,starts_at,kind")
      .gt("starts_at", nowIso)
      .lt("starts_at", new Date(now + (Math.max(...ALERTS) + 5) * 60000).toISOString());
    if (evErr) return json({ error: evErr.message }, 500);

    const due: { id: string; name: string; kind: string; alert: number; minsLeft: number }[] = [];
    for (const ev of events ?? []) {
      const start = new Date(ev.starts_at).getTime();
      for (const alert of ALERTS) {
        const fireAt = start - alert * 60000;
        if (now >= fireAt && now < fireAt + GRACE_MIN * 60000) {
          due.push({ id: ev.id, name: ev.name, kind: ev.kind, alert, minsLeft: Math.round((start - now) / 60000) });
        }
      }
    }

    let reminders = 0;
    if (due.length) {
      // Claim atomically: only rows actually inserted (not already sent) are returned.
      const { data: claimed, error: claimErr } = await sb.from("phx_event_alerts_sent")
        .upsert(due.map((d) => ({ event_id: d.id, alert_minutes: d.alert })),
          { onConflict: "event_id,alert_minutes", ignoreDuplicates: true })
        .select("event_id,alert_minutes");
      if (claimErr) return json({ error: claimErr.message }, 500);
      const toSend = due.filter((d) => claimed?.some((c) => c.event_id === d.id && c.alert_minutes === d.alert));
      for (const d of toSend) {
        reminders++;
        await send(wants(d.kind), JSON.stringify({
          title: d.kind === "territory" ? `Phx • ${d.name}` : d.name,
          body: `Starts in ${label(d.minsLeft)}`,
          url: "/phx-events.html",
          tag: `phx-event-${d.id}-${d.alert}`,
        }));
      }
    }

    if (stale.length) await sb.from("push_subscriptions").delete().in("id", [...new Set(stale)]);
    return json({ ingested, announced, reminders, sent, failed, pruned: stale.length });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
