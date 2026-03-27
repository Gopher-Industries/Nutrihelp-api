# 🔒 Branch Protection Rules - NutriHelp API

## Required Checks Before Merge

All pull requests to `main` and `develop` branches MUST pass:

### ✅ BLOCKING CHECKS (All Required)

| Check Name | Purpose | Failure Action |
|------------|---------|----------------|
| **lint** | ESLint code quality | ❌ Blocks merge |
| **format-check** | Prettier formatting | ❌ Blocks merge |
| **unit-tests** | Unit test suite | ❌ Blocks merge |
| **integration-tests** | API integration tests | ❌ Blocks merge |
| **openapi-validate** | OpenAPI spec validation | ❌ Blocks merge |
| **security-scan** | Vulnerability audit | ❌ Blocks merge |
| **build-check** | Syntax & build verification | ❌ Blocks merge |
| **code-coverage** | ≥70% test coverage | ❌ Blocks merge |

## Setting Up Branch Protection

### Via GitHub UI:
1. Go to **Settings** → **Branches** → **Add branch protection rule**
2. Enter branch name pattern: `main` or `develop`
3. Enable:
   - ✅ **Require pull request reviews before merging** (1 reviewer)
   - ✅ **Require status checks to pass before merging**
   - ✅ Select all checks listed above
   - ✅ **Require branches to be up to date**
   - ✅ **Include administrators**

### Via GitHub CLI:
```bash
gh api repos/Gopher-Industries/Nutrihelp-api/branches/main/protection \
  --method PUT \
  -f required_status_checks='{"strict":true,"contexts":["lint","format-check","unit-tests","integration-tests","openapi-validate","security-scan","build-check","code-coverage"]}' \
  -f enforce_admins=true \
  -f required_pull_request_reviews='{"required_approving_review_count":1}'