-- Deep Sector game: run once in the Supabase SQL editor (project: Phoenix events data base).
-- Adds two new tables and five functions. Touches nothing that already exists.
-- Tables are locked (RLS on, no policies); the game page reaches them only
-- through the functions below, and each one needs the game's room code.

create table public.ds_games (
  code text primary key check (code ~ '^[a-z0-9]{8,16}$'),
  state jsonb not null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ds_messages (
  id bigint generated always as identity primary key,
  code text not null references public.ds_games(code) on delete cascade,
  player text not null check (char_length(player) between 8 and 64),
  name text not null check (char_length(name) between 1 and 24),
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
create index ds_messages_code_id_idx on public.ds_messages (code, id);

alter table public.ds_games enable row level security;
alter table public.ds_messages enable row level security;

create function public.ds_create(p_code text, p_state jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
begin
  if pg_column_size(p_state) > 60000 then raise exception 'state too large'; end if;
  if (select count(*) from public.ds_games where created_at > now() - interval '1 hour') > 200 then
    raise exception 'too many new games, try later';
  end if;
  insert into public.ds_games (code, state) values (p_code, p_state);
  return 1;
end $$;

create function public.ds_get(p_code text)
returns table (state jsonb, version integer) language sql stable security definer set search_path = '' as $$
  select g.state, g.version from public.ds_games g where g.code = p_code;
$$;

create function public.ds_save(p_code text, p_state jsonb, p_version integer)
returns integer language plpgsql security definer set search_path = '' as $$
declare v integer;
begin
  if pg_column_size(p_state) > 60000 then raise exception 'state too large'; end if;
  update public.ds_games set state = p_state, version = version + 1, updated_at = now()
   where code = p_code and version = p_version
   returning version into v;
  return coalesce(v, -1);
end $$;

create function public.ds_post(p_code text, p_player text, p_name text, p_body text)
returns bigint language plpgsql security definer set search_path = '' as $$
declare new_id bigint;
begin
  insert into public.ds_messages (code, player, name, body)
  values (p_code, p_player, left(p_name, 24), left(p_body, 500))
  returning id into new_id;
  delete from public.ds_messages m where m.code = p_code and m.id <= new_id - 500;
  return new_id;
end $$;

create function public.ds_messages_since(p_code text, p_after bigint)
returns table (id bigint, player text, name text, body text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select * from (
    select m.id, m.player, m.name, m.body, m.created_at from public.ds_messages m
     where m.code = p_code and m.id > p_after order by m.id desc limit 200
  ) t order by t.id;
$$;

revoke all on function public.ds_create(text, jsonb) from public;
revoke all on function public.ds_get(text) from public;
revoke all on function public.ds_save(text, jsonb, integer) from public;
revoke all on function public.ds_post(text, text, text, text) from public;
revoke all on function public.ds_messages_since(text, bigint) from public;
grant execute on function public.ds_create(text, jsonb) to anon, authenticated;
grant execute on function public.ds_get(text) to anon, authenticated;
grant execute on function public.ds_save(text, jsonb, integer) to anon, authenticated;
grant execute on function public.ds_post(text, text, text, text) to anon, authenticated;
grant execute on function public.ds_messages_since(text, bigint) to anon, authenticated;
