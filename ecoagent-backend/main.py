from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
import os
from dotenv import load_dotenv
from datetime import datetime, timezone
import json
import re
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure

load_dotenv()

GEMINI_KEY = os.getenv("GEMINI_API_KEY")
NEWS_KEY   = os.getenv("NEWS_API_KEY")
GNEWS_KEY  = os.getenv("GNEWS_API_KEY")
MONGO_URI  = os.getenv("MONGO_URI", "mongodb://localhost:27017")

try:
    mongo_client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=3000)
    mongo_client.admin.command("ping")
    db             = mongo_client["econagent"]
    queries_col    = db["eco_queries"]
    news_cache_col = db["eco_news_cache"]
    sessions_col   = db["eco_sessions"]
    MONGO_CONNECTED = True
except Exception:
    MONGO_CONNECTED = False
    queries_col = news_cache_col = sessions_col = None

app = FastAPI(title="EcoAgent Backend")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class Query(BaseModel):
    text: str
    session_id: str = "default"

def _utcnow():
    return datetime.now(timezone.utc)

def _get_cached_news(query_text):
    if not MONGO_CONNECTED:
        return None
    cutoff = _utcnow().timestamp() - 600
    doc = news_cache_col.find_one(
        {"query": query_text[:50], "fetched_at": {"$gt": cutoff}},
        sort=[("fetched_at", -1)],
    )
    return doc["articles"] if doc else None

def _cache_news(query_text, articles):
    if not MONGO_CONNECTED:
        return
    news_cache_col.insert_one({
        "query": query_text[:50],
        "articles": articles,
        "fetched_at": _utcnow().timestamp(),
    })

def _save_query(session_id, user_text, ai_response, news_cards):
    if not MONGO_CONNECTED:
        return
    queries_col.insert_one({
        "session_id": session_id,
        "user_query": user_text,
        "ai_speech":  ai_response.get("speech", ""),
        "countries":  ai_response.get("countries", []),
        "prediction": ai_response.get("prediction", ""),
        "sources":    ai_response.get("sources", []),
        "news_count": len(news_cards),
        "timestamp":  _utcnow(),
    })
    sessions_col.update_one(
        {"session_id": session_id},
        {"$set": {"last_active": _utcnow()}, "$inc": {"query_count": 1}},
        upsert=True,
    )

def _get_query_history(session_id, limit=5):
    if not MONGO_CONNECTED:
        return []
    docs = list(queries_col.find(
        {"session_id": session_id},
        {"_id": 0, "user_query": 1, "ai_speech": 1, "timestamp": 1},
        sort=[("timestamp", -1)],
        limit=limit,
    ))
    return list(reversed(docs))

@app.get("/")
def root():
    return {
        "status":  "EcoAgent online",
        "gemini":  bool(GEMINI_KEY),
        "news":    bool(NEWS_KEY or GNEWS_KEY),
        "mongodb": MONGO_CONNECTED,
    }

@app.get("/stats")
def get_stats():
    if not MONGO_CONNECTED:
        return {"error": "MongoDB not connected"}
    return {
        "total_queries":  queries_col.count_documents({}),
        "total_sessions": sessions_col.count_documents({}),
    }

@app.get("/history/{session_id}")
def get_history(session_id: str, limit: int = 20):
    if not MONGO_CONNECTED:
        raise HTTPException(503, "MongoDB not connected")
    docs = list(queries_col.find(
        {"session_id": session_id},
        {"_id": 0},
        sort=[("timestamp", -1)],
        limit=limit,
    ))
    return {"session_id": session_id, "history": docs}

@app.post("/ask")
async def ask(query: Query):
    news_cards = []
    news_text  = ""

    cached = _get_cached_news(query.text)
    if cached:
        news_cards = cached
        news_text  = "\n".join(f"- {c['headline']} ({c['source']})" for c in news_cards)
    else:
        async with httpx.AsyncClient(timeout=8.0) as client:
            if NEWS_KEY:
                try:
                    r = await client.get(
                        "https://newsapi.org/v2/top-headlines",
                        params={"language": "en", "pageSize": 6, "apiKey": NEWS_KEY, "q": query.text[:50]},
                    )
                    articles = r.json().get("articles", [])
                    if not articles:
                        r2 = await client.get(
                            "https://newsapi.org/v2/top-headlines",
                            params={"language": "en", "pageSize": 6, "apiKey": NEWS_KEY, "category": "business"},
                        )
                        articles = r2.json().get("articles", [])
                    news_cards = [
                        {"headline": a.get("title",""), "source": a.get("source",{}).get("name","News"),
                         "url": a.get("url",""), "image": a.get("urlToImage","")}
                        for a in articles[:6]
                        if a.get("title") and "[Removed]" not in a.get("title","")
                    ]
                    news_text = "\n".join(f"- {c['headline']} ({c['source']})" for c in news_cards)
                except Exception as e:
                    news_text = f"News fetch error: {e}"

            if not news_cards and GNEWS_KEY:
                try:
                    gr = await client.get(
                        "https://gnews.io/api/v4/top-headlines",
                        params={"lang": "en", "max": 6, "apikey": GNEWS_KEY, "q": query.text[:50]},
                    )
                    articles = gr.json().get("articles", [])
                    news_cards = [
                        {"headline": a.get("title",""), "source": a.get("source",{}).get("name","News"),
                         "url": a.get("url",""), "image": a.get("image","")}
                        for a in articles[:6]
                    ]
                    news_text = "\n".join(f"- {c['headline']} ({c['source']})" for c in news_cards)
                except Exception as e:
                    news_text = f"GNews fetch error: {e}"

        if news_cards:
            _cache_news(query.text, news_cards)

    if not news_text:
        news_text = "No live news available."

    history = _get_query_history(query.session_id)
    history_text = ""
    if history:
        history_text = "\n\nSession context:\n"
        for h in history:
            history_text += f"  Q: {h['user_query']}\n  A: {h['ai_speech'][:120]}...\n"

    system_prompt = """You are EcoAgent, an elite economic intelligence AI.
Your personality: confident, concise, like a Bloomberg anchor. Address the user as Boss.
Rules:
- Always start with "Boss,"
- Be specific with data when available
- Return ONLY valid JSON, no markdown fences

JSON schema:
{
  "speech": "Boss, [2-4 sentences analysis]",
  "countries": ["US", "UK"],
  "prediction": "One forward-looking sentence.",
  "sources": ["Bloomberg", "Reuters"]
}"""

    user_prompt = f"User query: {query.text}\n\nLive news:\n{news_text}{history_text}\n\nRespond as EcoAgent."

    ai_data = {}
    if GEMINI_KEY:
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_KEY}",
                    json={"contents": [{"parts": [{"text": f"{system_prompt}\n\n{user_prompt}"}]}]},
                )
                raw = resp.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
                raw = re.sub(r"```json\s*", "", raw)
                raw = re.sub(r"```\s*", "", raw)
                ai_data = json.loads(raw.strip())
        except Exception as e:
            ai_data = {
                "speech": f"Boss, API error: {str(e)[:100]}",
                "countries": [], "prediction": "", "sources": [],
            }
    else:
        ai_data = {
            "speech": "Boss, GEMINI_API_KEY not configured.",
            "countries": ["US"], "prediction": "Configure API keys.", "sources": ["EcoAgent"],
        }

    _save_query(query.session_id, query.text, ai_data, news_cards)

    return {**ai_data, "newsCards": news_cards, "mongo_stored": MONGO_CONNECTED, "session_id": query.session_id}
