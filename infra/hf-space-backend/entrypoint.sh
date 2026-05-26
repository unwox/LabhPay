#!/bin/bash
# Stage 10 — boots API + Celery worker (with beat) in one HF Space.
# Bash specifically because we rely on `wait -n`.

set -e

cd /app/workers
celery -A celery_app worker --beat --loglevel=info &
WORKER_PID=$!

cd /app/backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 &
API_PID=$!

# Graceful shutdown.
trap "kill -TERM ${API_PID} ${WORKER_PID} 2>/dev/null; wait ${API_PID} ${WORKER_PID}" TERM INT

wait -n
EXIT_CODE=$?
kill -TERM ${API_PID} ${WORKER_PID} 2>/dev/null || true
wait || true
exit ${EXIT_CODE}
