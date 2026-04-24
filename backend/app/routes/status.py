from fastapi import APIRouter, HTTPException
from app.db.supabase_client import supabase
from app.services.trust_service import increment_confirmed_reports_count

router = APIRouter()


VALID_STATUSES = ["reported", "under_review", "dispatched", "resolved"]


def get_user_role(user_id: str) -> str:
    result = supabase.table("users").select("role").eq("id", user_id).execute()
    if not result.data:
        return "user"
    return result.data[0]["role"]


@router.post("/reports/{report_id}/status")
def update_report_status(report_id: str, payload: dict):
    try:
        requester_user_id = payload.get("requester_user_id")
        new_status = payload.get("status")

        if not requester_user_id:
            raise HTTPException(status_code=400, detail="requester_user_id is required")

        if new_status not in VALID_STATUSES:
            raise HTTPException(status_code=400, detail="Invalid status")

        role = get_user_role(requester_user_id)
        if role != "admin":
            raise HTTPException(status_code=403, detail="Only admins can update report status")

        existing = supabase.table("waste_reports").select("*").eq("id", report_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Report not found")

        report = existing.data[0]

        update_data = {"status": new_status}

        if new_status == "resolved":
            from datetime import datetime, timezone
            update_data["resolved_at"] = datetime.now(timezone.utc).isoformat()

        result = (
            supabase
            .table("waste_reports")
            .update(update_data)
            .eq("id", report_id)
            .execute()
        )

        if new_status == "resolved":
            reporter_id = report.get("user_id")
            if reporter_id:
                increment_confirmed_reports_count(reporter_id)

        return {
            "message": "Report status updated successfully",
            "report": result.data[0]
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))