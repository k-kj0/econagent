from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
import httpx
import os
import json
from dotenv import load_dotenv

load_dotenv()

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-1.5-flash")

NEWS_API_KEY = os.getenv("NEWS_API_KEY")
YT_API_KEY = os.getenv("YOUTUBE_API_KEY")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class Query(BaseModel):
    text: str

def clean_json(text: str):
    text = text.replace("```json", "").replace("```", "").strip()
    return json.loads(text)

@app.get("/")
def root():
    return {"status": "EcoAgent backend live"}

@app.get("/news")
async def get_news():
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"https://newsapi.org/v2/top-headlines?language=en&category=science&pageSize=10&apiKey={NEWS_API_KEY}"
        )
    articles = resp.json().get("articles", [])
    return {"articles": [
        {"headline": a["title"], "source": a["source"]["name"], "url": a["url"], "time": a["publishedAt"]}
        for a in articles if a["title"]
    ]}

@app.get("/economy")
async def get_economy():
    async with httpx.AsyncClient() as client:
        # World Bank: GDP growth India (IN), US, Global (WLD)
        gdp_resp = await client.get(
            "https://api.worldbank.org/v2/country/IN;US;WLD/indicator/NY.GDP.MKTP.KD.ZG?format=json&mrv=1"
        )
        infl_resp = await client.get(
            "https://api.worldbank.org/v2/country/IN;US/indicator/FP.CPI.TOTL.ZG?format=json&mrv=1"
        )
    gdp_data = gdp_resp.json()
    infl_data = infl_resp.json()
    results = []
    if len(gdp_data) > 1:
        for item in gdp_data[1]:
            results.append({
                "country": item["country"]["value"],
                "indicator": "GDP Growth %",
                "value": item["value"],
                "year": item["date"]
            })
    if len(infl_data) > 1:
        for item in infl_data[1]:
            results.append({
                "country": item["country"]["value"],
                "indicator": "Inflation %",
                "value": item["value"],
                "year": item["date"]
            })
    return {"data": results}

@app.get("/videos")
async def get_videos(q: str = "climate change 2025"):
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"https://www.googleapis.com/youtube/v3/search?part=snippet&q={q}&type=video&maxResults=5&key={YT_API_KEY}"
        )
    items = resp.json().get("items", [])
    return {"videos": [
        {
            "title": v["snippet"]["title"],
            "channel": v["snippet"]["channelTitle"],
            "videoId": v["id"]["videoId"],
            "thumbnail": v["snippet"]["thumbnails"]["medium"]["url"]
        }
        for v in items
    ]}

@app.post("/ask")
async def ask(query: Query):
    async with httpx.AsyncClient() as client:
        news_resp = await client.get(
            f"https://newsapi.org/v2/top-headlines?language=en&pageSize=5&apiKey={NEWS_API_KEY}"
        )
    articles = news_resp.json().get("articles", [])
    news_text = "\n".join([f"- {a['title']} ({a['source']['name']})" for a in articles[:5]])

    prompt = f"""
You are EcoAgent, an elite environmental intelligence AI. Address user as Boss.
User asked: {query.text}

Live news context:
{news_text}

Reply in this exact JSON format only, no markdown, no backticks:
{{
  "speech": "Boss, [2-3 sentence answer using news data]",
  "countries": ["US", "IN"],
  "news_cards": [
    {{"headline": "...", "source": "...", "url": "..."}}
  ],
  "prediction": "One sentence prediction.",
  "sources": ["NewsAPI", "Gemini", "WorldBank"]
}}
"""
    response = model.generate_content(prompt)
    try:
        data = clean_json(response.text)
    except Exception:
        data = {
            "speech": response.text,
            "countries": [],
            "news_cards": [],
            "prediction": "",
            "sources": ["Gemini"]
        }
    return data
