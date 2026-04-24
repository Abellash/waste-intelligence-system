from fastapi import APIRouter, HTTPException
from app.db.supabase_client import supabase
from app.services.trust_service import get_user_trust_score, penalize_user, ensure_user_exists

router = APIRouter()


@router.get("/users/{user_id}/trust")
def get_user_trust(user_id: str):
    try:
        score = get_user_trust_score(user_id)
        result = supabase.table("users").select("*").eq("id", user_id).execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="User not found")

        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/users/{user_id}/penalize")
def penalize_user_route(user_id: str, payload: dict):
    try:
        requester_user_id = payload.get("requester_user_id")
        amount = payload.get("amount", 0.2)

        ensure_user_exists(requester_user_id)

        requester = supabase.table("users").select("role").eq("id", requester_user_id).execute()
        role = requester.data[0]["role"] if requester.data else "user"

        if role != "admin":
            raise HTTPException(status_code=403, detail="Only admins can penalize users")

        penalize_user(user_id, amount)

        updated = supabase.table("users").select("*").eq("id", user_id).execute()
        return {
            "message": "User penalized successfully",
            "user": updated.data[0] if updated.data else None
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))