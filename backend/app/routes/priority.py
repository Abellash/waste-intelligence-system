from fastapi import APIRouter, HTTPException
from app.db.supabase_client import supabase
from app.services.priority_service import calculate_priority_score

router = APIRouter()


@router.post("/reports/{report_id}/recalculate-priority")
def recalculate_priority(report_id: str):
    try:
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

        priority_score = calculate_priority_score(
            report.get("severity_label"),
            comments,
            report.get("user_id"),
        )

        update_result = (
            supabase
            .table("waste_reports")
            .update({"priority_score": priority_score})
            .eq("id", report_id)
            .execute()
        )

        return {
            "message": "Priority recalculated successfully",
            "report_id": report_id,
            "priority_score": priority_score,
            "updated_report": update_result.data[0] if update_result.data else None
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))