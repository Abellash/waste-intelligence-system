from fastapi import APIRouter, HTTPException
from app.db.supabase_client import supabase
from app.schemas.followup import FollowUpCreate
from app.services.priority_service import calculate_priority_score

router = APIRouter()


VALID_RESPONSES = ["cleaned", "still_there", "worse", "not_sure"]


def recalculate_priority_with_followups(report_id: str):
    report_result = (
        supabase
        .table("waste_reports")
        .select("*")
        .eq("id", report_id)
        .execute()
    )

    if not report_result.data:
        raise HTTPException(status_code=404, detail="Report not found")

    report = report_result.data[0]

    comments_result = (
        supabase
        .table("report_comments")
        .select("*")
        .eq("report_id", report_id)
        .execute()
    )

    comments = comments_result.data or []

    base_priority = calculate_priority_score(
        report.get("severity_label"),
        comments,
        report.get("user_id"),
    )

    followups_result = (
        supabase
        .table("follow_ups")
        .select("*")
        .eq("report_id", report_id)
        .execute()
    )

    followups = followups_result.data or []

    still_there_count = sum(1 for f in followups if f["response_type"] == "still_there")
    worse_count = sum(1 for f in followups if f["response_type"] == "worse")
    cleaned_count = sum(1 for f in followups if f["response_type"] == "cleaned")

    priority_score = base_priority

    if still_there_count > 0:
        priority_score += 1

    if worse_count > 0:
        priority_score += 2

    if cleaned_count >= 2:
        priority_score = max(0, priority_score - 2)

    priority_score = round(priority_score, 2)

    update_data = {
        "priority_score": priority_score
    }

    if cleaned_count >= 2:
        update_data["status"] = "resolved"

    supabase.table("waste_reports").update(update_data).eq("id", report_id).execute()

    return priority_score


@router.post("/reports/{report_id}/followups")
def create_followup(report_id: str, followup: FollowUpCreate):
    try:
        if followup.response_type not in VALID_RESPONSES:
            raise HTTPException(status_code=400, detail="Invalid follow-up response type")

        data = {
            "report_id": report_id,
            "user_id": followup.user_id,
            "response_type": followup.response_type,
            "note": followup.note,
        }

        result = supabase.table("follow_ups").insert(data).execute()

        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create follow-up")

        priority_score = recalculate_priority_with_followups(report_id)

        return {
            "message": "Follow-up added successfully",
            "followup": result.data[0],
            "updated_priority_score": priority_score,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reports/{report_id}/followups")
def get_followups(report_id: str):
    try:
        result = (
            supabase
            .table("follow_ups")
            .select("*")
            .eq("report_id", report_id)
            .order("created_at", desc=False)
            .execute()
        )
        return result.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/followups/recent")
def get_recent_followups():
    try:
        result = (
            supabase
            .table("follow_ups")
            .select("*")
            .order("created_at", desc=True)
            .limit(20)
            .execute()
        )
        return result.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))