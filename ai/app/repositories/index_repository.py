import json
from datetime import datetime
from typing import Any

import psycopg


REQUIRED_RELATIONS = (
    "ai.ai_knowledge_sources",
    "ai.ai_knowledge_chunks",
    "ai.ai_embedding_jobs",
)


def validate_indexing_schema(conn: psycopg.Connection) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT extname
            FROM pg_extension
            WHERE extname = 'vector'
            """
        )
        if cur.fetchone() is None:
            raise RuntimeError("pgvector extension is not installed. Apply AI DB migration first.")

        for relation_name in REQUIRED_RELATIONS:
            cur.execute("SELECT to_regclass(%s) AS relation_name", (relation_name,))
            row = cur.fetchone()
            if not row or row["relation_name"] is None:
                raise RuntimeError(
                    f"Required AI relation '{relation_name}' does not exist. Apply AI DB migration first."
                )


def fetch_source_for_update(
    conn: psycopg.Connection,
    *,
    source_type: str,
    source_id: str,
) -> dict[str, Any] | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT *
            FROM ai.ai_knowledge_sources
            WHERE source_type = %s
              AND source_id = %s
            FOR UPDATE
            """,
            (source_type, source_id),
        )
        return cur.fetchone()


def upsert_source(
    conn: psycopg.Connection,
    *,
    source_type: str,
    source_id: str,
    title: str | None,
    source_path: str | None,
    metadata: dict[str, Any],
    source_text_hash: str,
    event_id: str | None,
    occurred_at: datetime | None,
) -> int:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO ai.ai_knowledge_sources (
                source_type,
                source_id,
                title,
                source_path,
                metadata,
                source_text_hash,
                indexed_at,
                updated_at,
                is_deleted,
                deleted_at,
                last_event_id,
                last_event_at
            )
            VALUES (%s, %s, %s, %s, %s::jsonb, %s, now(), now(), false, NULL, %s, %s)
            ON CONFLICT (source_type, source_id)
            DO UPDATE SET
                title = EXCLUDED.title,
                source_path = EXCLUDED.source_path,
                metadata = EXCLUDED.metadata,
                source_text_hash = EXCLUDED.source_text_hash,
                indexed_at = now(),
                updated_at = now(),
                is_deleted = false,
                deleted_at = NULL,
                last_event_id = EXCLUDED.last_event_id,
                last_event_at = EXCLUDED.last_event_at
            RETURNING id
            """,
            (
                source_type,
                source_id,
                title,
                source_path,
                json.dumps(metadata, ensure_ascii=False),
                source_text_hash,
                event_id,
                occurred_at,
            ),
        )
        row = cur.fetchone()
        return int(row["id"])


def replace_chunks(
    conn: psycopg.Connection,
    *,
    source_pk: int,
    chunks: list[str],
    embeddings: list[str],
    embedding_model: str,
    embedding_dimension: int,
    chunk_metadata: dict[str, Any],
    content_hashes: list[str],
) -> None:
    with conn.cursor() as cur:
        cur.execute("DELETE FROM ai.ai_knowledge_chunks WHERE source_pk = %s", (source_pk,))
        for index, content in enumerate(chunks):
            cur.execute(
                """
                INSERT INTO ai.ai_knowledge_chunks (
                    source_pk,
                    chunk_index,
                    content,
                    content_hash,
                    embedding_model,
                    embedding_dimension,
                    embedding,
                    metadata
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s::vector, %s::jsonb)
                """,
                (
                    source_pk,
                    index,
                    content,
                    content_hashes[index],
                    embedding_model,
                    embedding_dimension,
                    embeddings[index],
                    json.dumps({**chunk_metadata, "chunkIndex": index, "chunkCount": len(chunks)}, ensure_ascii=False),
                ),
            )


def mark_source_deleted(
    conn: psycopg.Connection,
    *,
    source_type: str,
    source_id: str,
    title: str | None,
    source_path: str | None,
    metadata: dict[str, Any],
    deleted_at: datetime | None,
    event_id: str | None,
    occurred_at: datetime | None,
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO ai.ai_knowledge_sources (
                source_type,
                source_id,
                title,
                source_path,
                metadata,
                indexed_at,
                updated_at,
                is_deleted,
                deleted_at,
                last_event_id,
                last_event_at
            )
            VALUES (%s, %s, %s, %s, %s::jsonb, now(), now(), true, COALESCE(%s, now()), %s, %s)
            ON CONFLICT (source_type, source_id)
            DO UPDATE SET
                title = COALESCE(EXCLUDED.title, ai.ai_knowledge_sources.title),
                source_path = COALESCE(EXCLUDED.source_path, ai.ai_knowledge_sources.source_path),
                metadata = ai.ai_knowledge_sources.metadata || EXCLUDED.metadata,
                updated_at = now(),
                is_deleted = true,
                deleted_at = EXCLUDED.deleted_at,
                last_event_id = EXCLUDED.last_event_id,
                last_event_at = EXCLUDED.last_event_at
            RETURNING id
            """,
            (
                source_type,
                source_id,
                title,
                source_path,
                json.dumps(metadata, ensure_ascii=False),
                deleted_at,
                event_id,
                occurred_at,
            ),
        )
        row = cur.fetchone()
        source_pk = int(row["id"])
        cur.execute("DELETE FROM ai.ai_knowledge_chunks WHERE source_pk = %s", (source_pk,))
