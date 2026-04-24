from pydantic import BaseModel
from typing import Optional


class ReportCreate(BaseModel):
    user_id: str
    image_url: str
    latitude: float
    longitude: float
    user_comment: Optional[str] = None


class ReportResponse(BaseModel):
    id: str
    status: str