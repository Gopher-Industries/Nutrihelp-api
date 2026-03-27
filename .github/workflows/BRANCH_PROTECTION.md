# Branch Protection Rules

## Protected Branches
- `main` - Production branch
- `develop` - Development branch

## Required Checks for PR Merge
All pull requests must pass the following checks before merging:

1. **Lint** - ESLint validation with zero errors
2. **Format Check** - Prettier formatting validation
3. **Unit Tests** - All tests must pass
4. **OpenAPI Validation** - API specification must be valid
5. **Security Scan** - No critical vulnerabilities
6. **Build Check** - Application must start without errors

## How to Set Up Branch Protection

### Via GitHub UI:
1. Go to repository Settings > Branches
2. Click "Add branch protection rule"
3. For branch name pattern, enter `main` and `develop`
4. Enable:
   - "Require pull request reviews before merging"
   - "Require status checks to pass before merging"
   - Select all CI checks listed above
   - "Require branches to be up-to-date"
   - "Include administrators"

### Via GitHub CLI:
```bash
gh api repos/:owner/:repo/branches/main/protection \
  --method PUT \
  -f required_status_checks='{"strict":true,"contexts":["lint","format-check","test-unit","openapi-validate","security-scan","build-check"]}' \
  -f enforce_admins=true \
  -f required_pull_request_reviews='{"required_approving_review_count":1}'