from fastapi import APIRouter, HTTPException
from app.db.supabase_client import supabase

router = APIRouter()


@router.post("/comments/{comment_id}/vote")
def vote_comment(comment_id: str, payload: dict):
    try:
        user_id = payload.get("user_id")
        vote_type = payload.get("vote_type")

        if not user_id:
            raise HTTPException(status_code=400, detail="user_id is required")

        if vote_type not in ["upvote", "downvote"]:
            raise HTTPException(status_code=400, detail="Invalid vote type")

        supabase.table("comment_votes").delete().eq("comment_id", comment_id).eq("user_id", user_id).execute()

        result = supabase.table("comment_votes").insert({
            "comment_id": comment_id,
            "user_id": user_id,
            "vote_type": vote_type
        }).execute()

        return {
            "message": "Vote recorded successfully",
            "data": result.data
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/comments/{comment_id}/votes")
def get_comment_votes(comment_id: str):
    try:
        votes = supabase.table("comment_votes").select("*").eq("comment_id", comment_id).execute().data or []

        upvotes = sum(1 for v in votes if v["vote_type"] == "upvote")
        downvotes = sum(1 for v in votes if v["vote_type"] == "downvote")

        return {
            "comment_id": comment_id,
            "upvotes": upvotes,
            "downvotes": downvotes,
            "score": upvotes - downvotes
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))