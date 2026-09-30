import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = "https://mmzizgsanwqjpiumpqay.supabase.co";

// Minutes before start at which reminders fire.
const ALERTS = [720, 60];
// A reminder is skipped if we are more than this many minutes past its fire
// time (e.g. event added late) so nobody gets a stale "12 hours" alert.
const GRACE_MIN = 30;

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function label(mins: number) {
  if (mins >= 120) return `${Math.round(mins / 60)} hours`;
  if (mins >= 60) return "1 hour";
  return `${Math.max(mins, 1)} min`;
}

// Idempotent: only sends reminders that are due and not already recorded, so
// it is safe to expose without auth (repeat calls do nothing).
Deno.serve(async (_req: Request) => {
  try {
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:ajaykhoulowa@gmail.com";
    if (!vapidPublicKey || !vapidPrivateKey) return json({ error: "Missing VAPID keys" }, 500);
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const sb = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const now = Date.now();

    const { data: events, error: evErr } = await sb.from("phx_events")
      .select("id,name,starts_at")
      .gt("starts_at", new Date(now).toISOString())
      .lt("starts_at", new Date(now + (Math.max(...ALERTS) + 5) * 60000).toISOString());
    if (evErr) return json({ error: evErr.message }, 500);

    const due: { id: string; name: string; alert: number; minsLeft: number }[] = [];
    for (const ev of events ?? []) {
      const start = new Date(ev.starts_at).getTime();
      for (const alert of ALERTS) {
        const fireAt = start - alert * 60000;
        if (now >= fireAt && now < fireAt + GRACE_MIN * 60000) {
          due.push({ id: ev.id, name: ev.name, alert, minsLeft: Math.round((start - now) / 60000) });
        }
      }
    }
    if (!due.length) return json({ due: 0 });

    // Claim atomically: only rows actually inserted (not already sent) are returned.
    const { data: claimed, error: claimErr } = await sb.from("phx_event_alerts_sent")
      .upsert(due.map((d) => ({ event_id: d.id, alert_minutes: d.alert })),
        { onConflict: "event_id,alert_minutes", ignoreDuplicates: true })
      .select("event_id,alert_minutes");
    if (claimErr) return json({ error: claimErr.message }, 500);
    const toSend = due.filter((d) => claimed?.some((c) => c.event_id === d.id && c.alert_minutes === d.alert));
    if (!toSend.length) return json({ due: due.length, sent: 0, note: "already sent" });

    const { data: subs, error: subErr } = await sb.from("push_subscriptions").select("id,endpoint,p256dh,auth");
    if (subErr) return json({ error: subErr.message }, 500);

    let sent = 0, failed = 0;
    const stale: string[] = [];
    for (const d of toSend) {
      const payload = JSON.stringify({
        title: `Phx • ${d.name}`,
        body: `Starts in ${label(d.minsLeft)}`,
        url: "/phx-events.html",
        tag: `phx-event-${d.id}-${d.alert}`,
      });
      await Promise.all((subs ?? []).map(async (s) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload);
          sent++;
        } catch (e) {
          failed++;
          const code = (e as { statusCode?: number })?.statusCode;
          if (code === 404 || code === 410) stale.push(s.id);
        }
      }));
    }
    if (stale.length) await sb.from("push_subscriptions").delete().in("id", [...new Set(stale)]);

    return json({ reminders: toSend.length, sent, failed, pruned: stale.length });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
