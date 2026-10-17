-- Dokapp: Bienestar — esquema de base de datos para Supabase (Postgres + RLS + Storage)
-- Ejecuta este archivo en el editor SQL de tu proyecto Supabase.
--
-- Principios de privacidad:
--   · Cada persona controla la visibilidad de cada acción (public / groups / private).
--   · La emoción y la reflexión viven en action_private (solo el autor). Si el autor decide
--     compartir la emoción, se copia en actions.shared_emotion.
--   · Los grupos solo ven actividad agregada (recuento por día) mediante group_activity(),
--     nunca el contenido de acciones privadas.
--   · delete_my_account() elimina la cuenta y, en cascada, todos sus datos (RGPD).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique not null check (username ~ '^[a-z0-9_.]{3,20}$'),
  name text not null default '',
  bio text not null default '' check (char_length(bio) <= 160),
  avatar text not null default '',
  is_public boolean not null default false,
  interests text[] not null default '{}',
  onboarded boolean not null default false,
  share_metrics_with_groups boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade default auth.uid(),
  photo text not null,
  pillar text not null check (pillar in ('ecologia','mental','emocional','fisica','alimentacion','digital','espiritual')),
  description text not null default '' check (char_length(description) <= 280),
  share_emotion boolean not null default false,
  shared_emotion text check (shared_emotion in ('triste','enfadado','feliz','motivado','cansado')),
  visibility text not null default 'private' check (visibility in ('public','groups','private')),
  group_ids uuid[] not null default '{}',
  allow_comments boolean not null default true,
  local_day date not null,
  created_at timestamptz not null default now(),
  original_taken_at timestamptz
);
create index if not exists actions_user_day on public.actions (user_id, local_day);
create index if not exists actions_created on public.actions (created_at desc);

create table if not exists public.action_private (
  action_id uuid primary key references public.actions on delete cascade,
  user_id uuid not null references public.profiles on delete cascade default auth.uid(),
  emotion text check (emotion in ('triste','enfadado','feliz','motivado','cansado')),
  reflection text not null default '' check (char_length(reflection) <= 1000)
);

create table if not exists public.follows (
  follower_id uuid not null references public.profiles on delete cascade default auth.uid(),
  following_id uuid not null references public.profiles on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted')),
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  description text not null default '',
  image text not null default '',
  invite_code text unique not null default ('DOKA-' || upper(substr(md5(random()::text), 1, 6))),
  created_by uuid not null references public.profiles on delete cascade default auth.uid(),
  weekly_goal int not null default 20 check (weekly_goal between 1 and 500),
  rest_weekdays int[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id uuid not null references public.groups on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  role text not null default 'member' check (role in ('admin','member')),
  joined_at timestamptz not null default now(),
  pause_from date,
  pause_until date,
  pause_reason text not null default '',
  share_metrics boolean not null default false,
  primary key (group_id, user_id)
);

create table if not exists public.reactions (
  action_id uuid not null references public.actions on delete cascade,
  user_id uuid not null references public.profiles on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (action_id, user_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  action_id uuid not null references public.actions on delete cascade,
  user_id uuid not null references public.profiles on delete cascade default auth.uid(),
  text text not null check (char_length(text) between 1 and 500),
  created_at timestamptz not null default now()
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade default auth.uid(),
  title text not null,
  pillar text not null,
  target int not null check (target between 1 and 50),
  frequency text not null check (frequency in ('daily','weekly')),
  start_date date not null default current_date,
  end_date date,
  checkins date[] not null default '{}',
  archived boolean not null default false
);

create table if not exists public.lesson_progress (
  user_id uuid not null references public.profiles on delete cascade default auth.uid(),
  lesson_id text not null,
  xp int not null check (xp between 0 and 100),
  score real not null default 0,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade default auth.uid(),
  prompt text not null,
  text text not null,
  pillar text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.rest_days (
  user_id uuid not null references public.profiles on delete cascade default auth.uid(),
  day date not null,
  reason text not null default '',
  primary key (user_id, day)
);

create table if not exists public.user_settings (
  user_id uuid primary key references public.profiles on delete cascade default auth.uid(),
  settings jsonb not null
);

-- ---------------------------------------------------------------------------
-- Funciones auxiliares (security definer para evitar recursión en RLS)
-- ---------------------------------------------------------------------------

create or replace function public.my_group_ids() returns uuid[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(group_id), '{}') from group_members where user_id = auth.uid();
$$;

create or replace function public.is_group_admin(g uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from group_members where group_id = g and user_id = auth.uid() and role = 'admin');
$$;

create or replace function public.can_see_profile_content(target uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select target = auth.uid()
      or exists(select 1 from profiles where id = target and is_public)
      or exists(select 1 from follows where follower_id = auth.uid() and following_id = target and status = 'accepted');
$$;

-- Perfil automático al registrarse.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare base text; candidate text; n int := 1;
begin
  base := left(regexp_replace(lower(split_part(new.email, '@', 1)), '[^a-z0-9_]', '', 'g'), 18);
  if char_length(base) < 3 then base := 'persona'; end if;
  candidate := base;
  while exists(select 1 from profiles where username = candidate) loop
    n := n + 1; candidate := base || n;
  end loop;
  insert into profiles (id, username) values (new.id, candidate);
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Máximo tres acciones por día (día local enviado por el cliente, con margen de ±1 día).
create or replace function public.enforce_daily_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if abs(new.local_day - (now() at time zone 'utc')::date) > 1 then
    raise exception 'Fecha de registro no válida';
  end if;
  if (select count(*) from actions where user_id = new.user_id and local_day = new.local_day) >= 3 then
    raise exception 'Ya has registrado tus tres acciones de hoy';
  end if;
  if new.visibility = 'groups' and not (new.group_ids <@ my_group_ids()) then
    raise exception 'Solo puedes compartir en tus grupos';
  end if;
  new.created_at := now();
  return new;
end $$;
drop trigger if exists actions_daily_limit on public.actions;
create trigger actions_daily_limit before insert on public.actions for each row execute function public.enforce_daily_limit();

-- Seguir a un perfil privado crea una solicitud pendiente.
create or replace function public.set_follow_status() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.status := case when exists(select 1 from profiles where id = new.following_id and is_public) then 'accepted' else 'pending' end;
  return new;
end $$;
drop trigger if exists follows_status on public.follows;
create trigger follows_status before insert on public.follows for each row execute function public.set_follow_status();

-- Quien crea un grupo es su administrador.
create or replace function public.add_group_creator() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into group_members (group_id, user_id, role) values (new.id, new.created_by, 'admin');
  return new;
end $$;
drop trigger if exists groups_creator on public.groups;
create trigger groups_creator after insert on public.groups for each row execute function public.add_group_creator();

-- Unirse por código de invitación.
create or replace function public.join_group(code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare g uuid;
begin
  select id into g from groups where invite_code = upper(trim(code));
  if g is null then raise exception 'No encontramos ningún grupo con ese código'; end if;
  insert into group_members (group_id, user_id) values (g, auth.uid()) on conflict do nothing;
  return g;
end $$;

-- Actividad agregada (sin contenido) de los miembros de mis grupos, para rachas y métricas colectivas.
create or replace function public.group_activity(since date)
returns table (group_id uuid, user_id uuid, day date, count int, pillars text[], rest boolean)
language sql stable security definer set search_path = public as $$
  with mine as (select unnest(my_group_ids()) as gid),
  acts as (
    select m.group_id, a.user_id, a.local_day as day, count(*)::int as count, array_agg(distinct a.pillar) as pillars
    from actions a join group_members m on m.user_id = a.user_id
    where m.group_id in (select gid from mine) and a.local_day >= since
    group by 1, 2, 3
  ),
  rests as (
    select m.group_id, r.user_id, r.day from rest_days r join group_members m on m.user_id = r.user_id
    where m.group_id in (select gid from mine) and r.day >= since
  )
  select coalesce(a.group_id, r.group_id), coalesce(a.user_id, r.user_id), coalesce(a.day, r.day),
         coalesce(a.count, 0), coalesce(a.pillars, '{}'), r.day is not null
  from acts a full join rests r on a.group_id = r.group_id and a.user_id = r.user_id and a.day = r.day;
$$;

-- Supresión de cuenta (RGPD). Las fotos de Storage se borran desde el cliente antes de llamar.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  delete from auth.users where id = auth.uid();
end $$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.actions enable row level security;
alter table public.action_private enable row level security;
alter table public.follows enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.reactions enable row level security;
alter table public.comments enable row level security;
alter table public.goals enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.journal_entries enable row level security;
alter table public.rest_days enable row level security;
alter table public.user_settings enable row level security;

-- Perfiles: los datos básicos son visibles para buscar y seguir; solo tú editas el tuyo.
create policy profiles_read on public.profiles for select to authenticated using (true);
create policy profiles_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Acciones: tuyas, públicas de perfiles visibles, o compartidas con un grupo tuyo.
create policy actions_read on public.actions for select to authenticated using (
  user_id = auth.uid()
  or (visibility = 'public' and public.can_see_profile_content(user_id))
  or (visibility = 'groups' and group_ids && public.my_group_ids())
);
create policy actions_insert on public.actions for insert to authenticated with check (user_id = auth.uid());
create policy actions_update on public.actions for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy actions_delete on public.actions for delete to authenticated using (user_id = auth.uid());

-- Emoción y reflexión: privadas siempre.
create policy private_all on public.action_private for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Seguidores.
create policy follows_read on public.follows for select to authenticated
  using (status = 'accepted' or follower_id = auth.uid() or following_id = auth.uid());
create policy follows_insert on public.follows for insert to authenticated with check (follower_id = auth.uid());
create policy follows_accept on public.follows for update to authenticated using (following_id = auth.uid()) with check (following_id = auth.uid());
create policy follows_delete on public.follows for delete to authenticated using (follower_id = auth.uid() or following_id = auth.uid());

-- Grupos: privados, solo para sus miembros.
create policy groups_read on public.groups for select to authenticated using (id = any(public.my_group_ids()) or created_by = auth.uid());
create policy groups_insert on public.groups for insert to authenticated with check (created_by = auth.uid());
create policy groups_update on public.groups for update to authenticated using (public.is_group_admin(id));
create policy groups_delete on public.groups for delete to authenticated using (public.is_group_admin(id));

create policy members_read on public.group_members for select to authenticated using (group_id = any(public.my_group_ids()));
create policy members_update_self on public.group_members for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy members_leave on public.group_members for delete to authenticated using (user_id = auth.uid() or public.is_group_admin(group_id));

-- Reacciones y comentarios: solo sobre acciones que puedes ver (la subconsulta respeta la RLS de actions).
create policy reactions_read on public.reactions for select to authenticated using (exists(select 1 from public.actions a where a.id = action_id));
create policy reactions_insert on public.reactions for insert to authenticated with check (user_id = auth.uid() and exists(select 1 from public.actions a where a.id = action_id));
create policy reactions_delete on public.reactions for delete to authenticated using (user_id = auth.uid());

create policy comments_read on public.comments for select to authenticated using (exists(select 1 from public.actions a where a.id = action_id));
create policy comments_insert on public.comments for insert to authenticated with check (
  user_id = auth.uid() and exists(select 1 from public.actions a where a.id = action_id and a.allow_comments)
);
create policy comments_delete on public.comments for delete to authenticated using (
  user_id = auth.uid() or exists(select 1 from public.actions a where a.id = action_id and a.user_id = auth.uid())
);

-- Datos estrictamente personales.
create policy goals_own on public.goals for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy lessons_own on public.lesson_progress for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy journal_own on public.journal_entries for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy rest_own on public.rest_days for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy settings_own on public.user_settings for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Storage: bucket privado "photos". Ruta: <user_id>/<archivo>.jpg
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public) values ('photos', 'photos', false) on conflict do nothing;

create policy photos_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy photos_read on storage.objects for select to authenticated using (
  bucket_id = 'photos' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists(select 1 from public.actions a where a.photo = name)          -- respeta la RLS de actions
    or exists(select 1 from public.profiles p where p.avatar = name)
    or exists(select 1 from public.groups g where g.image = name)
  )
);
