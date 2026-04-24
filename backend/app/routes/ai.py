from fastapi import APIRouter, HTTPException
from app.db.supabase_client import supabase
from app.services.gemini_service import analyze_waste_image, fallback_waste_analysis

router = APIRouter()


@router.post("/ai/analyze-report/{report_id}")
def analyze_report(report_id: str):
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
        image_url = report["image_url"]
        user_comment = report.get("user_comment")

        ai_result = None
        ai_mode = "gemini"
        ai_status = "completed"
        ai_error = None

        try:
            ai_result = analyze_waste_image(image_url)
        except Exception as gemini_error:
            ai_result = fallback_waste_analysis(image_url, user_comment)
            ai_mode = "fallback"
            ai_status = "fallback"
            ai_error = str(gemini_error)

        update_data = {
            "waste_present": ai_result["waste_present"],
            "waste_type": ai_result["waste_type"],
            "severity_label": ai_result["severity_label"],
            "severity_score": ai_result["severity_score"],
            "ai_status": ai_status,
            "ai_mode": ai_mode,
            "ai_error": ai_error,
        }

        update_result = (
            supabase
            .table("waste_reports")
            .update(update_data)
            .eq("id", report_id)
            .execute()
        )

        return {
            "message": "AI analysis completed",
            "report_id": report_id,
            "ai_result": ai_result,
            "ai_mode": ai_mode,
            "ai_status": ai_status,
            "ai_error": ai_error,
            "updated_report": update_result.data[0] if update_result.data else None
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI route error: {str(e)}")