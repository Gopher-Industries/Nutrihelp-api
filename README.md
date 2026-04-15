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
