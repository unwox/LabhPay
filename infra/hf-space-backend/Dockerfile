# Stage 10 — HF Space backend Dockerfile.
#
# This image wraps the canonical backend image and starts both the FastAPI
# API and the Celery worker (with beat) in the same container. HF Spaces
# only exposes a single port, so we put the API on 8000 and run the
# worker as a sibling process. Redis is external.

FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1 \
    PYTHONPATH=/app

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    poppler-utils \
    tesseract-ocr \
    libgl1 \
    && rm -rf /var/lib/apt/lists/*

# Install both backend + worker deps.
COPY backend/requirements.txt /tmp/backend.txt
COPY workers/requirements.txt /tmp/workers.txt
RUN pip install -r /tmp/backend.txt -r /tmp/workers.txt

# Copy sources.
COPY backend/    /app/backend/
COPY workers/    /app/workers/
COPY shared/     /app/shared/
COPY utils/      /app/utils/
COPY parsers/    /app/parsers/
COPY ai_gateway/ /app/ai_gateway/

COPY infra/hf-space-backend/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

RUN useradd --create-home --shell /bin/bash labhpay \
    && chown -R labhpay /app
USER labhpay

EXPOSE 8000
CMD ["/entrypoint.sh"]
