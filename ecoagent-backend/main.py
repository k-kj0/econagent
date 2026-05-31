from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
import httpx
import os
import json

genai.configure(api_key=os.environ.get("GEMINI_API_KEY", ""))
model = genai.GenerativeModel("gemini-1.5-flash")

NEWS_API_KEY = os.environ.get("NEWS_API_KEY", "")
YT_API_KEY = os.environ.get("YOUTUBE_API_KEY", "")

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

class Query(BaseModel):
    text: str

@app.get("/")
def root():
    return {"status": "EcoAgent online"}

@app.post("/ask")
async def ask(query: Query):
    news_cards = []
    news_text = ""
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.get(f"https://newsapi.org/v2/top-headlines?language=en&pageSize=5&apiKey={NEWS_API_KEY}")
        articles = r.json().get("articles", [])
        news_cards = [{"headline": a.get("title",""), "source": a.get("source",{}).get("name",""), "url": a.get("url",""), "image": a.get("urlToImage","")} for a in articles[:5]]
        news_text = "\n".join([f"- {c['headline']} ({c['source']})" for c in news_cards])
    except:
        news_text = "No live news available."

    yt_links = []
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            yr = await client.get(f"https://www.googleapis.com/youtube/v3/search?part=snippet&q={query.text}&type=video&maxResults=3&key={YT_API_KEY}")
        yt_links = [{"title": i["snippet"]["title"], "url": f"https://youtube.com/watch?v={i['id']['videoId']}", "thumbnail": i["snippet"]["thumbnails"]["default"]["url"]} for i in yr.json().get("items", [])]
    except:
        pass

    prompt = f"""You are EcoAgent, elite global intelligence AI. Address user as Boss.
Query: {query.text}
Live news: {news_text}
Return ONLY valid JSON no markdown:
{{"speech":"Boss, [2-3 sentences]","countries":["US"],"prediction":"one sentence","sources":["NewsAPI"]}}"""

    try:
        resp = model.generate_content(prompt)
        raw = resp.text.strip().lstrip("```json").lstrip("```").rstrip("```")
        ai_data = json.loads(raw)
    except Exception as e:
        ai_data = {"speech": f"Boss, processing error: {e}", "countries": [], "prediction": "", "sources": []}

    return {**ai_data, "news_cards": news_cards, "yt_links": yt_links}
