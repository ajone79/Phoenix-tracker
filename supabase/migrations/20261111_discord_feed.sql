-- Memory tables for the discord-events and discord-raid-timers edge functions (service role only; RLS on, no policies).
create table if not exists public.discord_feed_state (key text primary key, value jsonb, updated_at timestamptz default now());
create table if not exists public.discord_feed_seen (uid text primary key, end_at timestamptz, created_at timestamptz default now());
create table if not exists public.discord_feed_reminded (uid text, label text, end_at timestamptz, created_at timestamptz default now(), primary key (uid, label));
alter table public.discord_feed_state enable row level security;
alter table public.discord_feed_seen enable row level security;
alter table public.discord_feed_reminded enable row level security;
select cron.schedule('discord-events', '*/5 * * * *', $$ select net.http_post(url := 'https://mmzizgsanwqjpiumpqay.supabase.co/functions/v1/discord-events', headers := '{"Content-Type":"application/json"}'::jsonb, body := '{}'::jsonb); $$);
