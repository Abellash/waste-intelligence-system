from app.db.supabase_client import supabase


def get_user_trust_score(user_id: str) -> float:
    try:
        result = supabase.table("users").select("trust_score").eq("id", user_id).execute()

        if not result.data:
            return 1.0

        trust_score = result.data[0].get("trust_score")
        if trust_score is None:
            return 1.0

        return float(trust_score)
    except Exception:
        return 1.0


def calculate_priority_score(
    severity_label: str | None,
    comments: list[dict],
    reporter_user_id: str | None = None
) -> float:
    severity_points = {
        "low": 1,
        "medium": 2,
        "high": 3,
        "critical": 4,
    }

    score = float(severity_points.get((severity_label or "low").lower(), 1))

    recurrence_count = sum(1 for c in comments if c.get("recurrence_flag"))
    urgency_count = sum(1 for c in comments if c.get("urgency_flag"))
    resolved_count = sum(1 for c in comments if c.get("resolved_flag"))

    if recurrence_count > 0:
        score += 1

    if urgency_count > 0:
        score += 1

    if recurrence_count + urgency_count >= 2:
        score += 1

    if resolved_count >= 2:
        score = max(0, score - 2)

    reporter_trust = 1.0
    if reporter_user_id:
        reporter_trust = get_user_trust_score(reporter_user_id)

    trust_multiplier = 1 + ((reporter_trust - 1.0) * 0.1)
    trust_multiplier = max(0.85, min(1.25, trust_multiplier))

    weighted_score = round(score * trust_multiplier, 2)
    return weighted_score