-- Raid timers are public game information; the Android widget reads them with the anon key (read-only).
create policy "public read raid timers" on public.raid_timer_schedule for select to anon, authenticated using (true);
