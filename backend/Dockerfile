# ---- LabhPay Backend (FastAPI) ----
# Slim image. PDF/OCR system deps land in Stage 4.

FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# System deps kept minimal at Stage 1
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python deps first for layer caching
COPY backend/requirements.txt /tmp/requirements.txt
RUN pip install -r /tmp/requirements.txt

# Copy backend source + shared packages it imports later
COPY backend/ /app/backend/
COPY shared/  /app/shared/
COPY utils/   /app/utils/

WORKDIR /app/backend

# Non-root user
RUN useradd --create-home --shell /bin/bash labhpay
USER labhpay

ENV PYTHONPATH=/app

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
