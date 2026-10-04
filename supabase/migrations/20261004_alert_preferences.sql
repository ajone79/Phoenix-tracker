-- Opt-in alert preferences + EU incursion / alliance tournament events.
-- Applied directly to the project; this file is the source-of-record copy.

-- Event kinds: territory takeovers (weekly schedule) vs game-wide events pulled from the
-- events data by send-event-reminders. announced_at = "new event" push already sent.
alter table public.phx_events
  add column if not exists kind text not null default 'territory'
    check (kind in ('territory','tournament','incursion')),
  add column if not exists announced_at timestamptz;

-- Everything that exists today counts as already announced.
update public.phx_events set announced_at = now() where announced_at is null;

-- Per-person, opt-in (default OFF) switches. Stored on the push subscription rows, which
-- members can already update for themselves (existing RLS: user_id = auth.uid()).
alter table public.push_subscriptions
  add column if not exists notify_territory boolean not null default false,
  add column if not exists notify_game_events boolean not null default false;
