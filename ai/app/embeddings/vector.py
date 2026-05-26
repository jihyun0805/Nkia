# 인수인계: 파이썬 float 리스트를 pgvector SQL literal로 바꾸는 작은 변환 유틸입니다.
# 핵심 흐름: 색인 저장과 검색 query embedding 모두 같은 포맷을 사용해야 SQL 캐스팅 오류가 나지 않습니다.
# 같이 확인: pgvector 컬럼 타입이나 psycopg 어댑터를 바꾸면 indexing/search repository 호출부를 같이 확인하세요.
from collections.abc import Iterable


def vector_literal(values: Iterable[float]) -> str:
    return "[" + ",".join(f"{value:.8f}" for value in values) + "]"
