-- ============================================================
-- MAXD Dashboard — Supabase Setup
-- Run this once in your Supabase SQL Editor:
--   supabase.com → your project → SQL Editor → New query
-- ============================================================

-- Main data store table (key-value, mirrors localStorage)
create table if not exists app_data (
  key         text        primary key,
  value       jsonb       not null default '[]'::jsonb,
  updated_at  timestamptz not null default now()
);

-- This is a private internal tool — disable RLS for simplicity.
-- If you ever want per-user security, remove this line and add policies.
alter table app_data disable row level security;

-- That's it! Go back to Settings → Integrations → Supabase in your dashboard.
