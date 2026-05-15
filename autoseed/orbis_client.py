"""Orbis 백엔드 REST 호출 래퍼.

- JWT 로그인 + Bearer 헤더 자동 부착
- ApiResponse(success/fail) 언래핑
- 4xx/5xx 발생 시 메시지 포함하여 예외
- 여러 유저로 동시에 세션 유지 가능 (`OrbisClient.login(email, password)` 각각 보관)

`http://localhost:8080/api/v1` 기본 (환경변수 ORBIS_BASE_URL 로 변경).
"""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass, field
from typing import Any

import requests

logger = logging.getLogger(__name__)

DEFAULT_BASE_URL = os.environ.get("ORBIS_BASE_URL", "http://localhost:8080/api/v1")


class OrbisApiError(RuntimeError):
    """백엔드 API 호출이 실패했을 때 raise."""

    def __init__(self, status: int, error_code: str | None, message: str | None, body: Any = None) -> None:
        super().__init__(f"[{status}] {error_code or ''} {message or ''}".strip())
        self.status = status
        self.error_code = error_code
        self.message = message
        self.body = body


@dataclass
class UserSession:
    email: str
    access_token: str
    refresh_token: str
    user_id: str | None = None
    name: str | None = None


@dataclass
class OrbisClient:
    base_url: str = DEFAULT_BASE_URL
    timeout: float = 30.0
    sessions: dict[str, UserSession] = field(default_factory=dict)

    # ── 인증 ─────────────────────────────────────────────────────────
    def login(self, email: str, password: str) -> UserSession:
        url = f"{self.base_url}/auth/login"
        response = requests.post(url, json={"email": email, "password": password}, timeout=self.timeout)
        payload = self._unwrap(response)
        session = UserSession(
            email=email,
            access_token=payload["accessToken"],
            refresh_token=payload["refreshToken"],
        )
        self.sessions[email] = session
        try:
            me = self.get("/user/me", email)
            session.user_id = me.get("userId")
            session.name = me.get("name")
        except OrbisApiError as exc:
            logger.warning("login %s succeeded but /user/me failed: %s", email, exc)
        return session

    def headers(self, email: str) -> dict[str, str]:
        session = self.sessions.get(email)
        if not session:
            raise RuntimeError(f"세션 없음: {email} → login() 먼저 호출하세요")
        return {
            "Authorization": f"Bearer {session.access_token}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        }

    # ── HTTP 메서드 ─────────────────────────────────────────────────
    def get(self, path: str, as_user: str, params: dict[str, Any] | None = None) -> Any:
        response = requests.get(
            f"{self.base_url}{path}",
            headers=self.headers(as_user),
            params=params,
            timeout=self.timeout,
        )
        return self._unwrap(response)

    def post(self, path: str, as_user: str, json: dict[str, Any] | None = None) -> Any:
        response = requests.post(
            f"{self.base_url}{path}",
            headers=self.headers(as_user),
            json=json or {},
            timeout=self.timeout,
        )
        return self._unwrap(response)

    def put(self, path: str, as_user: str, json: dict[str, Any] | None = None) -> Any:
        response = requests.put(
            f"{self.base_url}{path}",
            headers=self.headers(as_user),
            json=json or {},
            timeout=self.timeout,
        )
        return self._unwrap(response)

    def patch(self, path: str, as_user: str, json: dict[str, Any] | None = None) -> Any:
        response = requests.patch(
            f"{self.base_url}{path}",
            headers=self.headers(as_user),
            json=json or {},
            timeout=self.timeout,
        )
        return self._unwrap(response)

    def delete(self, path: str, as_user: str) -> Any:
        response = requests.delete(
            f"{self.base_url}{path}",
            headers=self.headers(as_user),
            timeout=self.timeout,
        )
        return self._unwrap(response)

    # ── 응답 처리 ──────────────────────────────────────────────────
    @staticmethod
    def _unwrap(response: requests.Response) -> Any:
        try:
            body = response.json()
        except ValueError:
            body = None

        if response.status_code >= 400:
            err_code = body.get("errorCode") if isinstance(body, dict) else None
            err_msg = body.get("message") if isinstance(body, dict) else response.text[:200]
            raise OrbisApiError(response.status_code, err_code, err_msg, body)

        if isinstance(body, dict) and "result" in body:
            if body.get("result") != "SUCCESS":
                raise OrbisApiError(
                    response.status_code,
                    body.get("errorCode"),
                    body.get("message"),
                    body,
                )
            return body.get("data")

        return body
