from pydantic import BaseModel
from typing import Optional


class CommentCreate(BaseModel):
    user_id: str
    comment_text: str
    parent_comment_id: Optional[str] = None