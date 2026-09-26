# Recipe Library Flow

## Decision

Use `recipe_library` as the central table for:

- Admin/public catalog recipes.
- Private recipes created by users.
- Community recipes shared by users.
- AI-enriched recipes created from dish-name imports.

Do not keep building new features on top of `weeklyrecipes`. Treat `weeklyrecipes` as legacy until data is migrated.

## Core Concepts

| Concept | Stored In | Meaning |
|---|---|---|
| Public catalog | `visibility = public` | Official recipe catalog managed by admin/AI review |
| Private recipe | `visibility = private` | User-created recipe visible only to owner |
| Community pending | `visibility = community_pending` | User submitted recipe for sharing |
| Community recipe | `visibility = community` | Approved user recipe visible in Explore Community |
| Unlisted | `visibility = unlisted` | Published by link/internal use, not normal feeds |

## Add Meal Query

Add Meal should use:

```text
official public recipes
+ approved community recipes
+ private recipes owned by the current user
```

That means the backend query should include:

```sql
(is_published = true and visibility in ('public', 'community'))
or owner_user_id = :current_user_id
```

## User Create Recipe

When a user creates a recipe, save it to `recipe_library` as private:

```js
{
  owner_user_id: currentUser.userId,
  recipe_name: input.recipe_name,
  dish_name: input.dish_name || input.recipe_name,
  visibility: "private",
  source: "user_created",
  is_published: false,
  data_status: "user_private",
  moderation_status: "not_required"
}
```

This lets the same recipe appear in the owner's Add Meal list without exposing it to other users.

## User Share To Community

When a user clicks "Share to Community":

```js
{
  visibility: "community_pending",
  moderation_status: "pending",
  submitted_at: now()
}
```

Admin must approve before other users can see it.

## Admin Approve Community Recipe

On approval:

```js
{
  visibility: "community",
  is_published: true,
  data_status: "published",
  moderation_status: "approved",
  reviewed_by: adminUserId,
  reviewed_at: now(),
  published_at: now()
}
```

## Admin Reject Community Recipe

On rejection:

```js
{
  visibility: "private",
  is_published: false,
  moderation_status: "rejected",
  moderation_reason: "reason text",
  reviewed_by: adminUserId,
  reviewed_at: now()
}
```

## Trash Flow

Recipe library delete should soft-delete first.

- `DELETE /api/recipe-library/:id` moves the recipe to Trash.
- Trash metadata is stored in `trashed_at`, `trashed_by`, `trash_reason`, and `trash_snapshot`.
- `POST /api/recipe-library/admin/:id/recover` restores the snapshot and clears trash metadata.
- `DELETE /api/recipe-library/admin/:id/permanent-delete` removes the trashed row permanently.

Active recipe-library lists should filter out rows where `trashed_at is not null`. The admin Trash tab can query the trashed rows directly and show a badge count for the total number of trashed items.

## Dish Name vs Recipe Name

Keep both fields.

| Field | Purpose |
|---|---|
| `dish_name` | Canonical dish/grouping name, e.g. `Chicken Curry` |
| `recipe_name` | Specific recipe title, e.g. `High Protein Chicken Curry with Brown Rice` |

If the user only enters one name, use:

```js
dish_name = recipe_name
```

## AI Enrichment From Dish Names

Admin can paste dish names into `recipe_library_import_queue`.

Recommended flow:

1. Admin imports dish names.
2. Backend marks queue row as `enriching`.
3. Backend asks AI to produce strict JSON.
4. Backend validates the JSON.
5. Backend fetches image metadata from Unsplash-compatible flow.
6. Backend inserts `recipe_library` row:

```js
{
  owner_user_id: null,
  visibility: "private",
  source: "admin_ai",
  is_published: false,
  data_status: "needs_review",
  ai_generated: true
}
```

7. Admin reviews.
8. Admin publishes as `visibility = public`.

## AI Prompt Contract

```text
You are a nutrition recipe data enrichment engine for an Australian health meal planning app.

Input dish:
- dish_name: "{dish_name}"
- meal_type_hint: "{meal_type_hint}"
- cuisine_hint: "{cuisine_hint}"
- cooking_method_hint: "{cooking_method_hint}"

Return strict JSON only. Do not include markdown.

Rules:
- Make the recipe realistic for home cooking in Australia.
- Nutrition is per serving.
- Use metric units.
- Ingredients must be specific and measurable.
- Instructions must be 6 to 10 clear steps.
- Do not claim medical certainty.
- If unsure about allergens or nutrition, provide conservative estimates.
- Keep recipe suitable for a general meal catalog, not a clinical prescription.
- Use lowercase enum values.

JSON shape:
{
  "recipe_name": "string",
  "dish_name": "string",
  "display_name": "string",
  "description": "string",
  "meal_type": "breakfast|lunch|dinner|other",
  "cuisine_name": "string",
  "cooking_method_name": "string",
  "difficulty": "easy|medium|hard",
  "spice_level": "none|mild|medium|hot",
  "prep_time_minutes": 10,
  "cook_time_minutes": 20,
  "servings": 2,
  "serving_size": "1 bowl, about 450 g",
  "ingredients": [
    {
      "name": "string",
      "quantity": 120,
      "unit": "g|ml|tbsp|tsp|piece|cup",
      "notes": "string"
    }
  ],
  "instructions": [
    "string"
  ],
  "equipment": [
    "string"
  ],
  "tips": [
    "string"
  ],
  "storage_instructions": "string",
  "reheating_instructions": "string",
  "dietary_tags": [
    "high-protein"
  ],
  "health_tags": [
    "balanced"
  ],
  "allergens": [
    "gluten"
  ],
  "avoid_for_conditions": [
    "hypertension"
  ],
  "suitable_goals": [
    "maintenance"
  ],
  "nutrition": {
    "calories": 520,
    "protein": 32,
    "fat": 18,
    "saturated_fat": 5,
    "carbohydrates": 58,
    "fiber": 8,
    "sugar": 7,
    "sodium": 780,
    "potassium": 650,
    "calcium": 180,
    "iron": 3.5,
    "vitamin_a": 120,
    "vitamin_c": 25
  },
  "ai_confidence": 0.78,
  "quality_notes": "string"
}
```

## Image Strategy

Store remote image metadata in `recipe_library`:

```json
{
  "image_url": "https://...",
  "image_original_url": "https://...",
  "image_source": "Unsplash",
  "image_source_url": "https://unsplash.com/photos/...",
  "image_attribution": "Photographer Name",
  "image_license": "Unsplash License",
  "image_confidence": 0.82,
  "image_fetched_at": "2026-05-07T00:00:00.000Z"
}
```

If no good image is found, leave `image_url` empty and let the frontend fallback image flow continue.

## Implemented API Surface

| Endpoint | Purpose |
|---|---|
| `GET /api/recipe-library/public` | Published public + community recipes |
| `GET /api/recipe-library/community` | Explore Community recipes |
| `GET /api/recipe-library/my` | Current user's recipes |
| `GET /api/recipe-library/add-meal` | Public + community + current user's private recipes |
| `POST /api/recipe-library` | Create a private user recipe |
| `PATCH /api/recipe-library/:id` | Update own recipe or admin update |
| `POST /api/recipe-library/:id/share-community` | Submit own recipe to community review |
| `GET /api/recipe-library/admin` | Admin list of all recipe library rows |
| `GET /api/recipe-library/admin/pending-community` | Admin moderation queue |
| `POST /api/recipe-library/admin/:id/approve-community` | Approve community recipe |
| `POST /api/recipe-library/admin/:id/reject-community` | Reject community recipe |
| `POST /api/recipe-library/admin/:id/publish-catalog` | Publish recipe as official catalog item |
| `POST /api/recipe-library/admin/import-names` | Add dish names to AI enrichment queue |
| `GET /api/recipe-library/admin/import-queue` | View enrichment queue |
| `POST /api/recipe-library/admin/enrich-batch` | Enrich pending queue rows into draft recipe library rows |
