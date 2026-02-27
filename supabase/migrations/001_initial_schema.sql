-- AC-COS NeuralNexus Schema
-- Run this in your Supabase SQL Editor

-- Profiles table (extends auth.users)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  organization text,
  role text default 'analyst',
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable Row Level Security
alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Alerts table
create table if not exists public.alerts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  severity text check (severity in ('critical','high','medium','low')) not null,
  category text,
  source_ip text,
  destination_ip text,
  status text check (status in ('open','investigating','resolved','false_positive')) default 'open',
  confidence_score float,
  description text,
  created_at timestamptz default now()
);

alter table public.alerts enable row level security;
create policy "Users can view own alerts" on public.alerts for select using (auth.uid() = user_id);

-- Assets table
create table if not exists public.assets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  hostname text not null,
  ip_address text,
  asset_type text,
  os text,
  risk_score float default 0,
  last_seen timestamptz default now(),
  status text default 'active',
  created_at timestamptz default now()
);

alter table public.assets enable row level security;
create policy "Users can view own assets" on public.assets for select using (auth.uid() = user_id);
