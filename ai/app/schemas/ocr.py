# 인수인계 메모: API 스키마 계층입니다. 외부 요청/응답 형태를 고정해 백엔드와 AI 서버 간 계약을 맞춥니다.
# 수정 시 이 파일이 담당하는 경계만 바꾸고, API/스키마 계약 변경은 호출부까지 같이 확인하세요.
from pydantic import BaseModel, Field


class BusinessCardOcrLine(BaseModel):
    # PaddleOCR가 인식한 한 줄의 텍스트와 이미지 내 위치 정보를 담는다.
    text: str
    line_index: int
    top: float | None = None
    left: float | None = None
    width: float | None = None
    height: float | None = None


class BusinessCardPaddleOutput(BaseModel):
    # 후처리 전 OCR 원문을 확인할 때 사용하는 응답 모델이다.
    raw_text: str | None = None
    lines: list[BusinessCardOcrLine] = Field(default_factory=list)


class BusinessCardOcrResponse(BaseModel):
    # 명함에서 최종 추출한 업무 연락처 필드를 클라이언트 계약 형태로 고정한다.
    company_name: str | None = None
    contact_name: str | None = None
    department: str | None = None
    role: str | None = None
    position: str | None = None
    address: str | None = None
    email: str | None = None
    mobile: str | None = None
    phone: str | None = None
    fax: str | None = None
    raw_text: str | None = None
