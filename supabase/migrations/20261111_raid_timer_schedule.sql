-- Weekly raid times used by discord-raid-timers. weekday: 0=Sunday..6=Saturday, start_utc is UTC.
create table if not exists public.raid_timer_schedule (id serial primary key, system text not null, weekday int not null, start_utc time not null);
alter table public.raid_timer_schedule enable row level security;
insert into public.raid_timer_schedule (system, weekday, start_utc) values
  ('Adia',3,'09:00'),('Tezera',6,'16:00'),('Tholus',0,'17:00'),('Abilakk',2,'11:00'),('Tigan',5,'18:00');
select cron.schedule('discord-raid-timers', '*/5 * * * *', $$ select net.http_post(url := 'https://mmzizgsanwqjpiumpqay.supabase.co/functions/v1/discord-raid-timers', headers := '{"Content-Type":"application/json"}'::jsonb, body := '{}'::jsonb); $$);
