\set ON_ERROR_STOP on

DO $do$
DECLARE
    ai_db_user text := '__AI_DB_USER__';
    ai_db_password text := '__AI_DB_PASSWORD__';
BEGIN
    IF ai_db_user IS NULL OR ai_db_user = '' THEN
        RAISE EXCEPTION 'ai_db_user psql variable is required';
    END IF;

    IF ai_db_password IS NULL THEN
        RAISE EXCEPTION 'ai_db_password psql variable is required';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = ai_db_user) THEN
        EXECUTE format('CREATE ROLE %I LOGIN PASSWORD %L', ai_db_user, ai_db_password);
    ELSE
        EXECUTE format('ALTER ROLE %I WITH LOGIN PASSWORD %L', ai_db_user, ai_db_password);
    END IF;

    EXECUTE format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), ai_db_user);
    EXECUTE format(
        'ALTER ROLE %I IN DATABASE %I SET search_path TO ai, public',
        ai_db_user,
        current_database()
    );
END
$do$;

CREATE EXTENSION IF NOT EXISTS vector;
CREATE SCHEMA IF NOT EXISTS ai;

CREATE TABLE IF NOT EXISTS ai.ai_knowledge_sources (
    id BIGSERIAL PRIMARY KEY,
    source_type VARCHAR(50) NOT NULL,
    source_id VARCHAR(100) NOT NULL,
    title VARCHAR(500),
    source_path TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    source_text_hash VARCHAR(64),
    indexed_at TIMESTAMPTZ,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMPTZ,
    last_event_id VARCHAR(120),
    last_event_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_ai_knowledge_sources_source UNIQUE (source_type, source_id)
);

CREATE TABLE IF NOT EXISTS ai.ai_knowledge_chunks (
    id BIGSERIAL PRIMARY KEY,
    source_pk BIGINT NOT NULL REFERENCES ai.ai_knowledge_sources(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    content_hash VARCHAR(64) NOT NULL,
    content_tsv tsvector GENERATED ALWAYS AS (to_tsvector('simple', content)) STORED,
    embedding_model VARCHAR(100) NOT NULL,
    embedding_dimension INTEGER NOT NULL,
    embedding vector(768),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_ai_knowledge_chunks_source_chunk UNIQUE (source_pk, chunk_index)
);

CREATE TABLE IF NOT EXISTS ai.ai_embedding_jobs (
    id BIGSERIAL PRIMARY KEY,
    source_type VARCHAR(50) NOT NULL,
    source_id VARCHAR(100) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    error_message TEXT,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ
);

ALTER TABLE ai.ai_knowledge_sources
    ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_event_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS last_event_at TIMESTAMPTZ;

ALTER TABLE ai.ai_knowledge_chunks
    ADD COLUMN IF NOT EXISTS content_tsv tsvector GENERATED ALWAYS AS (to_tsvector('simple', content)) STORED;

CREATE INDEX IF NOT EXISTS idx_ai_knowledge_sources_type_id
    ON ai.ai_knowledge_sources (source_type, source_id);

CREATE INDEX IF NOT EXISTS idx_ai_knowledge_sources_metadata
    ON ai.ai_knowledge_sources USING gin (metadata);

CREATE INDEX IF NOT EXISTS idx_ai_knowledge_sources_active
    ON ai.ai_knowledge_sources (source_type, source_id)
    WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_ai_knowledge_sources_last_event
    ON ai.ai_knowledge_sources (last_event_id)
    WHERE last_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_knowledge_chunks_source_pk
    ON ai.ai_knowledge_chunks (source_pk);

CREATE INDEX IF NOT EXISTS idx_ai_knowledge_chunks_metadata
    ON ai.ai_knowledge_chunks USING gin (metadata);

CREATE INDEX IF NOT EXISTS idx_ai_knowledge_chunks_content_tsv
    ON ai.ai_knowledge_chunks USING gin (content_tsv);

CREATE INDEX IF NOT EXISTS idx_ai_knowledge_chunks_embedding_hnsw
    ON ai.ai_knowledge_chunks
    USING hnsw (embedding vector_cosine_ops);

DO $do$
DECLARE
    checkpoint_table text;
BEGIN
    FOREACH checkpoint_table IN ARRAY ARRAY[
        'checkpoints',
        'checkpoint_blobs',
        'checkpoint_writes',
        'checkpoint_migrations'
    ]
    LOOP
        IF to_regclass(format('public.%I', checkpoint_table)) IS NULL THEN
            CONTINUE;
        END IF;

        IF to_regclass(format('ai.%I', checkpoint_table)) IS NOT NULL THEN
            RAISE EXCEPTION
                'LangGraph checkpoint table conflict: public.% and ai.% both exist. Resolve manually before migration.',
                checkpoint_table,
                checkpoint_table;
        END IF;

        RAISE NOTICE 'Moving LangGraph checkpoint table public.% to ai.%', checkpoint_table, checkpoint_table;
        EXECUTE format('ALTER TABLE public.%I SET SCHEMA ai', checkpoint_table);
    END LOOP;
END
$do$;

DO $do$
DECLARE
    ai_db_user text := '__AI_DB_USER__';
BEGIN
    EXECUTE format('GRANT USAGE ON SCHEMA public TO %I', ai_db_user);
    EXECUTE format('GRANT SELECT ON ALL TABLES IN SCHEMA public TO %I', ai_db_user);
    EXECUTE format('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO %I', ai_db_user);
    EXECUTE format(
        'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO %I',
        ai_db_user
    );
    EXECUTE format(
        'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO %I',
        ai_db_user
    );
    EXECUTE format('GRANT USAGE ON SCHEMA ai TO %I', ai_db_user);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA ai TO %I', ai_db_user);
    EXECUTE format('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA ai TO %I', ai_db_user);
    EXECUTE format(
        'ALTER DEFAULT PRIVILEGES IN SCHEMA ai GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO %I',
        ai_db_user
    );
    EXECUTE format(
        'ALTER DEFAULT PRIVILEGES IN SCHEMA ai GRANT USAGE, SELECT ON SEQUENCES TO %I',
        ai_db_user
    );
END
$do$;
