from pydantic import BaseModel


class BusinessCardOcrResponse(BaseModel):
    company_name: str | None = None
    contact_name: str | None = None
    position: str | None = None
    email: str | None = None
    mobile_phone: str | None = None
    office_phone: str | None = None
    responsibility: str | None = None
    department_name: str | None = None
    raw_text: str | None = None
