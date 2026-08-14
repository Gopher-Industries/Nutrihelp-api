# Community Backend — feed, posts, comments, likes, leaderboard

Branch: `feat/community-backend`

## Why

The mobile community screens (`FeedScreen`, `PostDetailScreen`,
`CreatePostScreen`, `LeaderboardScreen` — frontend tasks M-60 through
M-63) need backend endpoints that don't exist yet. This change adds the
nine endpoints they need, with sensible defaults so the UI never sees a
blank state.

## What this PR adds

### New endpoints

| Method | Path | Auth | Notes |
| -----: | ---- | ---- | ----- |
| `GET`  | `/api/community/posts` | none | Paginated feed (`?page=&pageSize=`) |
| `GET`  | `/api/community/posts/:postId` | none | Post detail |
| `POST` | `/api/community/posts` | Bearer | Create post |
| `POST` | `/api/community/posts/:postId/like` | Bearer | Toggle like |
| `GET`  | `/api/community/posts/:postId/comments` | none | List comments |
| `POST` | `/api/community/posts/:postId/comments` | Bearer | Create comment |
| `GET`  | `/api/community/leaderboard` | none | `?timeframe=weekly\|monthly\|all_time&limit=&currentUserId=` |

Image upload is handled by the existing `POST /api/upload` (returns a
`fileUrl` you pass into `imageUrl` on `POST /api/community/posts`).

### Backing pieces

- `migrations/create_community_tables.sql` — `posts`, `comments`,
  `post_likes`, `user_points`, `user_points_events` (run in Supabase
  SQL editor when ready; endpoints work with or without the migration).
- `services/communityService.js` — DB-first, falls back to bundled seed
  + an in-memory store so frontend dev never blocks on DB provisioning.
- `controller/communityController.js` — HTTP handlers on the
  standardized support response envelope.
- `controller/supportData/communitySeed.js` — sample posts, comments,
  and weekly/monthly/all-time leaderboards.
- `routes/community.js` — read-public, write-authenticated.
- `validators/communityValidator.js` — content min/max, pagination
  bounds, leaderboard timeframe enum.
- `test/community.controller.test.js` — 17 hermetic tests.

## Response envelope

Same shape as the support PR (#252):

```json
{ "success": true, "data": { ... }, "meta": { ... } }
```

```json
{ "success": false, "error": { "message": "...", "code": "...", "details": { "fields": [...] } } }
```

## Frontend mapping

| Frontend screen | Endpoints used |
| --------------- | -------------- |
| `FeedScreen` (M-60) | `GET /posts` (paginated), `POST /posts/:id/like` (optimistic) |
| `PostDetailScreen` (M-61) | `GET /posts/:id`, `GET /posts/:id/comments`, `POST /posts/:id/comments`, `POST /posts/:id/like` |
| `CreatePostScreen` (M-62) | `POST /api/upload` → `POST /posts` |
| `LeaderboardScreen` (M-63) | `GET /leaderboard?timeframe=` |

## Acceptance criteria coverage

- ✅ Feed pagination — `page`/`pageSize` query params, `hasMore` in response
- ✅ Like is optimistic — endpoint returns the updated post so client can sync
- ✅ Pull-to-refresh — frontend just re-fetches `?page=1`
- ✅ Comments append — `POST /posts/:id/comments` returns the new comment
- ✅ Create post validates content min length (10 chars)
- ✅ Image upload separate from post creation (existing `POST /api/upload`)
- ✅ Leaderboard timeframe filter — `weekly` / `monthly` / `all_time`
- ✅ Current user rank pinned — `currentUserRank` field in response

## Behaviour with no DB

If the Supabase tables don't exist yet, every read returns seed content
and every write goes into an in-memory store that resets on server
restart. The response includes `meta.source: 'seed'` /
`meta.persistedTo: 'memory'` so this state is observable.

When the migration is applied, the endpoints automatically switch to
the DB on the next request — no code change, no redeploy.

## Tests

```
Test Suites: 1 passed
Tests:       17 passed
```

Mocks `dbConnection.js` and the auth middleware to keep the suite
hermetic. Run alongside the support suites to confirm no regressions:

```bash
npx jest test/community.controller.test.js \
         test/contactus.controller.test.js \
         test/userFeedback.controller.test.js \
         test/faq.controller.test.js \
         test/healthTools.controller.test.js
```

(32 / 32 passing.)

## Risks / rollout

- **Low blast radius.** Brand-new API surface under `/api/community`.
  Nothing else calls it.
- **Migration is opt-in.** The endpoints work without it, so the PR can
  ship before DBA review. Run the migration whenever you're ready.
- **Auth uses the existing `authenticateToken` middleware** — no new
  auth code paths.
- **No image processing.** Image uploads go through the existing
  `/api/upload` route, which already validates mime type and size.
