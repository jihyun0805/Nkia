# 인수인계: rfp_summary API 스키마 파일입니다.
# 핵심 흐름: 공개 모델: RfpSummaryResponse. 외부 호출 계약을 표현합니다.
# 같이 확인: 필드 추가/삭제는 백엔드 Java DTO와 프론트 TypeScript 타입까지 영향이 있습니다.
from pydantic import BaseModel, Field


class RfpSummaryResponse(BaseModel):
    fileName: str
    extension: str
    fileType: str
    extractedTextChars: int = Field(..., ge=0)
    extractedText: str
    summary: str
