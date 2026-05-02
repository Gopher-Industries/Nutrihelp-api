# NutriHelp Backend API

This is the backend API for the NutriHelp project. It exposes the REST endpoints used by the frontend, integrates with Supabase, serves OpenAPI documentation, and supports optional Python-based AI features used by some endpoints.

## TLS 1.3 Configuration & Verification

The root backend runtime now enforces TLS 1.3 only for HTTPS connections, adds HSTS headers, and redirects HTTP traffic to HTTPS.

### TLS Configuration
- **Protocol**: TLS 1.3 only (minVersion + maxVersion enforced)
- **HSTS**: 2-year max-age with subdomains and preload
- **Redirect**: HTTP requests automatically redirect to HTTPS
- **Ports**: HTTPS on 443, HTTP redirect on 80
- **Certificate Paths**: configurable via `TLS_KEY_PATH` and `TLS_CERT_PATH`

### Verification Commands

**Test TLS 1.3 Connection:**
```bash
openssl s_client -connect localhost:443 -tls1_3
```

**Test TLS 1.2 Block (should fail):**
```bash
openssl s_client -connect localhost:443 -tls1_2
```

**Check HSTS Header:**
```bash
curl -k -I https://localhost:443/api/system/health | grep -i strict-transport-security
```

**Test HTTP Redirect:**
```bash
curl -I http://localhost:80/api/system/health
# Should return 301 redirect to https://localhost:443/api/system/health
```

**Certificate Verification:**
```bash
openssl x509 -in certs/local-cert.pem -text -noout
```

## Quick Start

If you want the fastest setup path for local development:

```bash
git clone https://github.com/Gopher-Industries/Nutrihelp-api.git
cd Nutrihelp-api
npm install
pip install -r requirements.txt
```

Request the shared `.env` file from a project maintainer and place it in the project root, then start the backend:

Generate a local TLS certificate first if you do not already have one:

```bash
mkdir -p certs
openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout certs/local-key.pem \
  -out certs/local-cert.pem \
  -days 365 \
  -subj "/CN=localhost"
```

```bash
npm start
```

The backend will be available at:

- `https://localhost:443`
- `https://localhost:443/api-docs`
- `http://localhost:80` (redirects to HTTPS)

If you prefer Docker, jump to [Docker Setup](#docker-setup).

## Recommended Project Structure

To run the full NutriHelp system locally, keep the frontend and backend repositories under the same parent folder:

```text
NutriHelp/
├── Nutrihelp-web
└── Nutrihelp-api
```

Example:

```bash
mkdir NutriHelp
cd NutriHelp
git clone https://github.com/Gopher-Industries/Nutrihelp-web.git
git clone https://github.com/Gopher-Industries/Nutrihelp-api.git
```

## Local Setup

### 1. Enter the backend repository

```bash
cd Nutrihelp-api
```

### 2. Install backend dependencies

Install Node.js dependencies:

```bash
npm install
```

Install Python dependencies:

```bash
pip install -r requirements.txt
```

Python dependencies are optional for some basic API flows, but recommended if you want the full backend runtime, including AI and image-classification features.

### 3. Configure environment variables

Request the shared `.env` file from a project leader or maintainer, then place it here:

```text
Nutrihelp-api/.env
```

If you receive a file named `env`, rename it to `.env`.

If needed, create it manually:

```bash
touch .env
nano .env
```

The current backend expects these required values:

- `JWT_SECRET`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PORT`

Common optional values:

- `SENDGRID_API_KEY`
- `FROM_EMAIL`
- `NODE_ENV`
- `CORS_ORIGIN`

### 4. Start the backend

```bash
npm start
```

Expected local URLs:

- API base URL: `http://localhost:80`
- API docs: `http://localhost:80/api-docs`

## Frontend Setup

To test the full NutriHelp app locally, run the frontend in a separate terminal:

```bash
cd Nutrihelp-web
npm install
npm start
```

Frontend URL:

- `http://localhost:3000`

## End-to-End Testing Flow

After both frontend and backend are running, open:

- `http://localhost:3000`

Typical manual checks:

- User registration
- Login
- MFA verification

## Docker Setup

Docker is supported as a full local development path for this backend. It is useful if you want the runtime dependencies installed inside the container instead of on your host machine.

### Docker Compose

From the `Nutrihelp-api` folder:

```bash
docker compose up --build
```

The backend will be available at:

- `http://localhost:80`
- `http://localhost:80/api-docs`

Notes:

- Docker Compose loads environment variables from `.env`.
- The default compose service builds the `dev` target from the `Dockerfile`.
- The compose setup mounts the source code, uploads, logs, and `node_modules` volumes for development use.

### Build and run manually

Build the production image:

```bash
docker build -t nutrihelp-api --target prod .
```

Run it:

```bash
docker run --rm -p 80:80 --env-file .env nutrihelp-api
```

### Optional build flag

If Python or TensorFlow dependencies are problematic during image build, you can temporarily skip Python package installation for Node-only debugging:

```bash
docker build -t nutrihelp-api --target prod --build-arg INSTALL_PY_DEPS=false .
```

This is for troubleshooting only and is not suitable for validating AI-related features.

## Quick Validation

### Validate the backend health endpoint

```bash
curl http://localhost:80/api/system/health
```

### Validate the AI runtime in Docker

```bash
docker compose exec api python -c "import tensorflow as tf; print(tf.__version__)"
docker compose exec api python -c "import numpy, pandas, seaborn, sklearn, matplotlib; print('python-ai-runtime-ok')"
```

### Validate the test suite in Docker

```bash
docker compose exec api npm test
```

## Runtime Components

Required runtime components currently used by this repository:

| Component | Version / Source | Notes |
| --- | --- | --- |
| Node.js | `22-bookworm` image pinned by digest | Backend runtime |
| Python | `3.11` via Debian Bookworm packages | Used by AI routes |
| TensorFlow | `2.17.0` | Image classification runtime |
| numpy | `1.26.4` | TensorFlow-compatible numerical runtime |
| matplotlib | `3.9.2` | Required by `model/imageClassification.py` imports |
| pandas | `2.2.3` | Required by `model/imageClassification.py` imports |
| seaborn | `0.13.2` | Required by `model/imageClassification.py` imports |
| scikit-learn | `1.5.2` | Required by `model/imageClassification.py` imports |
| Pillow | `9.5.0` | Image preprocessing |
| h5py | `3.10.0` | Keras model loading |
| python-docx | `1.1.2` | Document-processing utilities |
| build-essential | Debian package | Native build dependency for Python wheels |

Optional or troubleshooting-only runtime component:

| Component | Notes |
| --- | --- |
| `INSTALL_PY_DEPS=false` build arg | Lets the image build without Python AI dependencies for troubleshooting only |

## Environment Validation

You can validate the environment configuration with:

```bash
node scripts/validateEnv.js
```

This script checks required variables, validates the JWT setup, and attempts a Supabase connection test.

## API Documentation

The API contract is defined in [index.yaml](/Users/tiennguyen/Desktop/Deakin/Test%20sever/Nutrihelp-api/index.yaml).

When the server is running, open:

- `http://localhost:80/api-docs`

## Automated Testing

The current repository uses `mocha` for automated tests.

Run the full suite:

```bash
npm test
```

Run unit tests only:

```bash
npm run test:unit
```

Useful checks during development:

```bash
npm run lint
npm run format:check
npm run openapi:validate
```

## Troubleshooting

- If port `80` is already in use, stop the conflicting process or change the port mapping in `docker-compose.yml`.
- If the AI image build is slow, let the TensorFlow wheel finish downloading. The first build is much slower than rebuilds.
- If model-related endpoints fail, confirm the model file exists at [prediction_models/best_model_class.hdf5](/Users/tiennguyen/Desktop/Deakin/Test%20sever/Nutrihelp-api/prediction_models/best_model_class.hdf5).
- If environment validation fails, confirm that `.env` exists in the project root and contains the required keys.
- If Supabase-related requests fail immediately on startup, verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

## AI Runtime Notes

The AI service is optional for some development flows, but this repository includes AI-related code and runtime dependencies.

- Python packages are listed in [requirements.txt](/Users/tiennguyen/Desktop/Deakin/Test%20sever/Nutrihelp-api/requirements.txt).
- AI-related JavaScript code lives under [ai](/Users/tiennguyen/Desktop/Deakin/Test%20sever/Nutrihelp-api/ai).
- Python model scripts live under [model](/Users/tiennguyen/Desktop/Deakin/Test%20sever/Nutrihelp-api/model).
- Model files are stored under [prediction_models](/Users/tiennguyen/Desktop/Deakin/Test%20sever/Nutrihelp-api/prediction_models).

## Additional Notes

- Patch history is available in [PatchNotes_VersionControl.yaml](/Users/tiennguyen/Desktop/Deakin/Test%20sever/Nutrihelp-api/PatchNotes_VersionControl.yaml).
- Additional technical and security material is available under [technical_docs](/Users/tiennguyen/Desktop/Deakin/Test%20sever/Nutrihelp-api/technical_docs) and [security](/Users/tiennguyen/Desktop/Deakin/Test%20sever/Nutrihelp-api/security).
