CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS ai_knowledge_sources (
    id BIGSERIAL PRIMARY KEY,
    source_type VARCHAR(50) NOT NULL,
    source_id VARCHAR(100) NOT NULL,
    title VARCHAR(500),
    source_path TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    source_text_hash VARCHAR(64),
    indexed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_ai_knowledge_sources_source UNIQUE (source_type, source_id)
);

CREATE TABLE IF NOT EXISTS ai_knowledge_chunks (
    id BIGSERIAL PRIMARY KEY,
    source_pk BIGINT NOT NULL REFERENCES ai_knowledge_sources(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    content_hash VARCHAR(64) NOT NULL,
    embedding_model VARCHAR(100) NOT NULL,
    embedding_dimension INTEGER NOT NULL,
    embedding vector(768),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_ai_knowledge_chunks_source_chunk UNIQUE (source_pk, chunk_index)
);

CREATE TABLE IF NOT EXISTS ai_embedding_jobs (
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
    ON ai_knowledge_sources (source_type, source_id);

CREATE INDEX IF NOT EXISTS idx_ai_knowledge_sources_metadata
    ON ai_knowledge_sources USING gin (metadata);

CREATE INDEX IF NOT EXISTS idx_ai_knowledge_chunks_source_pk
    ON ai_knowledge_chunks (source_pk);

CREATE INDEX IF NOT EXISTS idx_ai_knowledge_chunks_metadata
    ON ai_knowledge_chunks USING gin (metadata);
