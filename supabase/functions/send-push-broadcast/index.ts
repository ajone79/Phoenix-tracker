import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = "https://mmzizgsanwqjpiumpqay.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1teml6Z3NhbndxanBpdW1wcWF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwMjk5MzksImV4cCI6MjEwMTYwNTkzOX0.KqvY2Ib33J8h8ztEi8qxtfutSdVIPAaJRtj7cSUSKFM";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(obj: unknown, status: number) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await sb.auth.getUser();
    if (!user) return json({ error: "Not signed in" }, 401);

    const { data: profile } = await sb.from("tracker_profiles")
      .select("approved,can_broadcast,discord_username,in_game_name")
      .eq("id", user.id).maybeSingle();
    if (!profile?.approved) return json({ error: "Account not yet approved" }, 403);
    if (!profile.can_broadcast) return json({ error: "You don't have permission to send broadcast alerts" }, 403);

    const body = await req.json().catch(() => ({}));
    const title = typeof body?.title === "string" ? body.title.trim().slice(0, 80) : "";
    const message = typeof body?.body === "string" ? body.body.trim().slice(0, 200) : "";
    const url = typeof body?.url === "string" ? body.url.slice(0, 200) : "/push-alerts.html";
    if (!title || !message) return json({ error: "title and body are required" }, 400);

    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:ajaykhoulowa@gmail.com";
    if (!vapidPublicKey || !vapidPrivateKey) {
      return json({ error: "Push is not configured (missing VAPID keys)" }, 500);
    }
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    // Service-role client: bypasses RLS so we can read every member's
    // subscriptions and prune dead ones, not just the caller's own rows.
    const serviceSb = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: subs, error: subsError } = await serviceSb
      .from("push_subscriptions")
      .select("id,endpoint,p256dh,auth");
    if (subsError) return json({ error: `Could not load subscriptions: ${subsError.message}` }, 500);
    if (!subs || subs.length === 0) return json({ sent: 0, failed: 0, pruned: 0, note: "No one is opted in yet" }, 200);

    const payload = JSON.stringify({ title, body: message, url, tag: `phx-broadcast-${Date.now()}` });

    let sent = 0;
    let failed = 0;
    const staleIds: string[] = [];

    await Promise.all(subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        );
        sent++;
      } catch (e) {
        failed++;
        // 404/410 means the browser/OS has invalidated this subscription
        // (uninstalled, permission revoked, etc.) — safe to drop it.
        const statusCode = (e as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) staleIds.push(sub.id);
        else console.error("push send failed:", sub.id, (e as Error).message);
      }
    }));

    if (staleIds.length) {
      await serviceSb.from("push_subscriptions").delete().in("id", staleIds);
    }

    return json({ sent, failed, pruned: staleIds.length }, 200);
  } catch (e) {
    return json({ error: `Unexpected error: ${(e as Error).message}` }, 500);
  }
});
