create table if not exists public.user_preference_states (
  user_id bigint primary key references public.users(user_id) on delete cascade,
  health_context jsonb not null default '{"allergies":[],"chronic_conditions":[],"medications":[]}'::jsonb,
  notification_preferences jsonb not null default '{}'::jsonb,
  ui_settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.set_user_preference_states_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_user_preference_states_updated_at on public.user_preference_states;

create trigger trg_user_preference_states_updated_at
before update on public.user_preference_states
for each row
execute function public.set_user_preference_states_updated_at();
