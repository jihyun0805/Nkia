# 인수인계: ocr API 스키마 파일입니다.
# 핵심 흐름: 공개 모델: BusinessCardOcrLine, BusinessCardPaddleOutput, BusinessCardOcrResponse. 외부 호출 계약을 표현합니다.
# 같이 확인: 필드 추가/삭제는 백엔드 Java DTO와 프론트 TypeScript 타입까지 영향이 있습니다.
from pydantic import BaseModel, Field


class BusinessCardOcrLine(BaseModel):
    text: str
    line_index: int
    top: float | None = None
    left: float | None = None
    width: float | None = None
    height: float | None = None


class BusinessCardPaddleOutput(BaseModel):
    raw_text: str | None = None
    lines: list[BusinessCardOcrLine] = Field(default_factory=list)


class BusinessCardOcrResponse(BaseModel):
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
