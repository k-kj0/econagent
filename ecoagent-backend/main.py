from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
import httpx
import os
import json
import re

# Configure Gemini
GEMINI_KEY = os.environ.get("AQ.Ab8RN6JTo8UpqBt-NMUbc8MGs68XoTfVUDiz91d5QZ5I2rXVOg", "")
NEWS_KEY = os.environ.get("b529f52876a24401920e984f808d5484", "")
GNEWS_KEY = os.environ.get("apify_api_nPI4CLyS1fhqjw5FAau7u5xZxbAqvv3HkeKh", "")

if GEMINI_KEY:
    genai.configure(api_key=AQ.Ab8RN6JTo8UpqBt-NMUbc8MGs68XoTfVUDiz91d5QZ5I2rXVOg)
    model = genai.GenerativeModel("gemini-1.5-flash")
else:
    model = None

app = FastAPI(title="EcoAgent Backend")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class Query(BaseModel):
    text: str

@app.get("/")
def root():
    return {"status": "EcoAgent online", "gemini": bool(GEMINI_KEY), "news": bool(NEWS_KEY or GNEWS_KEY)}

@app.post("/ask")
async def ask(query: Query):
    news_cards = []
    news_text = ""

    # Fetch news — try NewsAPI first, fallback GNews
    async with httpx.AsyncClient(timeout=8.0) as client:
        if NEWS_KEY:
            try:
                r = await client.get(
                    "https://newsapi.org/v2/top-headlines",
                    params={"language": "en", "pageSize": 6, "apiKey": NEWS_KEY, "q": query.text[:50]}
                )
                articles = r.json().get("articles", [])
                if not articles:
                    # fallback to general top headlines
                    r2 = await client.get(
                        "https://newsapi.org/v2/top-headlines",
                        params={"language": "en", "pageSize": 6, "apiKey": NEWS_KEY, "category": "business"}
                    )
                    articles = r2.json().get("articles", [])
                news_cards = [
                    {
                        "headline": a.get("title", ""),
                        "source": a.get("source", {}).get("name", "News"),
                        "url": a.get("url", ""),
                        "image": a.get("urlToImage", ""),
                    }
                    for a in articles[:6]
                    if a.get("title") and "[Removed]" not in a.get("title", "")
                ]
                news_text = "\n".join(f"- {c['headline']} ({c['source']})" for c in news_cards)
            except Exception as e:
                news_text = f"News fetch error: {e}"

        if not news_cards and GNEWS_KEY:
            try:
                gr = await client.get(
                    "https://gnews.io/api/v4/top-headlines",
                    params={"lang": "en", "max": 6, "apikey": GNEWS_KEY, "q": query.text[:50]}
                )
                articles = gr.json().get("articles", [])
                news_cards = [
                    {
                        "headline": a.get("title", ""),
                        "source": a.get("source", {}).get("name", "News"),
                        "url": a.get("url", ""),
                        "image": a.get("image", ""),
                    }
                    for a in articles[:6]
                ]
                news_text = "\n".join(f"- {c['headline']} ({c['source']})" for c in news_cards)
            except Exception as e:
                news_text = f"GNews fetch error: {e}"

    if not news_text:
        news_text = "No live news available — configure NEWS_API_KEY or GNEWS_API_KEY."

    # Gemini call
    system_prompt = """You are EcoAgent, an elite economic intelligence AI. 
Your personality: confident, concise, like a Bloomberg anchor. Address the user as Boss.

Rules:
- Always start with "Boss,"
- Be specific with data when available — mention real numbers, percentages, country names
- Cite your sources inline
- Return ONLY valid JSON, no markdown fences, no extra text

JSON schema:
{
  "speech": "Boss, [2-4 sentences with real analysis. Be specific about countries, figures, trends]",
  "countries": ["US", "UK", "CN"],
  "prediction": "One forward-looking sentence about what to watch next.",
  "sources": ["Bloomberg", "Reuters", "Federal Reserve"]
}"""

    user_prompt = f"""User query: {query.text}

Live news feed:
{news_text}

Respond as EcoAgent with real economic intelligence. Extract country codes for any countries mentioned."""

    if model:
        try:
            resp = model.generate_content(
                f"{system_prompt}\n\n{user_prompt}",
                generation_config={"temperature": 0.7, "max_output_tokens": 400}
            )
            raw = resp.text.strip()
            # Strip any markdown fences if Gemini added them
            raw = re.sub(r"```json\s*", "", raw)
            raw = re.sub(r"```\s*", "", raw)
            raw = raw.strip()
            ai_data = json.loads(raw)
        except json.JSONDecodeError:
            # If JSON parse fails, extract the text and wrap it
            speech_text = resp.text.strip() if model else "Error"
            ai_data = {
                "speech": speech_text[:500] if speech_text else "Boss, I encountered a processing error.",
                "countries": ["US"],
                "prediction": "Monitor developments closely.",
                "sources": ["EcoAgent"],
            }
        except Exception as e:
            ai_data = {
                "speech": f"Boss, Gemini API error: {str(e)[:100]}. Check GEMINI_API_KEY environment variable.",
                "countries": [],
                "prediction": "",
                "sources": [],
            }
    else:
        ai_data = {
            "speech": "Boss, GEMINI_API_KEY is not configured. Add it to your Railway/Vercel environment variables to activate full intelligence.",
            "countries": ["US"],
            "prediction": "Configure API keys to unlock real-time briefings.",
            "sources": ["EcoAgent System"],
        }

    return {
        **ai_data,
        "newsCards": news_cards,
    }
