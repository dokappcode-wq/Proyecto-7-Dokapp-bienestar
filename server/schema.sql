-- Esquema del servidor propio de Dokapp (Postgres 13+). Se aplica al arrancar; es idempotente.

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  pass_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists sessions (
  token text primary key,
  user_id uuid not null references users on delete cascade,
  expires_at timestamptz not null
);
create index if not exists sessions_user on sessions (user_id);

create table if not exists profiles (
  id uuid primary key references users on delete cascade,
  username text unique not null,
  name text not null default '',
  bio text not null default '',
  avatar text not null default '',
  is_public boolean not null default false,
  interests text[] not null default '{}',
  onboarded boolean not null default false,
  share_metrics_with_groups boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users on delete cascade,
  mime text not null,
  data bytea not null,
  created_at timestamptz not null default now()
);

create table if not exists actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users on delete cascade,
  photo text not null,
  pillar text not null,
  description text not null default '',
  emotion text,
  reflection text not null default '',
  share_emotion boolean not null default false,
  visibility text not null check (visibility in ('public','groups','private')),
  group_ids uuid[] not null default '{}',
  allow_comments boolean not null default true,
  local_day date not null,
  created_at timestamptz not null default now(),
  original_taken_at timestamptz
);
create index if not exists actions_user_day on actions (user_id, local_day);
create index if not exists actions_created on actions (created_at desc);

create table if not exists follows (
  follower_id uuid not null references users on delete cascade,
  following_id uuid not null references users on delete cascade,
  status text not null check (status in ('pending','accepted')),
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id)
);

create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  image text not null default '',
  invite_code text unique not null,
  created_by uuid references users on delete set null,
  weekly_goal int not null default 20,
  rest_weekdays int[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists group_members (
  group_id uuid not null references groups on delete cascade,
  user_id uuid not null references users on delete cascade,
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  pause_from date,
  pause_until date,
  pause_reason text not null default '',
  share_metrics boolean not null default false,
  primary key (group_id, user_id)
);

create table if not exists reactions (
  action_id uuid not null references actions on delete cascade,
  user_id uuid not null references users on delete cascade,
  created_at timestamptz not null default now(),
  primary key (action_id, user_id)
);

create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  action_id uuid not null references actions on delete cascade,
  user_id uuid not null references users on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

create table if not exists goals (
  id uuid primary key,
  user_id uuid not null references users on delete cascade,
  title text not null,
  pillar text not null,
  target int not null,
  frequency text not null,
  start_date date not null,
  end_date date,
  checkins date[] not null default '{}',
  archived boolean not null default false
);

create table if not exists lesson_progress (
  user_id uuid not null references users on delete cascade,
  lesson_id text not null,
  xp int not null,
  score real not null,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table if not exists journal_entries (
  id uuid primary key,
  user_id uuid not null references users on delete cascade,
  prompt text not null,
  text text not null,
  pillar text not null,
  created_at timestamptz not null default now()
);

create table if not exists rest_days (
  user_id uuid not null references users on delete cascade,
  day date not null,
  reason text not null default '',
  primary key (user_id, day)
);

create table if not exists user_settings (
  user_id uuid primary key references users on delete cascade,
  settings jsonb not null
);
