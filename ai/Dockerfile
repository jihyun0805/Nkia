FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    OMP_NUM_THREADS=2 \
    MKL_NUM_THREADS=2 \
    HF_HOME=/models/huggingface \
    SENTENCE_TRANSFORMERS_HOME=/models/sentence-transformers \
    TOKENIZERS_PARALLELISM=false

WORKDIR /app

COPY --from=ghcr.io/astral-sh/uv:0.6.14 /uv /uvx /bin/

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml uv.lock ./
RUN uv sync --no-dev

COPY app ./app
COPY db ./db
COPY scripts ./scripts

ENV PATH="/app/.venv/bin:$PATH"

RUN chmod +x ./scripts/start-ai.sh ./db/migrate_existing_db.sh

EXPOSE 8000

HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=5 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health').read()"

CMD ["sh", "./scripts/start-ai.sh"]
