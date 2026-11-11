// Keeps one pinned Discord message up to date (tournaments + incursions 14 days, territory 7 days) and sends
// @here alerts: when a new tournament/incursion is announced, and 1 day / 2 hours before each incursion.
//
// Called every 5 minutes by pg_cron (job "discord-events"). Idempotent and safe to expose without auth:
// the message is only edited when its content changes, and every alert/reminder is claimed in the database
// first, so repeat or concurrent calls cannot double-send.
//
// Secret required (Supabase dashboard -> Edge Functions -> Secrets): DISCORD_EVENTS_WEBHOOK_URL
// Memory tables: discord_feed_state, discord_feed_seen, discord_feed_reminded (RLS on, service role only).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { alertText, buildMessage, dueReminders, gameOccurrences, reminderText, territoryOccurrences } from "./logic.ts";

const SB_URL = "https://mmzizgsanwqjpiumpqay.supabase.co";
// Same data the calendar feed reads. Cache-busted: raw.githubusercontent.com serves stale content otherwise.
const DATA_URL = "https://raw.githubusercontent.com/ajone79/Phoenix-tracker/refs/heads/main/events-data-game.json";

const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (_req: Request) => {
  try {
    const webhook = (Deno.env.get("DISCORD_EVENTS_WEBHOOK_URL") ?? "").trim();
    if (!webhook) return json({ skipped: "DISCORD_EVENTS_WEBHOOK_URL secret is not set" });

    const sb = createClient(SB_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const now = new Date();

    const res = await fetch(`${DATA_URL}?cb=${Math.floor(Date.now() / 60000)}`, { cache: "no-store" });
    if (!res.ok) return json({ error: `event data unavailable (${res.status})` }, 502);
    const data = await res.json();
    const { data: rows, error: rowsErr } = await sb.from("phx_territory_schedule")
      .select("system,weekday,start_utc,duration_min");
    if (rowsErr) return json({ error: rowsErr.message }, 500);

    const events = data.events ?? [];
    if (!events.length) return json({ skipped: "event data is empty, leaving Discord unchanged" });

    const game = gameOccurrences(events, now);
    const territory = territoryOccurrences(rows ?? [], now, 7);

    const postHook = async (content: string, everyone: boolean) => {
      const r = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, allowed_mentions: { parse: everyone ? ["everyone"] : [] } }),
      });
      return r.ok;
    };

    // 1. The pinned message: edit in place, only when the content changed.
    const content = buildMessage([...game, ...territory], now);
    const hash = await sha256(content);
    const { data: msgRow } = await sb.from("discord_feed_state").select("value").eq("key", "message").maybeSingle();
    const msg: { id?: string; hash?: string | null } = msgRow?.value ?? {};
    let messageAction = "unchanged";
    if (!msg.id || msg.hash !== hash) {
      let ok = false;
      if (msg.id) {
        const r = await fetch(`${webhook}/messages/${msg.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, allowed_mentions: { parse: [] } }),
        });
        ok = r.ok;
        if (ok) messageAction = "edited";
        else if (r.status !== 404) return json({ error: `discord edit failed (${r.status})` }, 502);
      }
      if (!ok) {
        const r = await fetch(`${webhook}?wait=true`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, allowed_mentions: { parse: [] } }),
        });
        if (!r.ok) return json({ error: `discord post failed (${r.status})` }, 502);
        msg.id = (await r.json()).id;
        messageAction = "posted-new (pin it in Discord)";
      }
      msg.hash = hash;
      await sb.from("discord_feed_state").upsert({ key: "message", value: msg, updated_at: now.toISOString() });
    }

    // 2. @here for newly announced tournaments / incursions. The first ever run only records what exists.
    const { data: init } = await sb.from("discord_feed_state").select("key").eq("key", "initialised").maybeSingle();
    let alerts = 0;
    if (game.length) {
      const { data: claimed } = await sb.from("discord_feed_seen")
        .upsert(game.map((e) => ({ uid: e.uid, end_at: e.end.toISOString() })), { onConflict: "uid", ignoreDuplicates: true })
        .select("uid");
      if (init) {
        for (const e of game) {
          if (!claimed?.some((c) => c.uid === e.uid)) continue;
          if (await postHook(alertText(e), true)) alerts++;
          else await sb.from("discord_feed_seen").delete().eq("uid", e.uid); // un-claim so the next run retries
        }
      }
    }
    if (!init) await sb.from("discord_feed_state").upsert({ key: "initialised", value: { at: now.toISOString() } });

    // 3. @here reminders 1 day and 2 hours before incursions.
    let reminders = 0;
    const due = dueReminders(game, now);
    if (due.length) {
      const { data: claimed } = await sb.from("discord_feed_reminded")
        .upsert(due.map((d) => ({ uid: d.e.uid, label: d.label, end_at: d.e.end.toISOString() })),
          { onConflict: "uid,label", ignoreDuplicates: true })
        .select("uid,label");
      for (const d of due) {
        if (!claimed?.some((c) => c.uid === d.e.uid && c.label === d.label)) continue;
        if (await postHook(reminderText(d.e, d.label), true)) reminders++;
        else await sb.from("discord_feed_reminded").delete().eq("uid", d.e.uid).eq("label", d.label);
      }
    }

    // Tidy: forget events that finished more than 30 days ago.
    const cutoff = new Date(now.getTime() - 30 * 86400000).toISOString();
    await sb.from("discord_feed_seen").delete().lt("end_at", cutoff);
    await sb.from("discord_feed_reminded").delete().lt("end_at", cutoff);

    return json({ message: messageAction, alerts, reminders, game: game.length, territory: territory.length });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
