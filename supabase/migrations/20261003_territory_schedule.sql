-- Weekly Phx territory takeover schedule (UTC). Source of truth for the repeating takeovers.
-- A daily cron materialises the next 14 days into phx_events, so the existing 12h/1h push
-- reminders, the Phx Events page and the .ics download pick them up automatically.
-- weekday: 0 = Sunday ... 6 = Saturday.

create table if not exists public.phx_territory_schedule (
  id serial primary key,
  system text not null unique,
  weekday smallint not null check (weekday between 0 and 6),
  start_utc time not null,
  duration_min int not null default 30
);
alter table public.phx_territory_schedule enable row level security;

create policy "public read phx_territory_schedule"
  on public.phx_territory_schedule for select using (true);

create policy "admins manage phx_territory_schedule"
  on public.phx_territory_schedule for all
  using (is_tracker_admin()) with check (is_tracker_admin());

insert into public.phx_territory_schedule (system, weekday, start_utc) values
  ('Framtid',  5, '10:00'),
  ('Nujord',   5, '14:00'),
  ('Duportas', 6, '13:00'),
  ('Brellan',  0, '12:00'),
  ('Qoda',     0, '18:00')
on conflict (system) do nothing;

create or replace function public.phx_generate_territory_events(days_ahead int default 14)
returns int language plpgsql as $$
declare n int;
begin
  with ins as (
    insert into public.phx_events (name, starts_at)
    select s.system, ((d::date + s.start_utc) at time zone 'UTC')
    from public.phx_territory_schedule s
    cross join generate_series(
      ((now() at time zone 'UTC')::date)::timestamp,
      ((now() at time zone 'UTC')::date)::timestamp + make_interval(days => days_ahead),
      interval '1 day') d
    where extract(dow from d) = s.weekday
      and ((d::date + s.start_utc) at time zone 'UTC') > now()
    on conflict (name, starts_at) do nothing
    returning 1
  )
  select count(*) into n from ins;
  return n;
end $$;

revoke execute on function public.phx_generate_territory_events(int) from public, anon, authenticated;

select cron.schedule('phx-territory-events', '5 0 * * *',
  $$ select public.phx_generate_territory_events(14); $$);
select public.phx_generate_territory_events(14);
