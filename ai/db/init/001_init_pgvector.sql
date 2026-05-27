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
