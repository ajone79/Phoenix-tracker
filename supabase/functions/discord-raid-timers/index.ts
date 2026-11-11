// Keeps the raid channel's pinned message up to date with the next time of each weekly raid.
// Called every 5 minutes by pg_cron (job "discord-raid-timers"). The message is only edited when its
// content changes (i.e. when a raid has passed and rolls to next week), so repeat calls do nothing.
//
// Secret required (Supabase dashboard -> Edge Functions -> Secrets): DISCORD_RAID_WEBHOOK_URL
// Raid times live in the raid_timer_schedule table (edit them in the Table Editor).
// Memory: discord_feed_state row "raid_message" (RLS on, service role only).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { buildRaidMessage, nextRaids } from "./logic.ts";

const SB_URL = "https://mmzizgsanwqjpiumpqay.supabase.co";

const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (_req: Request) => {
  try {
    const webhook = (Deno.env.get("DISCORD_RAID_WEBHOOK_URL") ?? "").trim();
    if (!webhook) return json({ skipped: "DISCORD_RAID_WEBHOOK_URL secret is not set" });

    const sb = createClient(SB_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const now = new Date();

    const { data: rows, error } = await sb.from("raid_timer_schedule").select("system,weekday,start_utc");
    if (error) return json({ error: error.message }, 500);
    if (!rows?.length) return json({ skipped: "raid_timer_schedule is empty, leaving Discord unchanged" });

    const content = buildRaidMessage(nextRaids(rows, now));
    const hash = await sha256(content);
    const { data: msgRow } = await sb.from("discord_feed_state").select("value").eq("key", "raid_message").maybeSingle();
    const msg: { id?: string; hash?: string | null } = msgRow?.value ?? {};
    if (msg.id && msg.hash === hash) return json({ message: "unchanged" });

    let action = "";
    if (msg.id) {
      const r = await fetch(`${webhook}/messages/${msg.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, allowed_mentions: { parse: [] } }),
      });
      if (r.ok) action = "edited";
      else if (r.status !== 404) return json({ error: `discord edit failed (${r.status})` }, 502);
    }
    if (!action) {
      const r = await fetch(`${webhook}?wait=true`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, allowed_mentions: { parse: [] } }),
      });
      if (!r.ok) return json({ error: `discord post failed (${r.status})` }, 502);
      msg.id = (await r.json()).id;
      action = "posted-new (pin it in Discord)";
    }
    msg.hash = hash;
    await sb.from("discord_feed_state").upsert({ key: "raid_message", value: msg, updated_at: now.toISOString() });
    return json({ message: action });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
