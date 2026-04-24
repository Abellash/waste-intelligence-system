from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import reports, comments, ai, priority, votes, hotspots, status, followups, trust

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