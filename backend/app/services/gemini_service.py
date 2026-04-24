import json
import google.generativeai as genai
from app.config import GEMINI_API_KEY

if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY is missing from backend/.env")

genai.configure(api_key=GEMINI_API_KEY)


def analyze_waste_image(image_url: str):
    model = genai.GenerativeModel("gemini-2.5-flash")

    prompt = """
You are analyzing an image for a civic waste reporting system.

Return only valid JSON in this exact format:

{
  "waste_present": true,
  "waste_type": "plastic",
  "severity_label": "low",
  "severity_score": 0.25
}

Rules:
- waste_present must be true or false
- waste_type must be one of:
  plastic, organic, mixed, construction, hazardous, unknown
- severity_label must be one of:
  low, medium, high, critical
- severity_score must be a number between 0 and 1
- judge severity based on visible waste quantity, spread, and sanitation impact
- return JSON only, with no markdown
"""

    response = model.generate_content(
        f"{prompt}\n\nImage URL: {image_url}"
    )

    text = response.text.strip()
    text = text.replace("```json", "").replace("```", "").strip()

    try:
        return json.loads(text)
    except Exception:
        raise ValueError(f"Gemini returned non-JSON output: {text}")


def fallback_waste_analysis(image_url: str, user_comment: str | None = None):
    """
    Simple fallback logic when Gemini is unavailable.
    Uses comment keywords and returns safe default values.
    """

    comment = (user_comment or "").lower()

    waste_type = "unknown"
    severity_label = "medium"
    severity_score = 0.5
    waste_present = True

    # waste type hints
    if "plastic" in comment:
        waste_type = "plastic"
    elif "food" in comment or "organic" in comment:
        waste_type = "organic"
    elif "construction" in comment or "debris" in comment:
        waste_type = "construction"
    elif "mixed" in comment or "garbage" in comment or "waste" in comment:
        waste_type = "mixed"

    # severity hints
    if any(word in comment for word in ["huge", "overflowing", "massive", "very bad", "danger", "hazard"]):
        severity_label = "high"
        severity_score = 0.8
    elif any(word in comment for word in ["worse", "bad smell", "dirty", "recurring", "every day", "every week"]):
        severity_label = "medium"
        severity_score = 0.6
    elif any(word in comment for word in ["small", "minor", "little"]):
        severity_label = "low"
        severity_score = 0.3

    return {
        "waste_present": waste_present,
        "waste_type": waste_type,
        "severity_label": severity_label,
        "severity_score": severity_score,
    }