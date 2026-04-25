# NutriHelp Backend API
This is the backend API for the NutriHelp project. It is a RESTful API that provides the necessary endpoints for the frontend to interact with the database.

## Docker-First Setup
1. Open a terminal and navigate to the directory where you want to clone the repository.
2. Run the following command to clone the repository:
```bash
git clone https://github.com/Gopher-Industries/Nutrihelp-api
```
3. Navigate to the project directory:
```bash
cd Nutrihelp-api
```
4. Contact a project maintainer to get the shared `.env` file and place it in the project root.
5. Start the backend with Docker Compose:
```bash
docker compose up --build
```
The backend will be available at `http://localhost:80`.

## Dockerized Development Environment
Docker is the recommended local development path for this backend. A contributor only needs Docker and the shared `.env` file; Node.js, Python, TensorFlow, numpy, and related system packages are installed inside the container.

### Quick Validation
Validate the backend container with the shared `.env`:

```bash
curl http://localhost:80/api/system/health
```

Validate the AI runtime inside the running container:

```bash
docker compose exec api python -c "import tensorflow as tf; print(tf.__version__)"
docker compose exec api python -c "import numpy, pandas, seaborn, sklearn, matplotlib; print('python-ai-runtime-ok')"
```

Validate a backend test suite once the container is up:

```bash
docker compose exec api npm test
```

### Runtime Audit
Required runtime components:

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

Optional / experimental runtime components:

| Component | Notes |
| --- | --- |
| `INSTALL_PY_DEPS=false` build arg | Lets the image build without Python AI dependencies for troubleshooting only; not suitable for validating AI features |

### Docker Build
Build and run the API directly from this repo:

```bash
docker build -t nutrihelp-api --target prod .
docker run --rm -p 80:80 --env-file .env nutrihelp-api
```

If your machine or architecture has trouble installing TensorFlow during image build, you can temporarily skip Python dependencies for debugging the Node-only runtime:

```bash
docker build -t nutrihelp-api --target prod --build-arg INSTALL_PY_DEPS=false .
```

### Docker Compose (recommended for local dev)
From the `Nutrihelp-api` folder:

```bash
docker compose up --build
```

Common troubleshooting tips:

- If port `80` is already in use, stop the other process or change the host port mapping in `docker-compose.yml`.
- If the AI image build is slow, let the TensorFlow wheel finish downloading; the first build is much slower than rebuilds.
- If model-related endpoints fail, confirm the model file exists at `prediction_models/best_model_class.hdf5`.
- If environment validation fails, confirm the shared `.env` file is present in the project root before starting Docker Compose.

## Legacy Local Setup
Docker is the supported development workflow for this repository. If you need to run the backend directly on your host for debugging, install the required Node.js and Python dependencies manually and start the server with `npm start`.

## Endpoints
The API is documented using OpenAPI 3.0, located in `index.yaml`.
You can view the documentation by navigating to `http://localhost:80/api-docs` in your browser.

## Frontend / Mobile Integration Notes
The backend no longer exposes a separate `/api/mobile` namespace. Frontend and mobile clients should use the existing shared API routes.

Recommended routes and response contracts:

- `POST /api/auth/register`: returns `{ success, data: { user }, meta: { message } }`
- `POST /api/auth/login`: returns `{ success, data: { user, session } }`
- `POST /api/auth/refresh`: returns `{ success, data: { session } }`
- `POST /api/auth/logout`: returns `{ success, data: null, meta: { message } }`
- `GET /api/auth/profile`: returns `{ success, data: { user } }`
- `GET /api/notifications`: preferred for the signed-in user; supports optional `status` and `limit`
- `GET /api/notifications/:user_id`: admin-oriented variant for fetching another user's notifications
- `GET /api/mealplan`: uses the bearer token for normal users; admin and nutritionist clients may optionally pass `?user_id=<id>`
- `POST /api/recommendations`: returns `{ success, data: { items }, meta }`

Compatibility guidance:

- Prefer using the authenticated user from the access token instead of sending `user_id` in request bodies for client-owned screens.
- Treat empty lists as successful responses. Notifications and meal plans now return `200` with empty `items` instead of using `404` for “no data”.
- Read `data` and `meta` consistently for the routes above. New client work should avoid depending on older raw payload shapes.
- Send refresh tokens only to `/api/auth/refresh` and `/api/auth/logout`. Access tokens should continue to be sent as `Authorization: Bearer <token>`.

## Automated Testing
This repository uses `mocha` for the main automated test suite.

1. Install dependencies:
```bash
npm install
```
2. Run the full test suite:
```bash
npm test
```
3. Run a focused test file directly with Mocha:
```bash
./node_modules/.bin/mocha ./test/recommendationController.test.js
```
4. If a test suite depends on the running API server or Docker services, start the backend first with:
```bash
docker compose up --build
```

/\ Please refer to the "PatchNotes_VersionControl" file for  /\
/\ recent updates and changes made through each version.     /\
