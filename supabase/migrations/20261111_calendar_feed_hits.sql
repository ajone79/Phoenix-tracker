-- Anonymous calendar-feed usage counter (client = HMAC of IP+user agent, no raw data stored).
-- Read via views calendar_feed_summary / calendar_feed_active_7d in the Table Editor (service role / dashboard).
create table if not exists public.calendar_feed_hits (
  day date not null, client text not null, app text, hits int not null default 1,
  first_seen timestamptz default now(), last_seen timestamptz default now(), primary key (day, client));
alter table public.calendar_feed_hits enable row level security;
create or replace function public.record_feed_hit(p_client text, p_app text) returns void
language sql security definer set search_path = '' as $$
  insert into public.calendar_feed_hits (day, client, app) values (current_date, p_client, p_app)
  on conflict (day, client) do update set hits = public.calendar_feed_hits.hits + 1, last_seen = now(), app = excluded.app;
$$;
revoke all on function public.record_feed_hit(text, text) from public, anon, authenticated;
grant execute on function public.record_feed_hit(text, text) to service_role;
create or replace view public.calendar_feed_summary with (security_invoker = true) as
  select day, app, count(*) as clients, sum(hits) as hits from public.calendar_feed_hits group by day, app order by day desc, app;
create or replace view public.calendar_feed_active_7d with (security_invoker = true) as
  select app, count(distinct client) as clients_7d, sum(hits) as hits_7d from public.calendar_feed_hits where day >= current_date - 6 group by app;
select cron.schedule('calendar-feed-prune', '30 3 * * *', $$ delete from public.calendar_feed_hits where day < current_date - 90; $$);
