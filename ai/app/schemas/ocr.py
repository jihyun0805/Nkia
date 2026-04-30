from pydantic import BaseModel


class BusinessCardOcrLine(BaseModel):
    text: str
    line_index: int
    top: float | None = None
    left: float | None = None
    width: float | None = None
    height: float | None = None


class BusinessCardPaddleOutput(BaseModel):
    raw_text: str | None = None
    lines: list[BusinessCardOcrLine] = []


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
