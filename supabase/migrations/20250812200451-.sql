-- Harden policies to authenticated users and fix function search_path

-- Replace templates SELECT policy
drop policy if exists "Anyone can view templates" on public.templates;
create policy "Authenticated can view templates"
  on public.templates for select
  using (auth.role() = 'authenticated');

-- Replace template_events policies
drop policy if exists "Anyone can insert template events" on public.template_events;
drop policy if exists "Anyone can view template events" on public.template_events;
create policy "Authenticated can insert template events"
  on public.template_events for insert
  with check (auth.role() = 'authenticated');
create policy "Authenticated can view template events"
  on public.template_events for select
  using (auth.role() = 'authenticated');

-- Recreate touch_updated_at with explicit search_path
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path to ''
as $$
begin 
  new.updated_at = now(); 
  return new; 
end; 
$$;