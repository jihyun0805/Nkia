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
    position: str | None = None
    address: str | None = None
    email: str | None = None
    mobile_phone: str | None = None
    office_phone: str | None = None
    fax_phone: str | None = None
    responsibility: str | None = None
    department_name: str | None = None
    raw_text: str | None = None
