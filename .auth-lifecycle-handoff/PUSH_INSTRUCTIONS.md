# Push instructions — feat/auth-lifecycle-standardize

This sandbox has no GitHub credentials, and the `.git/` inside the mounted
workspace is read-only from here, so the five prepared commits couldn't be
pushed directly. Two ways to push them from your laptop in one shot:

## Option A — fetch from the bundle (recommended, preserves SHAs)

```sh
cd /Users/thorancherukuru/Nutri
# stash or commit any local edits first if `git status` is dirty
git fetch .auth-lifecycle-handoff/auth-lifecycle.bundle \
  feat/auth-lifecycle-standardize:feat/auth-lifecycle-standardize
git push -u origin feat/auth-lifecycle-standardize
```

Then open a PR from `feat/auth-lifecycle-standardize` to `master` on GitHub.

## Option B — apply the patches

```sh
cd /Users/thorancherukuru/Nutri
git checkout -b feat/auth-lifecycle-standardize master
git am .auth-lifecycle-handoff/00*.patch
git push -u origin feat/auth-lifecycle-standardize
```

`git am` keeps the per-commit messages so the history is identical.

## After pushing

Once the branch is on GitHub, delete the handoff folder — it shouldn't be
checked into the repo:

```sh
rm -rf .auth-lifecycle-handoff
```

Or add it to `.gitignore` first if you'd rather keep a local copy.
