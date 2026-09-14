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

Used by `push-alerts.html`'s "Send to everyone" button. Verifies the caller
is a signed-in, approved `tracker_profiles` member with `can_broadcast =
true`, then sends a Web Push notification to every row in
`push_subscriptions` via the `web-push` npm package, pruning any
subscription that comes back expired (404/410).

**Required secrets:**
- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` — the project's VAPID keypair.
  Generate once and never regenerate casually — rotating these invalidates
  every existing subscriber, who would need to re-opt-in. The public key is
  also hardcoded in `push-alerts.html` (it's not secret, same treatment as
  the Supabase anon key already embedded there) — if the keys are ever
  rotated, that copy needs updating too.
- `VAPID_SUBJECT` — optional, defaults to `mailto:ajaykhoulowa@gmail.com` in
  the function source if unset.

**Required schema:** `tracker_profiles.can_broadcast` and the
`push_subscriptions` table — see
`supabase/migrations/20260914_push_broadcast.sql`. Only the account owner
has `can_broadcast = true` today; an admin can grant it to others later by
updating that column directly (a DB trigger blocks non-admins from setting
it themselves, even on their own row).

**To redeploy:** paste `index.ts` into the Supabase Dashboard's Edge
Functions editor for a new function named `send-push-broadcast`, or via the
Supabase CLI:

```
supabase functions deploy send-push-broadcast --project-ref mmzizgsanwqjpiumpqay
```
