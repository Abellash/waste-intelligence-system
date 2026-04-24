from pydantic import BaseModel
from typing import Optional


class FollowUpCreate(BaseModel):
    user_id: str
    response_type: str
    note: Optional[str] = None