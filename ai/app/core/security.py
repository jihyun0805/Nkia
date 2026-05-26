# 인수인계: AI 내부 API 접근 제어 헬퍼입니다. 백엔드에서 온 내부 토큰이나 권한 컨텍스트 검증을 담당합니다.
# 핵심 흐름: 운영에서 AI API를 직접 노출하지 않기 위해 백엔드 프록시와 같은 인증 규칙을 맞춰야 합니다.
# 같이 확인: 인증 정책 변경 시 backend ChatbotProxyController와 배포 env의 토큰 값을 같이 확인하세요.
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
