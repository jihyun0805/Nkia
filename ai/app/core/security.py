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
