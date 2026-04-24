from fastapi import APIRouter, HTTPException, Query
from app.schemas.comment import CommentCreate
from app.db.supabase_client import supabase

router = APIRouter()


def get_user_role(user_id: str) -> str:
    result = supabase.table("users").select("role").eq("id", user_id).execute()
    if not result.data:
        return "user"
    return result.data[0]["role"]


def analyze_comment_text(text: str):
    lower_text = text.lower().strip()

    negation_words = ["no", "not", "never", "still no", "hasn't", "has not"]

    def has_negation_near(keyword: str):
        for neg in negation_words:
            if f"{neg} {keyword}" in lower_text:
                return True
        return False

    recurrence_keywords = [
        "again",
        "every week",
        "everyday",
        "every day",
        "always",
        "repeatedly",
        "still there",
        "keeps coming",
        "happens here",
        "comes back",
        "again and again",
        "often",
        "frequently",
    ]

    urgency_keywords = [
        "smell",
        "bad smell",
        "very bad",
        "dirty",
        "filthy",
        "urgent",
        "danger",
        "hazard",
        "dogs",
        "mosquito",
        "mosquitoes",
        "disease",
        "worse",
        "getting worse",
        "stinking",
        "bad now",
        "bad nowadays",
        "nowadays",
        "bad",
    ]

    resolved_keywords = [
        "cleaned",
        "resolved",
        "gone",
        "removed",
        "cleared",
        "clean now",
        "cleaned now",
        "all clean",
        "fixed",
    ]

    recurrence_flag = any(keyword in lower_text for keyword in recurrence_keywords)
    urgency_flag = any(keyword in lower_text for keyword in urgency_keywords)

    resolved_flag = False
    for keyword in resolved_keywords:
        if keyword in lower_text and not has_negation_near(keyword):
            resolved_flag = True

    if "still" in lower_text:
        resolved_flag = False
        recurrence_flag = True

    tags = []
    if recurrence_flag:
        tags.append("recurring")
    if urgency_flag:
        tags.append("urgent")
    if resolved_flag:
        tags.append("resolved")

    return {
        "recurrence_flag": recurrence_flag,
        "urgency_flag": urgency_flag,
        "resolved_flag": resolved_flag,
        "tags": tags,
    }


@router.post("/reports/{report_id}/comments")
def create_comment(report_id: str, comment: CommentCreate):
    analysis = analyze_comment_text(comment.comment_text)

    data = {
        "report_id": report_id,
        "user_id": comment.user_id,
        "comment_text": comment.comment_text,
        "parent_comment_id": comment.parent_comment_id,
        "recurrence_flag": analysis["recurrence_flag"],
        "urgency_flag": analysis["urgency_flag"],
        "resolved_flag": analysis["resolved_flag"],
        "tags": analysis["tags"],
    }

    try:
        result = supabase.table("report_comments").insert(data).execute()

        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create comment")

        return result.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reports/{report_id}/comments")
def get_comments(report_id: str):
    try:
        result = (
            supabase
            .table("report_comments")
            .select("*")
            .eq("report_id", report_id)
            .execute()
        )
        return result.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/comments/{comment_id}")
def delete_comment(
    comment_id: str,
    requester_user_id: str = Query(...)
):
    try:
        role = get_user_role(requester_user_id)
        if role != "admin":
            raise HTTPException(status_code=403, detail="Only admins can delete comments")

        supabase.table("report_comments").delete().eq("id", comment_id).execute()
        return {"message": "Comment deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))