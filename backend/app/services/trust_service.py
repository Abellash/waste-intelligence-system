from app.db.supabase_client import supabase


def ensure_user_exists(user_id: str):
    existing = supabase.table("users").select("*").eq("id", user_id).execute()

    if not existing.data:
        supabase.table("users").insert({
            "id": user_id,
            "name": user_id,
            "role": "user",
            "trust_score": 1.0,
            "reports_count": 0,
            "confirmed_reports_count": 0,
        }).execute()


def increment_reports_count(user_id: str):
    ensure_user_exists(user_id)

    result = supabase.table("users").select("*").eq("id", user_id).execute()
    if not result.data:
        return

    user = result.data[0]
    new_reports_count = (user.get("reports_count") or 0) + 1

    supabase.table("users").update({
        "reports_count": new_reports_count
    }).eq("id", user_id).execute()


def increment_confirmed_reports_count(user_id: str):
    ensure_user_exists(user_id)

    result = supabase.table("users").select("*").eq("id", user_id).execute()
    if not result.data:
        return

    user = result.data[0]
    confirmed = (user.get("confirmed_reports_count") or 0) + 1
    reports_count = user.get("reports_count") or 0

    trust_score = 1.0 + (confirmed * 0.2)
    if trust_score > 5.0:
        trust_score = 5.0

    supabase.table("users").update({
        "confirmed_reports_count": confirmed,
        "trust_score": trust_score,
    }).eq("id", user_id).execute()


def penalize_user(user_id: str, amount: float = 0.2):
    ensure_user_exists(user_id)

    result = supabase.table("users").select("*").eq("id", user_id).execute()
    if not result.data:
        return

    user = result.data[0]
    trust_score = user.get("trust_score") or 1.0
    trust_score = max(0.2, trust_score - amount)

    supabase.table("users").update({
        "trust_score": trust_score
    }).eq("id", user_id).execute()


def get_user_trust_score(user_id: str) -> float:
    ensure_user_exists(user_id)

    result = supabase.table("users").select("trust_score").eq("id", user_id).execute()
    if not result.data:
        return 1.0

    return result.data[0].get("trust_score") or 1.0