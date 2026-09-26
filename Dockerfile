# Pinned Node LTS base image for reproducible local development.
FROM node:22-bookworm@sha256:f90672bf4c76dfc077d17be4c115b1ae7731d2e8558b457d86bca42aeb193866 AS base

WORKDIR /usr/src/app

# System deps:
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    python3.11 \
    python3-pip \
    python3.11-venv \
    python-is-python3 \
    build-essential \
  && rm -rf /var/lib/apt/lists/*

# Python deps
ARG INSTALL_PY_DEPS=true
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV VIRTUAL_ENV=/opt/venv
RUN python -m venv "$VIRTUAL_ENV"
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

COPY requirements.txt ./
RUN if [ "$INSTALL_PY_DEPS" = "true" ]; then \
      pip install --no-cache-dir --upgrade pip setuptools wheel \
      && pip install --no-cache-dir -r requirements.txt; \
    fi

# Node deps (install before copying full source for better caching)
COPY package.json package-lock.json ./

FROM base AS deps-dev
RUN npm ci

FROM base AS deps-prod
RUN npm ci --omit=dev

FROM deps-dev AS dev
COPY . .
RUN mkdir -p uploads uploads/temp logs \
  && chown -R node:node /usr/src/app
USER node
ENV NODE_ENV=development
EXPOSE 80
CMD ["npm", "run", "dev"]

FROM deps-prod AS prod
COPY . .
RUN mkdir -p uploads uploads/temp logs \
  && chown -R node:node /usr/src/app
USER node
ENV NODE_ENV=production
EXPOSE 80
CMD ["npm", "start"]
