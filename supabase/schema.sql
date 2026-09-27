create table if not exists public.clinic_workspaces (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.clinic_workspaces enable row level security;

revoke all on public.clinic_workspaces from anon;
grant select, insert, update on public.clinic_workspaces to authenticated;

drop policy if exists "Users read their own clinic workspace" on public.clinic_workspaces;
create policy "Users read their own clinic workspace"
  on public.clinic_workspaces for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users create their own clinic workspace" on public.clinic_workspaces;
create policy "Users create their own clinic workspace"
  on public.clinic_workspaces for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users update their own clinic workspace" on public.clinic_workspaces;
create policy "Users update their own clinic workspace"
  on public.clinic_workspaces for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);