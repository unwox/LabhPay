# ---- LabhPay Worker (Celery) ----
# PDF / OCR system libraries land in Stage 4.

FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY workers/requirements.txt /tmp/requirements.txt
RUN pip install -r /tmp/requirements.txt

# Source: worker code + shared packages
COPY workers/  /app/workers/
COPY shared/   /app/shared/
COPY utils/    /app/utils/
COPY parsers/  /app/parsers/
COPY ai_gateway/ /app/ai_gateway/

WORKDIR /app/workers

RUN useradd --create-home --shell /bin/bash labhpay
USER labhpay

ENV PYTHONPATH=/app:/app/workers

CMD ["celery", "-A", "celery_app", "worker", "--loglevel=INFO", "--concurrency=2"]
