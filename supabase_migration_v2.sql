-- ============================================================
-- MAXD DASHBOARD — Migration v2
-- Run this in: Supabase Dashboard → SQL Editor → New Query
--
-- Adds manager-level access control:
--   - can_manage column on org_members lets non-admin members
--     invite their own team and grant access within their
--     own page permissions (but never beyond them)
-- ============================================================

-- Add manager flag to org_members
alter table public.org_members
  add column if not exists can_manage boolean not null default false;

-- Update the trigger so the org owner gets can_manage = true by default
create or replace function public.handle_new_org()
returns trigger language plpgsql security definer as $$
begin
  insert into public.org_members (org_id, user_id, email, name, role, pages, status, can_manage)
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
    'active',
    true
  from auth.users u
  where u.id = new.owner_id;
  return new;
end;
$$;
