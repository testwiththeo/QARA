FROM python:3.12-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY api/requirements*.txt ./
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir --no-deps -r requirements.txt 2>/dev/null || true

FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev curl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

COPY api/ .
COPY infra/docker/healthcheck.sh /healthcheck.sh
RUN chmod +x /healthcheck.sh

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
    CMD /healthcheck.sh api /health

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
