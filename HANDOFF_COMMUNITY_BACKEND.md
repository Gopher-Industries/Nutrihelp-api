# Handoff — Community backend PR

All files are in your working tree. To open a clean PR:

```bash
cd /Users/thorancherukuru/Nutri

# Get on a fresh branch off the latest master
git fetch origin
git checkout master
git pull
git checkout -b feat/community-backend

# Stage the new + modified files
git add migrations/create_community_tables.sql \
        controller/communityController.js \
        controller/supportData/communitySeed.js \
        services/communityService.js \
        validators/communityValidator.js \
        routes/community.js \
        routes/index.js \
        test/community.controller.test.js \
        docs/COMMUNITY_BACKEND.md \
        HANDOFF_COMMUNITY_BACKEND.md

git status   # confirm

# Commit
git commit -m "feat(community): backend for feed, posts, comments, likes, leaderboard

- 7 new endpoints under /api/community
- DB-first with bundled seed + in-memory fallback so frontend never blocks
- Standardized response envelope (matches support PR)
- 17 hermetic Jest tests
- Optional migration: migrations/create_community_tables.sql

Backs frontend tasks M-60 through M-63 (FeedScreen, PostDetailScreen,
CreatePostScreen, LeaderboardScreen)."

# Push the branch (NOT to master)
git push -u origin feat/community-backend
```

Then on GitHub:

1. Open a new PR from `thoran123:feat/community-backend` → `Gopher-Industries:master`.
2. Title: `BE30 : feat(community): feed, posts, comments, likes, leaderboard`
3. Description: paste the contents of `docs/COMMUNITY_BACKEND.md`.
4. Request review from Tien and Vedant.

## Important — don't push to master directly this time

Last time you ran `git push origin HEAD:master` which bypassed PR
review. The command above (`git push -u origin feat/community-backend`)
pushes the **branch** so GitHub's PR flow handles the merge.

## Verify locally before pushing

```bash
npm install
npx jest test/community.controller.test.js \
         test/contactus.controller.test.js \
         test/userFeedback.controller.test.js \
         test/faq.controller.test.js \
         test/healthTools.controller.test.js
# expected: 32 passing
```

## Tell the frontend team

Send Tien (or whoever owns the frontend tasks) this:

> Backend for community screens (M-60 → M-63) is in PR #XXX. Endpoints
> live under `/api/community`. Image upload is the existing
> `POST /api/upload` (returns `fileUrl`). Endpoints work today against
> bundled seed data, so you can build against them before the
> Supabase migration runs. See `docs/COMMUNITY_BACKEND.md` for the full
> contract and frontend-screen mapping.
