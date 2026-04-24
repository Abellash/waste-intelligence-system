from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import reports, comments, ai, priority, votes, hotspots, status, followups, trust
import requests
from app.config import SUPABASE_URL, SUPABASE_KEY
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(reports.router)
app.include_router(comments.router)
app.include_router(ai.router)
app.include_router(priority.router)
app.include_router(votes.router)
app.include_router(hotspots.router)
app.include_router(status.router)
app.include_router(followups.router)
app.include_router(trust.router)


@app.get("/")
def root():
    return {"message": "Backend is running"}

from app.config import SUPABASE_URL, SUPABASE_KEY

@app.get("/debug-env")
def debug_env():
    return {
        "supabase_url": SUPABASE_URL,
        "has_supabase_key": bool(SUPABASE_KEY),
        "supabase_url_starts_with_https": SUPABASE_URL.startswith("https://") if SUPABASE_URL else False,
    }

@app.get("/debug-supabase")
def debug_supabase():
    try:
        url = f"{SUPABASE_URL}/rest/v1/waste_reports?select=*&limit=1"

        response = requests.get(
            url,
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
            },
            timeout=10,
        )

        return {
            "supabase_url": SUPABASE_URL,
            "url_used": url,
            "status_code": response.status_code,
            "response_text": response.text[:500],
        }

    except Exception as e:
        return {
            "error": str(e),
            "supabase_url": SUPABASE_URL,
            "url_used": f"{SUPABASE_URL}/rest/v1/waste_reports?select=*&limit=1",
        }