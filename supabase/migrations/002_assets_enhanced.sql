-- ============================================================
-- AC-COS: Enhanced Asset Discovery Schema
-- Migration 002 — Run in Supabase SQL Editor
-- ============================================================

-- Drop old simple assets table if exists, recreate full version
drop table if exists public.assets cascade;

-- ── assets ────────────────────────────────────────────────────
create table public.assets (
  id              uuid default gen_random_uuid() primary key,
  user_id         uuid references auth.users(id) on delete cascade,

  -- Identity
  hostname        text not null,
  ip_address      text,
  mac_address     text,
  fqdn            text,

  -- Classification
  asset_type      text check (asset_type in ('server','endpoint','network','database','cloud','iot','unknown')) default 'unknown',
  os_name         text,
  os_version      text,
  os_arch         text default 'x86_64',
  manufacturer    text,
  model           text,

  -- Ownership
  owner_name      text,
  owner_email     text,
  department      text,
  ad_group        text,
  location        text,

  -- Network
  open_ports      jsonb default '[]',   -- [{port: 22, service: "ssh", state: "open"}]
  services        jsonb default '[]',   -- [{name: "nginx", version: "1.24", status: "running"}]
  subnet          text,

  -- Risk
  risk_score      float default 0 check (risk_score >= 0 and risk_score <= 100),
  risk_factors    jsonb default '{}',   -- {open_ports: 20, os_age: 15, privilege: 30, ...}
  vuln_count      int default 0,

  -- Discovery
  discovery_method text check (discovery_method in ('agent','snmp','ping','arp','dns','manual')) default 'manual',
  last_seen       timestamptz default now(),
  first_seen      timestamptz default now(),
  uptime_seconds  bigint,

  -- Status
  status          text check (status in ('active','inactive','critical','warning','unknown')) default 'unknown',
  is_managed      boolean default false,
  agent_version   text,

  -- Metadata
  tags            text[] default '{}',
  raw_data        jsonb default '{}',
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Indexes
create index idx_assets_user_id on public.assets(user_id);
create index idx_assets_ip on public.assets(ip_address);
create index idx_assets_status on public.assets(status);
create index idx_assets_risk on public.assets(risk_score desc);
create index idx_assets_last_seen on public.assets(last_seen desc);

-- RLS
alter table public.assets enable row level security;

create policy "Users can view own assets"
  on public.assets for select using (auth.uid() = user_id);

create policy "Users can insert own assets"
  on public.assets for insert with check (auth.uid() = user_id);

create policy "Users can update own assets"
  on public.assets for update using (auth.uid() = user_id);

create policy "Users can delete own assets"
  on public.assets for delete using (auth.uid() = user_id);

-- Enable Realtime
alter publication supabase_realtime add table public.assets;

-- ── asset_scans ───────────────────────────────────────────────
create table public.asset_scans (
  id              uuid default gen_random_uuid() primary key,
  user_id         uuid references auth.users(id) on delete cascade,
  scan_type       text check (scan_type in ('full','quick','targeted','agent_sync')) default 'quick',
  status          text check (status in ('running','completed','failed','cancelled')) default 'running',
  target_subnet   text,
  started_at      timestamptz default now(),
  completed_at    timestamptz,
  assets_found    int default 0,
  assets_new      int default 0,
  assets_updated  int default 0,
  progress        int default 0 check (progress >= 0 and progress <= 100),
  log_entries     jsonb default '[]',  -- [{time, message, level}]
  triggered_by    text default 'manual',
  created_at      timestamptz default now()
);

create index idx_scans_user_id on public.asset_scans(user_id);
create index idx_scans_status on public.asset_scans(status);

alter table public.asset_scans enable row level security;

create policy "Users can view own scans"
  on public.asset_scans for select using (auth.uid() = user_id);

create policy "Users can insert own scans"
  on public.asset_scans for insert with check (auth.uid() = user_id);

create policy "Users can update own scans"
  on public.asset_scans for update using (auth.uid() = user_id);

-- Enable Realtime for scans too
alter publication supabase_realtime add table public.asset_scans;

-- ── asset_alerts link ─────────────────────────────────────────
-- Add asset_id to alerts if table exists
alter table public.alerts add column if not exists asset_id uuid references public.assets(id) on delete set null;

-- ── updated_at trigger ───────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger assets_updated_at
  before update on public.assets
  for each row execute procedure public.set_updated_at();
