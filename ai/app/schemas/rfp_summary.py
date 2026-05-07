from pydantic import BaseModel, Field


class RfpSummaryResponse(BaseModel):
    fileName: str
    extension: str
    fileType: str
    extractedTextChars: int = Field(..., ge=0)
    extractedText: str
    summary: str
