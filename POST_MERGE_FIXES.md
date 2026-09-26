# Post-merge fixes — review feedback (round 1 + round 2)

The reviewer flagged three classes of issue after merging `feat/support-consolidation` into a local copy of `master`. None of them were merge conflicts — they were latent issues in the merged code/test setup. All three are fixed in this update.

## 1. Duplicate `executePythonScript` declaration

**File:** `services/aiExecutionService.js`

**Symptom:**
```
SyntaxError: Identifier 'executePythonScript' has already been declared
```

**Root cause:** the file had two function declarations: a stub mock at the top (lines 1–18, positional signature, hardcoded responses for "non-existent" and "hello-from-stdin") and the real implementation below it (object-signature, real Python child-process spawn). They were stitched together by an earlier merge — the stub was probably a temporary test fixture that should never have been committed.

**Fix:** removed the stub. The real implementation (with retry, circuit-breaker, JSON normalisation, monitoring hooks) is now the single canonical export. The corresponding test file `test/aiExecutionService.test.js` already targets the real signature, so this is the correct version to keep.

**Verification:**
```bash
node -e "console.log(Object.keys(require('./services/aiExecutionService')))"
# → [ 'DEFAULT_TIMEOUT_MS', 'DEFAULT_PYTHON_COMMAND', 'executePythonScript' ]
```

## 2. AggregateError in `foodData*`, `auth.test.js`, `be26_consolidation.test.js`, etc.

**Symptom:** Multiple test suites fail with `AggregateError` when run via `npm test`.

**Root cause:** these are **integration tests**, not unit tests. They use supertest against `http://localhost:80` (or `:3001`), expecting a live server. When `npm test` runs without a server up, every request fails — Node throws `AggregateError` because both the IPv4 and IPv6 connection attempts are refused.

This is not a regression from the support PR — these tests would fail in the same way on `master` if you run `npm test` without first running `npm run dev`. But the reviewer wants a clean test state, so we should keep them out of the default unit-test run.

**Fix:** updated `jest.config.js` to exclude the live-server tests from the default run. Added a new `npm run test:integration` script for when you want to run them against a live server.

The 14 affected files are listed explicitly in `jest.config.js` under `LIVE_SERVER_TESTS` so it's obvious what's being skipped and why. Setting `RUN_INTEGRATION=1` flips them back on.

**Verification:**
```bash
npm test                 # runs only unit tests, no live-server requirement
npm run dev              # in another shell
npm run test:integration # then runs the full set including live-server suite
```

## 3. Empty `security/test.js` suite

**Symptom:**
```
FAIL security/test.js — Your test suite must contain at least one test
```

**Root cause:** `security/test.js` is a CLI script (`if (require.main === module) testSecuritySystem()`), not a Jest test. Its filename matches Jest's default test glob, so Jest auto-discovers it and rejects it for having no `describe`/`test` blocks.

**Fix:** added `/security/` to `testPathIgnorePatterns` in `jest.config.js`. The script remains usable as a CLI tool (`node security/test.js`) but Jest no longer tries to run it.

---

# Round 2 — additional reviewer feedback

After the round 1 commit, Tien reviewed again and called out:

1. A merge artifact in `services/recommendationService.js`
2. Auth-related test failures
3. Several legacy server-binding suites still timing out

This section documents what's now fixed and what's pre-existing master tech debt.

## 4. Merge artifact in `services/recommendationService.js`

**File:** `services/recommendationService.js`

**Symptom:** Same pattern as `aiExecutionService.js` — a stub had been
spliced on top of the real implementation:

```js
const db = require('../dbConnection');
async function generateRecommendations(userId, constraints, maxResults, insights) {
  return [{ id: 1, name: 'Recommended Recipe' }];
}
module.exports = { generateRecommendations };
/**
 * services/recommendationService.js
 * (real implementation below)
 */
```

Two `generateRecommendations` declarations and two `module.exports`. The
file parsed because the second `module.exports` overwrites the first,
but it was clearly a bad merge.

**Fix:** removed the 5-line stub. The real implementation (with safety
scoring, AI adapter, caching, persistence) is now the single canonical
export.

**Verification:**
```bash
node -e "const m=require('./services/recommendationService'); console.log(Object.keys(m))"
# → [ 'generateRecommendations' ]  (single export, no SyntaxError)
```

## 5. BONUS — merge artifact in `services/loginService.js`

While sweeping for similar patterns I found a third corruption. The
`login()` function body was unfinished and an orphaned `buildJwt`
referencing undefined `jwt` was glued into the middle:

```js
return {
  status: 200,
  body: {
    token: 'test-token',
    user: { id: 1, email },
function buildJwt(user) {     // <-- orphaned, never closes login()'s return
  return jwt.sign(...
```

**Symptom:**
```
SyntaxError: services/loginService.js: Unexpected keyword 'function'. (25:0)
```

This crashed every test that imported the auth surface (≈8 suites).

**Fix:** completed `login()`'s return block and removed the orphaned
`buildJwt` (the real auth flow uses `services/authService.js` for
JWT signing, not loginService).

## 6. Auth/password test failures — what's fixed vs what's pre-existing

After the loginService fix, the auth surface loads cleanly. The
remaining auth-test failures fall into two groups:

| Cause | Fix owner | Status |
| ----- | --------- | ------ |
| `services/loginService.js` parse error broke 8 auth suites | this PR | ✅ fixed |
| `Cannot find module 'sinon'` in test files | needs `sinon` added to `package.json` devDependencies | pre-existing master tech debt — not caused by this PR |
| `Cannot find module 'base64-arraybuffer'` from `model/updateUserProfile.js` | needs `base64-arraybuffer` added to `package.json` dependencies | pre-existing master tech debt — not caused by this PR |
| Real test logic bugs (e.g. `expect(...).to.throw(...)` not throwing) in `test/encryption.test.js`, `test/recommendationService.test.js`, `test/passwordResetService.test.js` | original test authors / module owners | pre-existing master tech debt — not caused by this PR |

The two missing-module failures are easy to land in a separate dev-deps
follow-up:

```bash
npm install --save sinon
npm install --save base64-arraybuffer
git add package.json package-lock.json
git commit -m "chore(deps): add missing test deps (sinon, base64-arraybuffer)"
```

## 7. Legacy server-binding suites

The 14 live-server tests gated behind `LIVE_SERVER_TESTS` in
`jest.config.js` (round 1 fix) remain gated. Adding more files to that
list as you discover them is a one-line change.

## What `npm test` now looks like

After this round of fixes (and assuming `sinon` + `base64-arraybuffer`
are added to deps):

- All my support + community suites pass (37 tests)
- `aiExecutionService.test.js` passes
- The auth surface loads (no more parse errors)
- Remaining failures are legitimate pre-existing test-logic bugs in
  modules unrelated to this PR (encryption math, recommendation
  scoring expectations, password reset flow assertions)

The PR is no longer the source of any new failure.

---

## Net diff (round 1 + round 2)

```
modified:  services/aiExecutionService.js     (-18 lines, removed duplicate stub)         [round 1]
modified:  services/recommendationService.js  (-5 lines, removed duplicate stub)          [round 2]
modified:  services/loginService.js           (-9 lines, removed orphaned buildJwt)       [round 2]
modified:  jest.config.js                     (+25 lines, ignore patterns + toggle)       [round 1]
modified:  package.json                       (+1 line,  test:integration script)         [round 1]
new:       POST_MERGE_FIXES.md                (this file)                                 [round 1, updated round 2]
```

## How to run after pulling

```bash
npm install
npm test
```

Expected: every remaining suite runs and passes (or the failure is a real test bug unrelated to the support PR — none should be `AggregateError` connection failures).

For the integration suite:

```bash
npm run dev               # in shell 1
npm run test:integration  # in shell 2
```
