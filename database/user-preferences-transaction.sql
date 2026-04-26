create or replace function public.replace_user_preferences(
  p_user_id bigint,
  p_dietary_requirements bigint[],
  p_allergies bigint[],
  p_cuisines bigint[],
  p_dislikes bigint[],
  p_health_conditions bigint[],
  p_spice_levels bigint[],
  p_cooking_methods bigint[]
)
returns void
language plpgsql
as $$
begin
  delete from public.user_dietary_requirements where user_id = p_user_id;
  delete from public.user_allergies where user_id = p_user_id;
  delete from public.user_cuisines where user_id = p_user_id;
  delete from public.user_dislikes where user_id = p_user_id;
  delete from public.user_health_conditions where user_id = p_user_id;
  delete from public.user_spice_levels where user_id = p_user_id;
  delete from public.user_cooking_methods where user_id = p_user_id;

  insert into public.user_dietary_requirements (user_id, dietary_requirement_id)
  select p_user_id, value
  from (
    select distinct unnest(coalesce(p_dietary_requirements, '{}'::bigint[])) as value
  ) deduped
  where value > 0;

  insert into public.user_allergies (user_id, allergy_id)
  select p_user_id, value
  from (
    select distinct unnest(coalesce(p_allergies, '{}'::bigint[])) as value
  ) deduped
  where value > 0;

  insert into public.user_cuisines (user_id, cuisine_id)
  select p_user_id, value
  from (
    select distinct unnest(coalesce(p_cuisines, '{}'::bigint[])) as value
  ) deduped
  where value > 0;

  insert into public.user_dislikes (user_id, dislike_id)
  select p_user_id, value
  from (
    select distinct unnest(coalesce(p_dislikes, '{}'::bigint[])) as value
  ) deduped
  where value > 0;

  insert into public.user_health_conditions (user_id, health_condition_id)
  select p_user_id, value
  from (
    select distinct unnest(coalesce(p_health_conditions, '{}'::bigint[])) as value
  ) deduped
  where value > 0;

  insert into public.user_spice_levels (user_id, spice_level_id)
  select p_user_id, value
  from (
    select distinct unnest(coalesce(p_spice_levels, '{}'::bigint[])) as value
  ) deduped
  where value > 0;

  insert into public.user_cooking_methods (user_id, cooking_method_id)
  select p_user_id, value
  from (
    select distinct unnest(coalesce(p_cooking_methods, '{}'::bigint[])) as value
  ) deduped
  where value > 0;
end;
$$;
