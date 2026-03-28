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
