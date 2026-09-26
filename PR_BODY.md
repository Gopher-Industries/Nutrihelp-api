This PR includes:

- Fixed OpenAPI spec (removed duplicate `paths:`, corrected schema nesting, added Allergy endpoints)
- Helmet + CORS tightening, global rate limiter
- Uploads temp cleanup and scheduler
- New routes (system, allergy, login-dashboard, water-intake)
- Swagger examples & schemas
- Misc reliability fixes and error handlers

Tested locally: API boots, Swagger loads, and endpoints respond.
