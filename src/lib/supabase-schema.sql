-- Run this in your Supabase SQL editor

-- Sessions table
create table sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  day_index integer not null,
  day_title text not null,
  session_date date not null,
  notes text default '',
  joints jsonb default '{}',
  exercises jsonb default '[]',
  created_at timestamptz default now()
);

-- Weigh-ins table
create table weigh_ins (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  weigh_date date not null,
  weight_lbs numeric(5,1) not null,
  created_at timestamptz default now()
);

-- Schedule table
create table schedule (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  day_index integer not null,
  day_title text not null,
  weekday integer,
  time text default '09:00',
  enabled boolean default false,
  created_at timestamptz default now(),
  unique(user_id, day_index)
);

-- Row level security (users can only see their own data)
alter table sessions enable row level security;
alter table weigh_ins enable row level security;
alter table schedule enable row level security;

create policy "Users own sessions" on sessions for all using (auth.uid() = user_id);
create policy "Users own weigh_ins" on weigh_ins for all using (auth.uid() = user_id);
create policy "Users own schedule" on schedule for all using (auth.uid() = user_id);
