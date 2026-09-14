-- Push-notification broadcast foundation.
--
-- Like Edge Function deploys, schema changes to this project are applied
-- directly (via Supabase MCP/dashboard/CLI) rather than through any CI
-- pipeline triggered by this repo. This file is the source-of-record copy —
-- "what's live should match this," not "this drives what's live." See
-- supabase/functions/README.md for the same convention applied there.

-- 1. Broadcast permission -----------------------------------------------
-- Deliberately a separate flag from is_admin/is_owner: an admin can be
-- trusted to approve members and import scores without also being trusted
-- to push a phone notification to the entire alliance. Starts false for
-- everyone; only manually flipped true for the account owner below.
alter table public.tracker_profiles
  add column if not exists can_broadcast boolean not null default false;

update public.tracker_profiles
  set can_broadcast = true
  where id = 'e9fd2559-38ac-461a-967b-1dda1875d010'; -- ajone (is_owner)

-- The existing "users update own row" RLS policy on tracker_profiles is
-- row-level, not column-level — it would otherwise let anyone flip their
-- own can_broadcast to true from the browser console, same way they could
-- already self-promote is_admin today. Block that specifically for the new
-- column: any change to can_broadcast requires the ACTING user to already
-- be an admin (is_tracker_admin() checks auth.uid(), not the row being
-- written), whether they're editing their own row or someone else's.
create or replace function public.protect_can_broadcast()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.can_broadcast is distinct from old.can_broadcast then
    if not is_tracker_admin() then
      raise exception 'Only an alliance admin can change broadcast permission';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_can_broadcast_before_update on public.tracker_profiles;
create trigger protect_can_broadcast_before_update
  before update on public.tracker_profiles
  for each row execute function public.protect_can_broadcast();

-- 2. Push subscriptions ----------------------------------------------------
-- One row per (member, device/browser) — the same person opted in on their
-- phone and desktop ends up with two rows, both of which get pushed to.
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.tracker_profiles(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

alter table public.push_subscriptions enable row level security;

-- Members manage only their own subscription rows. The sender Edge Function
-- reads/deletes across all rows using the service-role key, which bypasses
-- RLS entirely, so no admin-read policy is needed here.
create policy "owner can insert own subscription"
  on public.push_subscriptions for insert
  with check (user_id = auth.uid());

create policy "owner can view own subscription"
  on public.push_subscriptions for select
  using (user_id = auth.uid());

create policy "owner can update own subscription"
  on public.push_subscriptions for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "owner can delete own subscription"
  on public.push_subscriptions for delete
  using (user_id = auth.uid());
