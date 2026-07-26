# Recipe Backend Scope

This document records what the backend is intentionally responsible for around
recipe discovery, filtering, and user-created recipes — and what is
intentionally left to the frontend. The goal is to keep the backend surface
small and predictable instead of growing one endpoint per UI affordance.

If you are about to add a new recipe-related route, read this first.

## TL;DR — what stays on the backend

| Capability                                          | Endpoint                                          |
| --------------------------------------------------- | ------------------------------------------------- |
| User's own recipes (list)                           | `GET  /api/recipe-library/my`                     |
| Public catalog (list)                               | `GET  /api/recipe-library/public`                 |
| Community feed (list, with search/cuisine/sort)     | `GET  /api/recipe/community`                      |
| Add-meal picker                                     | `GET  /api/recipe-library/add-meal`               |
| Recipe detail                                       | `GET  /api/recipe-library/:id`                    |
| Server-side filter (dietary + allergy + cuisine)    | `GET  /api/filter`                                |
| Create a user recipe                                | `POST /api/recipe/createRecipe`                   |
| Create a private library recipe                     | `POST /api/recipe-library`                        |
| Update own recipe                                   | `PATCH /api/recipe-library/:id`                   |
| Delete own recipe                                   | `DELETE /api/recipe`                              |
| Submit a recipe for community review                | `POST /api/recipe/:id/share-community`            |
| Stop sharing a recipe with the community            | `POST /api/recipe/:id/unshare-community`          |
| Admin community moderation                          | `PATCH /api/recipe/admin/:id/visibility` + `/api/recipe-library/admin/...` |
| Recipe scaling (servings)                           | `GET  /api/recipe/scale/:recipe_id/:desired_servings` |

`/api/recipe/community` and `/api/filter` are the two canonical discovery
surfaces. They accept `search`, `cuisine_id`, `cooking_method_id`, `sort`,
`limit`, and `offset` so the frontend can paginate and refine without
needing a separate "discovery" API.

## What stays on the frontend

The following are intentionally **not** backed by dedicated APIs. They are
either pure UI concerns or trivial transforms over data the frontend has
already fetched:

* **Sorting an already-loaded page** (most-recent, alphabetical, etc.) once
  the user has the result set in memory. The backend exposes `sort` for the
  cases where the order affects which rows fall inside the page window;
  re-ordering a single page in the client does not justify a new endpoint.
* **Client-side favourite/recently-viewed lists** that are persisted to
  `localStorage` only. If/when these need to sync across devices a single
  small endpoint can be added — until then there is no product need.
* **Ingredient unit conversion display** (e.g. grams ↔ ounces). The numbers
  come from `/api/recipe/scale/...`; presentation conversion is UI logic.
* **Tag / chip rendering** for dietary tags, spice level, difficulty, etc.
  These ride along on the existing recipe payload — no separate "tags"
  endpoint is needed.
* **Search-as-you-type debouncing and request throttling.** This is a
  frontend concern; the backend filter endpoint is the same regardless of
  how often it is called.
* **"Print recipe" / "share to clipboard" actions.** Pure client-side.

## Discovery endpoint contract

Both `/api/filter` and `/api/recipe/community` accept the following query
parameters (all optional):

| Param              | Type    | Notes                                                          |
| ------------------ | ------- | -------------------------------------------------------------- |
| `search`           | string  | Partial match on `recipe_name`, `%` and `_` are escaped.       |
| `cuisine_id`       | number  | Filters server-side via `eq('cuisine_id', …)`.                 |
| `cooking_method_id`| number  | Community list only.                                           |
| `allergies`        | csv     | `/api/filter` only. Excludes recipes with matching allergens.  |
| `dietary`          | string  | `/api/filter` only. Partial name match against dietary table.  |
| `sort`             | enum    | Community list only: `latest` (default), `oldest`, `name`.     |
| `limit`            | number  | Page size. Capped per-endpoint.                                |
| `offset`           | number  | Pagination offset.                                             |

Behaviours we intentionally do **not** support on these endpoints:

* Free-form full-text search across instructions or tags — out of scope.
* Multi-cuisine OR / NOT filters — the UI only needs single-select today.
* "Recommended for me" personalisation — that lives behind
  `/api/recommendations`, not the discovery filter.

## User recipe create / update

* `POST /api/recipe/createRecipe` is the legacy create endpoint. It hard-codes
  `visibility = "user_private"` and `is_published = false` server-side so a
  client cannot create something that goes straight to the community feed.
* `POST /api/recipe-library` is the canonical create endpoint for new
  client work and should be preferred.
* `PATCH /api/recipe-library/:id` is the only user-recipe update endpoint.
  We do **not** mirror it under `/api/recipe/:id` — owning a single update
  surface keeps validation, audit logging, and authorization in one place.

## Ownership & authorization

* `POST /api/recipe/:id/share-community` and `…/unshare-community` derive
  ownership from `req.user.userId`. Any `user_id` supplied in the request
  body is ignored. This prevents a client from submitting another user's
  recipe for community review.
* Admin moderation routes are gated by `authorizeRoles('admin')`.

## Adding new recipe routes — checklist

Before adding a new recipe route, confirm:

1. The behaviour is not already supported by `/api/filter`,
   `/api/recipe/community`, `/api/recipe-library/*`, or the scaling endpoint.
2. The behaviour cannot live in the frontend over data we already return.
3. There is a real product need — not just a refactor or convenience.
4. The new endpoint reuses existing services (`recipeLibraryService`,
   `decorateRecipes`, etc.) instead of cloning their logic.

If any of those fail, the right move is to refine an existing endpoint
rather than add a new one.
