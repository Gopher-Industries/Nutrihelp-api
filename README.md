# NutriHelp Backend API
This is the backend API for the NutriHelp project. It is a RESTful API that provides the necessary endpoints for the frontend to interact with the database.

## Installation
1. Open a terminal and navigate to the directory where you want to clone the repository.
2. Run the following command to clone the repository:
```bash
git clone https://github.com/Gopher-Industries/Nutrihelp-api
```
3. Navigate to the project directory:
```bash
cd Nutrihelp-api
```
4. Install the required dependencies (including python dependencies):
```bash
npm install
pip install -r requirements.txt
npm install node-fetch
npm install --save-dev jest supertest
```
5. Contact a project maintainer to get the `.env` file that contains the necessary environment variables and place it in the root of the project directory.
6. Start the server:
```bash
npm start
```
A message should appear in the terminal saying `Server running on port 80`.
You can now access the API at `http://localhost:80`.

## Endpoints
The API is documented using OpenAPI 3.0, located in `index.yaml`.
You can view the documentation by navigating to `http://localhost:80/api-docs` in your browser.

## Automated Testing
1. In order to run the jest test cases, make sure your package.json file has the following test script added:
```bash
"scripts": {
  "test": "jest"
}
```
Also, have the followiing dependency added below scripts:
```bash
"jest": {
    "testMatch": [
      "**/test/**/*.js"
    ]
  },
```
2. Make sure to run the server before running the test cases.
3. Run the test cases using jest and supertest:
```bash
npx jest .\test\<TEST_SUITE_FILE_NAME>
```
For example:
```bash
npx jest .\test\healthNews.test.js
```

/\ Please refer to the "PatchNotes_VersionControl" file for  /\
/\ recent updates and changes made through each version.     /\


## CI: Manual Vulnerability & Test Scan

This repository includes a manual GitHub Actions workflow that runs the Vulnerability Scanner (V2) and optional tests.

How to run
- Open the repository on GitHub and go to the Actions tab.
- Select the workflow named `Manual Vulnerability & Test Scan`.
- Click the `Run workflow` button.

Inputs
- `run_tests` (default: `false`) — set to `true` to run unit tests (`npm run test:unit`). Tests may require a database or other services; use with caution.
- `fail_on_critical` (default: `false`) — set to `true` to make the job fail when the scanner JSON report contains one or more `CRITICAL` findings.

Artifacts
- `vulnerability-scan-reports` (artifact bundle) — contains:
  - `vulnerability_report.json` — machine-readable scan results
  - `vulnerability_report.html` — human-friendly HTML report (if HTML rendering succeeds)
  - `vulnerability_tool_report.txt` — legacy/auxiliary scanner output (if generated)
  - `npm_audit.json` — result of `npm audit --json`

Notes and recommendations
- By default the scanner excludes internal tool directories and common noisy paths (for example `Vulnerability_Tool_V2`, `Vulnerability_Tool`, `node_modules`, `tests`, `.pytest_cache`, `__pycache__`).
- If you enable `run_tests`, ensure the required environment (DB, credentials) is available to avoid noisy failures.
- Use `fail_on_critical=true` for gating releases or running stricter checks in CI; keep it `false` for quick, informational scans.


