create table if not exists public.wearable_device_data (
  id bigint generated always as identity primary key,
  user_id bigint not null references public.users(user_id) on delete cascade,
  source text not null,
  device_id text null,
  device_name text null,
  metric_type text not null,
  metric_value numeric not null,
  metric_unit text not null,
  recorded_at timestamptz not null,
  received_at timestamptz not null default now(),
  timezone text null,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_wearable_device_data_user_recorded_at
  on public.wearable_device_data(user_id, recorded_at desc);

create index if not exists idx_wearable_device_data_metric_type
  on public.wearable_device_data(metric_type);
