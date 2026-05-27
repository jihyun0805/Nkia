# 인수인계 메모: API 스키마 계층입니다. 외부 요청/응답 형태를 고정해 백엔드와 AI 서버 간 계약을 맞춥니다.
# 수정 시 이 파일이 담당하는 경계만 바꾸고, API/스키마 계약 변경은 호출부까지 같이 확인하세요.
from pydantic import BaseModel, Field


class RfpSummaryResponse(BaseModel):
    # 추출된 원문과 AI 요약을 함께 반환해, 사용자가 요약 근거 텍스트도 확인할 수 있게 한다.
    fileName: str
    extension: str
    fileType: str
    extractedTextChars: int = Field(..., ge=0)
    extractedText: str
    summary: str
