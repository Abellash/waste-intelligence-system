from fastapi import APIRouter, HTTPException, Query
from app.schemas.report import ReportCreate
from app.db.supabase_client import supabase
from app.services.trust_service import ensure_user_exists, increment_reports_count
from app.services.priority_service import calculate_priority_score, get_user_trust_score

router = APIRouter()


def get_user_role(user_id: str) -> str:
    result = supabase.table("users").select("role").eq("id", user_id).execute()
    if not result.data:
        return "user"
    return result.data[0].get("role", "user")


def safe_get_comments(report_id: str) -> list[dict]:
    try:
        result = (
            supabase.table("comments")
            .select("id, urgency_flag, recurrence_flag, resolved_flag")
            .eq("report_id", report_id)
            .execute()
        )
        return result.data or []
    except Exception:
        return []


def safe_get_latest_followup(report_id: str):
    try:
        result = (
            supabase.table("followups")
            .select("*")
            .eq("report_id", report_id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if not result.data:
            return None

        row = result.data[0]

        # support multiple possible column names
        return (
            row.get("status")
            or row.get("followup_type")
            or row.get("update_type")
            or row.get("state")
        )
    except Exception:
        return None


def safe_get_reporter_info(user_id: str | None) -> dict:
    if not user_id:
        return {
            "user_id": None,
            "trust_score": 1.0,
            "reports_count": 0,
            "confirmed_reports_count": 0,
        }

    try:
        result = (
            supabase.table("users")
            .select("trust_score, reports_count, confirmed_reports_count")
            .eq("id", user_id)
            .execute()
        )

        if not result.data:
            return {
                "user_id": user_id,
                "trust_score": 1.0,
                "reports_count": 0,
                "confirmed_reports_count": 0,
            }

        user = result.data[0]
        return {
            "user_id": user_id,
            "trust_score": float(user.get("trust_score") or 1.0),
            "reports_count": int(user.get("reports_count") or 0),
            "confirmed_reports_count": int(user.get("confirmed_reports_count") or 0),
        }
    except Exception:
        return {
            "user_id": user_id,
            "trust_score": 1.0,
            "reports_count": 0,
            "confirmed_reports_count": 0,
        }


def enrich_report_for_demo(report: dict) -> dict:
    report_id = report.get("id")
    reporter_user_id = report.get("user_id")

    comments = safe_get_comments(report_id)

    try:
        priority_score = calculate_priority_score(
            severity_label=report.get("severity_label"),
            comments=comments,
            reporter_user_id=reporter_user_id,
        )
    except Exception:
        # never break report loading
        priority_score = 1.0

    latest_followup = safe_get_latest_followup(report_id)
    reporter = safe_get_reporter_info(reporter_user_id)

    hotspot_id = report.get("hotspot_id")
    ai_status = report.get("ai_status", "pending")
    ai_mode = report.get("ai_mode")
    ai_error = report.get("ai_error")

    report["priority_score"] = priority_score
    report["reporter"] = reporter
    report["agent_pipeline"] = {
        "image_analysis": {
            "status": ai_status,
            "mode": ai_mode,
            "error": ai_error,
        },
        "comment_analysis": {
            "status": "completed" if len(comments) > 0 else "pending",
            "comment_count": len(comments),
        },
        "priority_ranker": {
            "status": "completed",
            "score": priority_score,
        },
        "clustering": {
            "status": "assigned" if hotspot_id else "not_assigned",
            "hotspot_id": hotspot_id,
        },
        "status_checker": {
            "status": "completed" if latest_followup else "pending",
            "last_followup_state": latest_followup,
        },
        "trust_agent": {
            "status": "completed",
            "trust_score": reporter["trust_score"],
        },
    }

    return report


@router.post("/reports")
def create_report(report: ReportCreate):
    data = {
        "user_id": report.user_id,
        "image_url": report.image_url,
        "latitude": report.latitude,
        "longitude": report.longitude,
        "user_comment": report.user_comment,
        "status": "reported",
    }

    try:
        ensure_user_exists(report.user_id)

        result = supabase.table("waste_reports").insert(data).execute()

        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create report")

        increment_reports_count(report.user_id)

        created_report = result.data[0]

        return {
            "id": created_report["id"],
            "status": created_report["status"],
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reports")
def get_reports():
    try:
        result = (
            supabase.table("waste_reports")
            .select("*")
            .order("created_at", desc=True)
            .execute()
        )

        reports = result.data or []
        return [enrich_report_for_demo(report) for report in reports]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reports/{report_id}")
def get_report(report_id: str):
    try:
        result = (
            supabase.table("waste_reports")
            .select("*")
            .eq("id", report_id)
            .execute()
        )

        if not result.data:
            raise HTTPException(status_code=404, detail="Report not found")

        report = result.data[0]

        # do not let enrichment break page loading
        try:
            return enrich_report_for_demo(report)
        except Exception:
            report["priority_score"] = calculate_priority_score(
                severity_label=report.get("severity_label"),
                comments=[],
                reporter_user_id=report.get("user_id"),
            )
            return report

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/reports/{report_id}")
def delete_report(
    report_id: str,
    requester_user_id: str = Query(...),
):
    try:
        role = get_user_role(requester_user_id)
        if role != "admin":
            raise HTTPException(
                status_code=403,
                detail=f"Only admins can delete reports. Current role for '{requester_user_id}' is '{role}'",
            )

        existing = (
            supabase.table("waste_reports")
            .select("id")
            .eq("id", report_id)
            .execute()
        )

        if not existing.data:
            raise HTTPException(status_code=404, detail="Report not found")

        supabase.table("waste_reports").delete().eq("id", report_id).execute()
        return {"message": "Report deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))