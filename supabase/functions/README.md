# Supabase Edge Functions — source backup

This folder is a **backup copy** of the Edge Function(s) deployed to the
`mmzizgsanwqjpiumpqay` Supabase project. Deployment itself happens directly
against Supabase (via the Supabase MCP tool / dashboard / CLI) — pushing to
this repo does **not** auto-deploy anything. Treat this as "what's live
should match this," not "this drives what's live."

## parse-event-screenshot

Used by `admin.html`'s "Import scores from screenshot" feature. Takes one
or more base64 images, verifies the caller is a signed-in `tracker_profiles`
admin, sends the image(s) to Groq's vision model (currently
`qwen/qwen3.6-27b`), and returns a deduplicated `[{name, score}]` array.

**Required secret:** `GROQ_API_KEY` — set under Supabase Dashboard →
Edge Functions → Secrets. Not stored anywhere in this repo (as it shouldn't
be) — if it's ever lost, generate a new key at console.groq.com and re-add it
there. The function's SUPABASE_URL and anon key in the source are *not*
secrets — they're the same public values already embedded in every page.

**To redeploy from this file** (if the function is ever deleted or
corrupted on Supabase's side): paste `index.ts` into the Supabase Dashboard's
Edge Functions editor for a new function named `parse-event-screenshot`, or
via the Supabase CLI:

```
supabase functions deploy parse-event-screenshot --project-ref mmzizgsanwqjpiumpqay
```

(Requires the Supabase CLI to be linked to the project and logged in.)

After redeploying, `admin.html` needs no changes — it calls the function by
its fixed URL (`https://mmzizgsanwqjpiumpqay.supabase.co/functions/v1/parse-event-screenshot`),
which stays the same across redeploys as long as the slug is unchanged.

## send-push-broadcast

Used by `home-admin.html`'s "🚨 Push Broadcast" section. Verifies the caller
is a signed-in, approved `tracker_profiles` member with `can_broadcast =
true`, then sends a Web Push notification to every row in
`push_subscriptions` via the `web-push` npm package, pruning any
subscription that comes back expired (404/410). The opt-in toggle members
use to get into `push_subscriptions` in the first place lives on
`self-admin.html` ("My Account"), registering `sw.js` at the site root.

**Required secrets:**
- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` — the project's VAPID keypair.
  Generate once and never regenerate casually — rotating these invalidates
  every existing subscriber, who would need to re-opt-in. The public key is
  also hardcoded in `self-admin.html` (it's not secret, same treatment as
  the Supabase anon key already embedded there) — if the keys are ever
  rotated, that copy needs updating too.
- `VAPID_SUBJECT` — optional, defaults to `mailto:ajaykhoulowa@gmail.com` in
  the function source if unset.

**Required schema:** `tracker_profiles.can_broadcast` and the
`push_subscriptions` table — see
`supabase/migrations/20260914_push_broadcast.sql`. Grant/revoke
`can_broadcast` per-member from the "Home Screen Editors" panel on
`home-admin.html` (owner-only) — a DB trigger blocks anyone who isn't
already an admin from setting it, even on their own row.

**To redeploy:** paste `index.ts` into the Supabase Dashboard's Edge
Functions editor for a new function named `send-push-broadcast`, or via the
Supabase CLI:

```
supabase functions deploy send-push-broadcast --project-ref mmzizgsanwqjpiumpqay
```

## send-event-reminders

Pushes "Phx • <event> — starts in N" notifications 12 hours and 1 hour
before each row in `phx_events`, to every row in `push_subscriptions`
(same VAPID keys/secrets as `send-push-broadcast`). Triggered every 5
minutes by pg_cron job `phx-event-reminders` (via pg_net). Deployed with
`verify_jwt=false` — safe because it is idempotent: it only sends reminders
that are due (within 30 min after fire time) and not yet recorded in
`phx_event_alerts_sent`, so repeat calls do nothing.

**Schema:** `supabase/migrations/20260930_event_reminders.sql`
(`phx_events` public-read / admin-write, `phx_event_alerts_sent`, cron job).
Add events by inserting into `phx_events (name, starts_at)` (UTC).
Front end: `phx-events.html` (event list + .ics download).

**To redeploy:**

```
supabase functions deploy send-event-reminders --no-verify-jwt --project-ref mmzizgsanwqjpiumpqay
```

## calendar-feed

Public live iCalendar subscription (`verify_jwt=false`; calendar apps can't sign in, and it only
exposes public game events). `GET /functions/v1/calendar-feed?cats=territory,tournament,incursion&regions=eu`
- `territory`: Phx weekly takeovers from `phx_territory_schedule` (UTC, repeating weekly, 12h + 1h alarms).
  A daily pg_cron job (`phx-territory-events`) also materialises the next 14 days into `phx_events`
  so push reminders, the Phx Events page and its .ics download include them.
- `tournament` / `incursion`: game-wide events read from `events-data-game.json` (raw GitHub URL).
- `regions` (incursions only): eu | us | apac, default eu.
Change the takeover times by editing rows in `phx_territory_schedule` (weekday 0=Sun..6=Sat, start_utc).
Schema: `supabase/migrations/20261003_territory_schedule.sql`.
