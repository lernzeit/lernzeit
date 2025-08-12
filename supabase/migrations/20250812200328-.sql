-- 1) templates (Vorlagenbank)
create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  status text not null default 'ACTIVE' check (status in ('DRAFT','ACTIVE','COOLDOWN','ARCHIVED','REJECTED')),
  grade int not null,
  grade_app int not null,
  quarter_app text not null check (quarter_app in ('Q1','Q2','Q3','Q4')),
  domain text not null,
  subcategory text not null,
  difficulty text not null check (difficulty in ('AFB I','AFB II','AFB III')),
  question_type text not null,
  student_prompt text not null,
  variables jsonb not null default '{}'::jsonb,
  solution jsonb,
  unit text,
  distractors jsonb,
  explanation_teacher text,
  source_skill_id text,
  tags text[] not null default '{}',
  seed int,
  plays int not null default 0,
  correct int not null default 0,
  rating_sum int not null default 0,
  rating_count int not null default 0
);

-- Enable RLS and policies for templates
alter table public.templates enable row level security;
-- Allow public read access (clients can fetch templates)
create policy if not exists "Anyone can view templates"
  on public.templates for select
  using (true);
-- No insert/update/delete policies: only service role can mutate

-- Useful indexes for querying
create index if not exists idx_templates_lookup
  on public.templates (status, grade_app, domain, subcategory, difficulty);
create index if not exists idx_templates_created_at
  on public.templates (created_at);
create index if not exists idx_templates_tags_gin
  on public.templates using gin (tags);

-- 2) template_events (Logging: Play, Correct, Rating, etc.)
create table if not exists public.template_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  template_id uuid references public.templates(id) on delete cascade,
  type text not null check (type in ('PLAY','CORRECT','INCORRECT','RATING','FLAG')),
  payload jsonb
);

-- Enable RLS and basic policies for events
alter table public.template_events enable row level security;
-- Allow clients to log events and read them for analytics; adjust later if needed
create policy if not exists "Anyone can insert template events"
  on public.template_events for insert
  with check (true);
create policy if not exists "Anyone can view template events"
  on public.template_events for select
  using (true);

-- Indexes for events
create index if not exists idx_template_events_template_type
  on public.template_events (template_id, type);

-- 3) Score-View
create or replace view public.template_scores as
select
  t.*,
  case when (t.plays + 10)=0 then 0 else (t.correct::float + 5) / (t.plays + 10) end as correct_rate_bayes,
  case when (t.rating_count + 5)=0 then 0 else (t.rating_sum::float + 15) / (5*(t.rating_count + 5)) end as rating_norm_bayes,
  greatest(0.0, 1.0 - (t.plays::float / 100.0)) as novelty,
  (0.6*coalesce((t.correct::float + 5)/(t.plays + 10),0) + 0.3*coalesce((t.rating_sum::float + 15)/(5*(t.rating_count + 5)),0) + 0.1*greatest(0.0, 1.0 - (t.plays::float / 100.0))) as qscore
from public.templates t;

-- 4) Trigger updated_at
create or replace function public.touch_updated_at() returns trigger as $$
begin 
  new.updated_at = now(); 
  return new; 
end; $$ language plpgsql;

drop trigger if exists trg_templates_touch on public.templates;
create trigger trg_templates_touch before update on public.templates
for each row execute procedure public.touch_updated_at();