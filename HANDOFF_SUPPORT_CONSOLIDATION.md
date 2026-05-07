# Handoff — Support Consolidation

All changes are written into the working tree under `/Users/thorancherukuru/Nutri`.
Tests pass (`15/15` in the new suites). Push from your machine.

## Steps to commit & push

```bash
cd /Users/thorancherukuru/Nutri

# 1. Clean up the leftover git-am session if it's still there.
git am --abort 2>/dev/null
rm -rf .git/rebase-apply 2>/dev/null

# 2. The sandbox left a node_modules symlink to /tmp — remove it locally.
rm -f node_modules

# 3. The sandbox could not delete the gitignored data/ scratch folder,
#    but it's gitignored so it won't be committed. Remove if you like:
rm -rf data/

# 4. New branch from master.
git fetch origin
git checkout master
git pull --ff-only
git checkout -b feat/support-consolidation

# 5. Stage everything.
git add .env.example \
        controller/contactusController.js \
        controller/userFeedbackController.js \
        controller/healthToolsController.js \
        controller/faqController.js \
        controller/supportData/ \
        routes/contactus.js \
        routes/userfeedback.js \
        routes/healthTools.js \
        routes/faq.js \
        routes/index.js \
        validators/contactusValidator.js \
        utils/emailService.js \
        utils/supportResponse.js \
        test/contactus.controller.test.js \
        test/userFeedback.controller.test.js \
        test/faq.controller.test.js \
        test/healthTools.controller.test.js \
        docs/SUPPORT_CONSOLIDATION.md \
        HANDOFF_SUPPORT_CONSOLIDATION.md

# 6. Commit & push.
git commit -m "feat(support): consolidate Contact Us / FAQ / Health Tools surface

- Live Contact Us email flow (Nodemailer + jsonTransport fallback)
- /api/faq with seed-data fallback so /health-faq is never blank
- /api/health-tools catalogue + standardized BMI response
- Standardized response envelope across support endpoints
- Tighter contact-us validator (min lengths, normalized email)
- Jest tests for contact-us, feedback, faq, health-tools (15/15)
- Dedupe duplicate /api/chatbot and /api/upload route mounts"

git push -u origin feat/support-consolidation
```

Open the PR against `master` on https://github.com/thoran123/Nutri.

## Verifying locally

```bash
cd /Users/thorancherukuru/Nutri
npm install
npx jest test/contactus.controller.test.js \
         test/userFeedback.controller.test.js \
         test/faq.controller.test.js \
         test/healthTools.controller.test.js
```

Expected:

```
Test Suites: 4 passed, 4 total
Tests:       15 passed, 15 total
```

## Files at a glance

New:
- `utils/emailService.js`
- `utils/supportResponse.js`
- `controller/faqController.js`
- `controller/supportData/faqSeed.js`
- `controller/supportData/healthToolsSeed.js`
- `routes/faq.js`
- `test/contactus.controller.test.js`
- `test/userFeedback.controller.test.js`
- `test/faq.controller.test.js`
- `test/healthTools.controller.test.js`
- `docs/SUPPORT_CONSOLIDATION.md`

Modified:
- `controller/contactusController.js`
- `controller/userFeedbackController.js`
- `controller/healthToolsController.js`
- `routes/contactus.js`
- `routes/userfeedback.js`
- `routes/healthTools.js`
- `routes/index.js` — wires `/api/faq`, dedupes duplicate mounts
- `validators/contactusValidator.js`
- `.env.example`

See `docs/SUPPORT_CONSOLIDATION.md` for the full PR-style write-up.
