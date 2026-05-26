# 인수인계 메모: AI 챗봇 공통 코드입니다. 다른 계층에서 재사용하는 설정, 보안, 어댑터, 도구 함수를 담습니다.
# 수정 시 이 파일이 담당하는 경계만 바꾸고, API/스키마 계약 변경은 호출부까지 같이 확인하세요.
import hmac

from fastapi import Header, HTTPException, status

from app.core.config import settings


def require_internal_token(x_orbis_internal_token: str | None = Header(default=None)) -> None:
    expected_token = settings.ai_internal_token
    if not expected_token:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI_INTERNAL_TOKEN environment variable is not configured.",
        )
    if not x_orbis_internal_token or not hmac.compare_digest(x_orbis_internal_token, expected_token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid internal AI token.",
        )
