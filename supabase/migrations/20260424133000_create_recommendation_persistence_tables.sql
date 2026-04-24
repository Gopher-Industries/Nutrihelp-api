create extension if not exists pgcrypto;

create table if not exists public.recommendation_lists (
  id uuid primary key default gen_random_uuid(),
  user_id bigint not null,
  request_fingerprint text,
  cache_key text,
  contract_version text not null,
  source_strategy text,
  ai_source text,
  ai_version text,
  generated_at timestamptz not null default timezone('utc', now()),
  max_results integer,
  input jsonb not null default '{}'::jsonb,
  user_context jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.recommendations (
  id uuid primary key default gen_random_uuid(),
  recommendation_list_id uuid not null references public.recommendation_lists(id) on delete cascade,
  user_id bigint not null,
  recipe_id bigint not null,
  rank integer not null,
  title text,
  score numeric,
  explanation text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.recommendation_results (
  id uuid primary key default gen_random_uuid(),
  recommendation_list_id uuid not null references public.recommendation_lists(id) on delete cascade,
  recipe_id bigint not null,
  rank integer not null,
  title text,
  score numeric,
  explanation text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id bigint not null,
  recommendation_id uuid references public.recommendations(id) on delete cascade,
  recommendation_list_id uuid not null references public.recommendation_lists(id) on delete cascade,
  recipe_id bigint not null,
  rank integer not null,
  status text not null default 'generated',
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.recommendation_history (
  id uuid primary key default gen_random_uuid(),
  user_id bigint not null,
  recommendation_list_id uuid not null references public.recommendation_lists(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists recommendation_lists_user_id_idx
  on public.recommendation_lists (user_id, generated_at desc);

create index if not exists recommendations_user_id_idx
  on public.recommendations (user_id, created_at desc);

create index if not exists recommendations_list_id_idx
  on public.recommendations (recommendation_list_id, rank);

create index if not exists recommendation_results_list_id_idx
  on public.recommendation_results (recommendation_list_id, rank);

create index if not exists user_recommendations_user_id_idx
  on public.user_recommendations (user_id, created_at desc);

create index if not exists user_recommendations_list_id_idx
  on public.user_recommendations (recommendation_list_id, rank);

create index if not exists recommendation_history_user_id_idx
  on public.recommendation_history (user_id, created_at desc);
