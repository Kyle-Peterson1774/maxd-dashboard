-- ============================================================
-- MAXD DASHBOARD — Supabase Migration
-- Run this in: Supabase Dashboard → SQL Editor → New Query
--
-- What this does:
--   1. Creates organizations, org_members, org_credentials,
--      and org_data tables
--   2. Enables Row Level Security on all tables so each
--      organization's data is fully isolated
--   3. Adds triggers to auto-create org membership when a
--      new org is created, and to activate pending invites
--      when an invited user signs up
-- ============================================================


-- ── 1. Tables ─────────────────────────────────────────────────────────────────

create table if not exists public.organizations (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null,
  owner_id   uuid        references auth.users(id) on delete set null,
  plan       text        not null default 'free',
  created_at timestamptz not null default now()
);

-- Members / invited users with their role and exact page permissions
create table if not exists public.org_members (
  id         uuid        primary key default gen_random_uuid(),
  org_id     uuid        not null references public.organizations(id) on delete cascade,
  user_id    uuid        references auth.users(id) on delete cascade,
  email      text        not null,
  name       text,
  role       text        not null default 'content',  -- admin | content | marketing | ops | custom
  pages      text[]      not null default '{}',       -- exact pages this member can access
  status     text        not null default 'invited',  -- invited | active
  created_at timestamptz not null default now(),
  unique(org_id, email)
);

-- Integration credentials (Shopify, Klaviyo, Meta Ads, etc.)
-- Stored server-side and protected by RLS — never in the browser
create table if not exists public.org_credentials (
  id         uuid        primary key default gen_random_uuid(),
  org_id     uuid        not null references public.organizations(id) on delete cascade,
  service    text        not null,
  data       jsonb       not null default '{}',
  updated_at timestamptz not null default now(),
  unique(org_id, service)
);

-- General key/value app data (scripts, content items, queue, etc.)
create table if not exists public.org_data (
  id         uuid        primary key default gen_random_uuid(),
  org_id     uuid        not null references public.organizations(id) on delete cascade,
  key        text        not null,
  value      jsonb,
  updated_at timestamptz not null default now(),
  unique(org_id, key)
);


-- ── 2. Row Level Security ──────────────────────────────────────────────────────

alter table public.organizations    enable row level security;
alter table public.org_members      enable row level security;
alter table public.org_credentials  enable row level security;
alter table public.org_data         enable row level security;


-- ── organizations policies ────────────────────────────────────────────────────

-- Owner has full control over their org
create policy "org owner full access"
  on public.organizations for all
  using     (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Active members can view their org details
create policy "org members can view org"
  on public.organizations for select
  using (
    id in (
      select org_id from public.org_members
      where user_id = auth.uid() and status = 'active'
    )
  );

-- Any authenticated user can create a new org (first-time signup)
create policy "authenticated users can create org"
  on public.organizations for insert
  with check (owner_id = auth.uid());


-- ── org_members policies ──────────────────────────────────────────────────────

-- Admins can fully manage their org's member list
create policy "org admins can manage members"
  on public.org_members for all
  using (
    org_id in (
      select org_id from public.org_members
      where user_id = auth.uid() and role = 'admin' and status = 'active'
    )
  )
  with check (
    org_id in (
      select org_id from public.org_members
      where user_id = auth.uid() and role = 'admin' and status = 'active'
    )
  );

-- All active members can view who else is in their org
create policy "org members can view team"
  on public.org_members for select
  using (
    org_id in (
      select org_id from public.org_members
      where user_id = auth.uid() and status = 'active'
    )
  );


-- ── org_credentials policies ──────────────────────────────────────────────────

-- Only admins can save or delete credentials
create policy "org admins can manage credentials"
  on public.org_credentials for all
  using (
    org_id in (
      select org_id from public.org_members
      where user_id = auth.uid() and role = 'admin' and status = 'active'
    )
  )
  with check (
    org_id in (
      select org_id from public.org_members
      where user_id = auth.uid() and role = 'admin' and status = 'active'
    )
  );

-- All active members can read credentials (needed to make API calls)
create policy "org members can read credentials"
  on public.org_credentials for select
  using (
    org_id in (
      select org_id from public.org_members
      where user_id = auth.uid() and status = 'active'
    )
  );


-- ── org_data policies ─────────────────────────────────────────────────────────

-- All active members can read and write app data for their org
create policy "org members can access data"
  on public.org_data for all
  using (
    org_id in (
      select org_id from public.org_members
      where user_id = auth.uid() and status = 'active'
    )
  )
  with check (
    org_id in (
      select org_id from public.org_members
      where user_id = auth.uid() and status = 'active'
    )
  );


-- ── 3. Triggers ───────────────────────────────────────────────────────────────

-- When a new org is created, automatically add the owner as an admin member
create or replace function public.handle_new_org()
returns trigger language plpgsql security definer as $$
begin
  insert into public.org_members (org_id, user_id, email, name, role, pages, status)
  select
    new.id,
    new.owner_id,
    u.email,
    coalesce(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)),
    'admin',
    array[
      'dashboard','social','scripts','content','launches','ads',
      'products','analytics','sales','marketing','finance',
      'operations','ai','queue','settings'
    ],
    'active'
  from auth.users u
  where u.id = new.owner_id;
  return new;
end;
$$;

drop trigger if exists on_org_created on public.organizations;
create trigger on_org_created
  after insert on public.organizations
  for each row execute procedure public.handle_new_org();


-- When an invited user signs up, activate their pending invite automatically
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  update public.org_members
  set user_id = new.id, status = 'active'
  where email = new.email
    and status = 'invited'
    and user_id is null;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
