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

## AES-256 Encryption at Rest

NutriHelp now includes backend encryption foundations using AES-256-GCM in `services/encryptionService.js`.

### Why AES-256-GCM
- AES-256 gives strong confidentiality.
- GCM adds authentication (integrity + tamper detection via authTag).
- Safe for encrypting database column payloads in Week 6.

### Service API
- `encrypt(data)`
  - Input: string or object
  - Output: `{ encrypted, iv, authTag, keyVersion, algorithm }`
- `decrypt(encryptedData, iv, authTag)`
  - Input: encrypted tuple
  - Output: original string or object

Note:
- Decryption is backend-only and must never be exposed in frontend code.
- Never return raw decrypted secrets in public API responses.

### Key Management

Preferred:
- Supabase Vault via secure RPC (`ENCRYPTION_KEY_SOURCE=vault`).

Fallback:
- Environment secret (`ENCRYPTION_KEY`) injected via local `.env` and CI GitHub Secrets.

Required env examples:

```env
# env | vault
ENCRYPTION_KEY_SOURCE=env

# Base64 32-byte key (preferred format)
ENCRYPTION_KEY=replace_with_strong_base64_key

# Optional indirection/versioning for rotation
ENCRYPTION_KEY_ENV_NAME=ENCRYPTION_KEY
ENCRYPTION_KEY_VERSION=v1

# Optional for vault key lookup
ENCRYPTION_VAULT_RPC=get_encryption_key
```

### Example Backend Usage

```js
const { encrypt, decrypt } = require('./services/encryptionService');

async function storeEncryptedPayload(payload) {
  const { encrypted, iv, authTag, keyVersion } = await encrypt(payload);
  // Store encrypted, iv, authTag, keyVersion in DB columns
  return { encrypted, iv, authTag, keyVersion };
}

async function readEncryptedPayload(row) {
  // Backend-only operation
  return decrypt(row.encrypted, row.iv, row.auth_tag);
}
```

### Quick Test

```bash
node -e "(async()=>{const e=require('./services/encryptionService');const x=await e.encrypt({a:1,msg:'hello'});const y=await e.decrypt(x.encrypted,x.iv,x.authTag);console.log(y);})();"
```

Expected output: object with same values as input.
