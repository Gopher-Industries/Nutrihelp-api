# User Preferences Schema Assessment

## Scope

This note reviews the new `database/user-preference-states.sql` addition against the current live Supabase schema and the code in branch `BE19-structured-health-preferences-settings-data-enrichment-layer`.

It answers two questions:

1. Where does preference-related data already live today?
2. What is the lowest-risk source-of-truth design for the new structured preferences feature?

## Live Supabase Snapshot

Checked against the current Supabase project using the service role key on 2026-04-17.

Confirmed existing tables:

- `users`
- `user_preferences`
- `user_profiles`
- `user_health_conditions`
- `user_allergies`
- `user_dietary_requirements`
- `user_dislikes`
- `user_cooking_methods`
- `user_spice_levels`
- `health_conditions`
- `health_conditions_new`
- `allergies`
- `dietary_requirements`

Confirmed missing table:

- `user_preference_states`

## Current Data Map

### Identity Anchors

There are already multiple user identity shapes in the schema:

| Table | User key shape | Notes |
| --- | --- | --- |
| `users` | `user_id bigint` | This is the user table used by the Node API and auth flows in this repo. |
| `user_profiles` | `id uuid`, `user_id uuid` | Separate identity model from `users.user_id bigint`. |
| `user_security_settings` | `user_id uuid` | Appears to align with the UUID-based profile/security subsystem, not the bigint `users` table. |

Implication:

- The new `user_preference_states.user_id bigint references users(user_id)` aligns with the existing backend code.
- It does **not** align with the UUID-based `user_profiles` / `user_security_settings` subsystem.
- Any proposal must avoid assuming these two user domains are interchangeable.

### Preference / Settings Data by Table

| Concern | Existing location(s) | Shape today | Assessment |
| --- | --- | --- | --- |
| Dietary requirements | `user_dietary_requirements` | Join table to `dietary_requirements(id, name)` | Good normalized source for backend filtering and recommendation logic. |
| Allergies | `user_allergies` | Join table to `allergies(id, name)` plus encrypted fields | Good normalized source for canonical allergy membership. |
| Health conditions | `user_health_conditions` | Join table to `health_conditions` | Good normalized source for canonical condition membership. |
| Dislikes | `user_dislikes` | Join table to dislike catalog | Good normalized source for canonical dislikes. |
| Cooking methods | `user_cooking_methods` | Join table | Good normalized source. |
| Spice levels | `user_spice_levels` | Join table | Good normalized source. |
| Basic UI settings | `users.theme`, `users.language`, `users.font_size` | Flat columns | Already exists and overlaps with `ui_settings` in the new table. |
| Notification settings | `users.notification_preferences`, `users.notification_email`, `users.notification_push` | Flat JSON / booleans | Already exists and overlaps with `notification_preferences` in the new table. |
| Legacy personal preference profile | `user_preferences` | Flat demographic and preference columns like `dietary_preference`, `health_goals` | Older broad table, partially overlaps conceptually but not structurally. |
| UUID-side profile preferences | `user_profiles.dietary_preferences`, `user_profiles.allergies`, `user_profiles.medical_conditions` | Profile-level denormalized fields | Overlaps semantically, but belongs to a different identity model. |
| New structured clinical context | Proposed `user_preference_states.health_context` | JSONB for allergy metadata, chronic condition metadata, medications | New capability not well modeled elsewhere. |

### Duplicate / Overlap Matrix

| New field | Already represented elsewhere? | Recommendation |
| --- | --- | --- |
| `health_context.allergies[].referenceId` | Yes, via `user_allergies` | Keep join table canonical for membership; use JSON only for metadata such as severity and notes. |
| `health_context.chronic_conditions[].referenceId` | Yes, via `user_health_conditions` | Keep join table canonical for membership; use JSON only for metadata such as status and notes. |
| `health_context.medications[]` | No strong normalized equivalent found | Safe to keep in the new table. |
| `notification_preferences` | Yes, `users.notification_preferences` and related flags | Do not duplicate canonically in two places. Choose one owner. |
| `ui_settings.language/theme/font_size` | Yes, `users.language`, `users.theme`, `users.font_size` | Do not duplicate canonically in two places. Choose one owner. |

## Code Impact in This Branch

The branch already assumes `user_preference_states` exists.

Relevant code paths:

- `model/userPreferenceState.js`
- `model/fetchUserPreferences.js`
- `model/updateUserPreferences.js`
- `services/userPreferencesService.js`

Behavioral effect:

- Reads of user preferences call `getUserPreferenceState()`.
- Writes of extended health context / notifications / UI settings call `saveUserPreferenceState()`.
- If the table is not present in Supabase, these endpoints fail at runtime.

## Risk Assessment

### If we do not create the table

Risk is high.

- New preference endpoints in this branch will fail because the code queries `user_preference_states` directly.

### If we create the table exactly as-is

Risk is medium.

Technical safety:

- The SQL is additive only: create table, function, and trigger.
- The foreign key to `users(user_id)` is valid for the backend user model in this repo.

Design risk:

- Preference data becomes split across `users`, join tables, and `user_preference_states`.
- Without a source-of-truth rule, different services can read different answers for the same concept.

### If we treat the new table as the canonical owner of everything

Risk is high.

- It would duplicate settings already stored in `users`.
- It would duplicate membership already stored in join tables.
- It would make recommendation and filtering code harder to trust unless all existing readers are migrated.

## Recommended Source-of-Truth Design

### Recommended ownership

Use the new table, but only for data that genuinely needs structured JSON or does not already have a clean normalized home.

| Concern | Recommended source of truth |
| --- | --- |
| Dietary requirement membership | `user_dietary_requirements` |
| Allergy membership | `user_allergies` |
| Health condition membership | `user_health_conditions` |
| Dislikes | `user_dislikes` |
| Cooking methods | `user_cooking_methods` |
| Spice levels | `user_spice_levels` |
| Structured allergy metadata (`severity`, `notes`) | `user_preference_states.health_context` |
| Structured condition metadata (`status`, `notes`) | `user_preference_states.health_context` |
| Medications | `user_preference_states.health_context` |
| Notification preferences | `users.notification_preferences` or `user_preference_states.notification_preferences`, but not both |
| UI settings (`theme`, `language`, `font_size`) | `users` or `user_preference_states.ui_settings`, but not both |

### Lowest-risk practical choice for this repo

The lowest-risk option is:

1. Keep join tables canonical for food and health membership.
2. Use `user_preference_states.health_context` only for structured metadata and medications.
3. Keep `users` canonical for `theme`, `language`, `font_size`, and notification preferences.
4. Treat `user_profiles` and `user_security_settings` as a separate UUID-based subsystem unless there is an explicit cross-system migration plan.

Why this is safer:

- It matches how recommendation and filtering code already works.
- It avoids duplicating `users` settings into a second canonical store.
- It still unlocks the new structured health-context feature that the branch is introducing.

## Suggested Table Shape Adjustment

If the team wants the least duplication, the new table should ideally be reduced to:

- `user_id bigint primary key references users(user_id)`
- `health_context jsonb`
- `created_at`
- `updated_at`

And `health_context` should be scoped to:

- `allergies[]` metadata only
- `chronic_conditions[]` metadata only
- `medications[]`

That means removing these from the new table:

- `notification_preferences`
- `ui_settings`

## Migration Strategy

### Option A: Keep the branch logic, but reduce duplicate ownership later

Use this if the team wants minimal code churn right now.

1. Create `user_preference_states` in Supabase so the branch can run.
2. Backfill rows lazily on first write.
3. Keep join tables canonical for IDs.
4. Plan a follow-up task to stop storing notification/UI settings in the new table.

### Option B: Tighten the implementation now

Use this if the team wants cleaner architecture before merging.

1. Create `user_preference_states` with `health_context` only.
2. Update `model/userPreferenceState.js` and `model/updateUserPreferences.js` to stop reading/writing `notification_preferences` and `ui_settings` there.
3. Read/write UI and notification settings from `users`.
4. Keep the merge logic in `services/userPreferencesService.js` for structured allergy/condition metadata.

## Recommendation for This Branch

Recommended decision:

- Yes, create the new table in Supabase, because the branch already depends on it.
- No, do not make it the canonical home for data already cleanly stored in `users` or join tables.

Recommended follow-up implementation change before or soon after merge:

- Narrow `user_preference_states` to structured health context only.
- Leave UI and notification settings on `users`.
- Leave preference memberships on existing join tables.

## Short Decision Summary

If the question is "Should we create the new table?":

- Yes, because this branch needs it and it is currently missing.

If the question is "Should the new table own all preference/settings data?":

- No, that would create unnecessary duplication and increase drift risk.
