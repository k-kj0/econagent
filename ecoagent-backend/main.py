from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
import httpx
import os
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

@app.get("/")
def root():
    return {"status": "EcoAgent backend live"}

@app.post("/ask")
async def ask(query: Query):
    # 1. Fetch news
    async with httpx.AsyncClient() as client:
        news_resp = await client.get(
            f"https://newsapi.org/v2/top-headlines?language=en&pageSize=5&apiKey={NEWS_API_KEY}"
        )
    articles = news_resp.json().get("articles", [])
    news_text = "\n".join([f"- {a['title']} ({a['source']['name']})" for a in articles[:5]])

    # 2. Ask Gemini
    prompt = f"""
You are EcoAgent, an elite intelligence AI. Address user as Boss.
User asked: {query.text}

Live news context:
{news_text}

Reply in this exact JSON format only, no markdown:
{{
  "speech": "Boss, [2-3 sentence answer using news data]",
  "countries": ["US", "GB"],
  "news_cards": [
    {{"headline": "...", "source": "...", "url": "..."}}
  ],
  "prediction": "One sentence prediction.",
  "sources": ["NewsAPI", "Gemini"]
}}
"""
    response = model.generate_content(prompt)
    import json
    try:
        data = json.loads(response.text)
    except:
        data = {"speech": response.text, "countries": [], "news_cards": [], "prediction": "", "sources": []}
    
    return data
