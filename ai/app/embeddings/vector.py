# 인수인계 메모: 임베딩 계층입니다. 원문을 검색 가능한 청크로 나누고, 문서/질문 prefix를 붙여 같은 벡터 공간에 올립니다.
# 수정 시 이 파일이 담당하는 경계만 바꾸고, API/스키마 계약 변경은 호출부까지 같이 확인하세요.
from collections.abc import Iterable


def vector_literal(values: Iterable[float]) -> str:
    return "[" + ",".join(f"{value:.8f}" for value in values) + "]"
