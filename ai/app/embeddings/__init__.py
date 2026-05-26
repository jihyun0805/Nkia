# 인수인계: 임베딩/벡터 처리 패키지입니다.
# 핵심 흐름: 색인 본문을 chunker.py로 나누고 model.py에서 SentenceTransformer 임베딩을 만든 뒤 vector.py 형식으로 DB에 넣습니다.
# 같이 확인: 모델명이나 dimension 변경 시 pgvector 컬럼과 전체 reindex가 필요합니다.
"""Embedding utilities for AI knowledge indexing."""
