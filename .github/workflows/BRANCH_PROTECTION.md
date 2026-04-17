# 🔒 Branch Protection Rules - NutriHelp API

## Required Checks Before Merge

All pull requests MUST pass these 6 BLOCKING checks:

| Check Name | Purpose |
|------------|---------|
| **lint** | ESLint code quality |
| **format-check** | Prettier formatting |
| **unit-tests** | Unit test suite |
| **openapi-validate** | OpenAPI spec validation |
| **security-scan** | Vulnerability audit |
| **build-check** | Syntax verification |

## Setup Instructions

1. Go to **Settings** → **Branches** → **Add branch protection rule**
2. Branch name pattern: `main` or `develop`
3. Enable:
   - ✅ Require pull request reviews before merging
   - ✅ Require status checks to pass before merging
   - ✅ Select all 6 checks above
   - ✅ Require branches to be up to date
   - ✅ Include administrators

## Local Testing

```bash
# Run all checks locally
npm run validate

# Individual checks
npm run lint
npm run format:check
npm test
npm run openapi:validate