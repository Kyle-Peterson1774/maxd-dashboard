-- ============================================================
-- MAXD DASHBOARD — Plaid Bank Feed Migration
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- Run AFTER supabase_migration.sql (requires organizations table)
--
-- Tables:
--   plaid_items        — one record per connected bank/institution
--   plaid_accounts     — individual checking/savings/credit accounts
--   plaid_transactions — imported bank transactions
-- ============================================================


-- ── 1. Tables ─────────────────────────────────────────────────────────────────

-- One Plaid "item" per institution connection (e.g. "Chase" is one item,
-- containing a checking account + savings account as two plaid_accounts)
create table if not exists public.plaid_items (
  id               uuid        primary key default gen_random_uuid(),
  org_id           uuid        not null references public.organizations(id) on delete cascade,
  item_id          text        unique not null,
  access_token     text        not null,
  institution_id   text,
  institution_name text,
  cursor           text,       -- Plaid /transactions/sync cursor (stored per item)
  created_at       timestamptz not null default now()
);

-- Individual bank accounts within each item
create table if not exists public.plaid_accounts (
  id                uuid        primary key default gen_random_uuid(),
  org_id            uuid        not null references public.organizations(id) on delete cascade,
  item_id           text        not null references public.plaid_items(item_id) on delete cascade,
  account_id        text        unique not null,
  name              text,
  official_name     text,
  type              text,       -- depository | credit | investment | loan
  subtype           text,       -- checking | savings | credit card | money market
  mask              text,       -- last 4 digits
  current_balance   numeric,
  available_balance numeric,
  currency_code     text        not null default 'USD',
  last_synced_at    timestamptz,
  created_at        timestamptz not null default now()
);

-- Transactions pulled from Plaid
create table if not exists public.plaid_transactions (
  id              uuid        primary key default gen_random_uuid(),
  org_id          uuid        not null references public.organizations(id) on delete cascade,
  account_id      text        not null references public.plaid_accounts(account_id) on delete cascade,
  transaction_id  text        unique not null,
  date            date        not null,
  name            text,
  merchant_name   text,
  amount          numeric     not null, -- Plaid convention: positive = money OUT (expense), negative = money IN
  category_ai     text,                 -- our AI-assigned category
  plaid_category  text[],              -- Plaid's raw categories
  pending         boolean     not null default false,
  notes           text,
  created_at      timestamptz not null default now()
);


-- ── 2. Row Level Security ──────────────────────────────────────────────────────

alter table public.plaid_items        enable row level security;
alter table public.plaid_accounts     enable row level security;
alter table public.plaid_transactions enable row level security;


-- ── plaid_items ────────────────────────────────────────────────────────────────

-- Active members can read (needed to show account names)
create policy "members read plaid_items"
  on public.plaid_items for select
  using (
    org_id in (
      select org_id from public.org_members
      where user_id = auth.uid() and status = 'active'
    )
  );

-- Only admins can add/remove bank connections
create policy "admins manage plaid_items"
  on public.plaid_items for all
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


-- ── plaid_accounts ─────────────────────────────────────────────────────────────

create policy "members read plaid_accounts"
  on public.plaid_accounts for select
  using (
    org_id in (
      select org_id from public.org_members
      where user_id = auth.uid() and status = 'active'
    )
  );

create policy "admins manage plaid_accounts"
  on public.plaid_accounts for all
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


-- ── plaid_transactions ─────────────────────────────────────────────────────────

-- All members can read transactions and update notes/category
create policy "members read plaid_transactions"
  on public.plaid_transactions for select
  using (
    org_id in (
      select org_id from public.org_members
      where user_id = auth.uid() and status = 'active'
    )
  );

create policy "members update plaid_transactions"
  on public.plaid_transactions for update
  using (
    org_id in (
      select org_id from public.org_members
      where user_id = auth.uid() and status = 'active'
    )
  );

create policy "admins manage plaid_transactions"
  on public.plaid_transactions for all
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
