from fastapi import APIRouter, HTTPException
from app.db.supabase_client import supabase
from app.services.hotspot_service import cluster_reports
from datetime import datetime, timezone

router = APIRouter()


@router.post("/hotspots/recalculate")
def recalculate_hotspots():
    try:
        reports_result = supabase.table("waste_reports").select("*").execute()
        reports = reports_result.data or []

        hotspot_results = cluster_reports(reports)

        # Clear old hotspots
        supabase.table("hotspots").delete().neq("id", "").execute()

        # Reset hotspot_id on all reports
        for report in reports:
            supabase.table("waste_reports").update({"hotspot_id": None}).eq("id", report["id"]).execute()

        now_iso = datetime.now(timezone.utc).isoformat()

        saved_hotspots = []

        for hotspot in hotspot_results:
            hotspot_row = {
                "id": hotspot["hotspot_id"],
                "center_lat": hotspot["center_lat"],
                "center_lng": hotspot["center_lng"],
                "report_count": hotspot["report_count"],
                "average_priority": hotspot["average_priority"],
                "hotspot_level": hotspot["hotspot_level"],
                "updated_at": now_iso,
            }

            hotspot_insert = supabase.table("hotspots").insert(hotspot_row).execute()
            if hotspot_insert.data:
                saved_hotspots.append(hotspot_insert.data[0])

            # Assign hotspot_id to clustered reports
            for report in hotspot["reports"]:
                supabase.table("waste_reports").update(
                    {"hotspot_id": hotspot["hotspot_id"]}
                ).eq("id", report["id"]).execute()

        return {
            "message": "Hotspots recalculated successfully",
            "hotspot_count": len(saved_hotspots),
            "hotspots": saved_hotspots,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/hotspots")
def get_hotspots():
    try:
        result = supabase.table("hotspots").select("*").order("average_priority", desc=True).execute()
        return result.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))