-- Scheduled event reminders (12h + 1h before each event).
-- Source-of-record copy; applied directly to the project (see supabase/functions/README.md).

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 1. Events --------------------------------------------------------------
create table if not exists public.phx_events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  starts_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (name, starts_at)
);
alter table public.phx_events enable row level security;

create policy "public read phx_events"
  on public.phx_events for select using (true);

create policy "admins manage phx_events"
  on public.phx_events for all
  using (is_tracker_admin()) with check (is_tracker_admin());

-- 2. Sent-alert ledger (dedupe). No policies = service role only. ----------
create table if not exists public.phx_event_alerts_sent (
  event_id uuid not null references public.phx_events(id) on delete cascade,
  alert_minutes int not null,
  sent_at timestamptz not null default now(),
  primary key (event_id, alert_minutes)
);
alter table public.phx_event_alerts_sent enable row level security;

-- 3. Schedule: every 5 minutes call the edge function ---------------------
-- The function is idempotent (only sends reminders that are due and not yet
-- recorded in phx_event_alerts_sent), so it is deployed with verify_jwt=false.
select cron.schedule(
  'phx-event-reminders',
  '*/5 * * * *',
  $$ select net.http_post(
       url := 'https://mmzizgsanwqjpiumpqay.supabase.co/functions/v1/send-event-reminders',
       headers := '{"Content-Type":"application/json"}'::jsonb,
       body := '{}'::jsonb
     ); $$
);
