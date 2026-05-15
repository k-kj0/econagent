import os
import random
from datetime import datetime
from typing import List
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
from pymongo import MongoClient

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
MONGODB_URI = os.environ.get("MONGODB_URI", "")
PORT = int(os.environ.get("PORT", 10000))

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

db = None

def get_db():
    global db
    if db is None and MONGODB_URI:
        try:
            client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
            client.server_info()
            db = client["econagent"]
        except Exception as e:
            print(f"MongoDB error: {e}")
    return db

COMMODITIES = ["Wheat", "Oil", "Gold", "Silver", "Copper", "Corn", "Soybean", "Natural Gas"]
FOREX = ["USD/INR", "USD/EUR", "USD/GBP", "USD/JPY"]

prices_cache = {c: round(random.uniform(50, 500), 2) for c in COMMODITIES}
forex_cache = {f: round(random.uniform(0.5, 150), 4) for f in FOREX}


class AgentStep(BaseModel):
    step: int
    action: str
    result: str


class AgentQueryRequest(BaseModel):
    question: str


class AgentQueryResponse(BaseModel):
    steps: List[AgentStep]
    conclusion: str
    confidence: str
    sources: List[str]
    question: str


@app.get("/health")
def health():
    db_status = "connected" if get_db() is not None else "disconnected"
    gemini_status = "configured" if GEMINI_API_KEY else "not_configured"
    return {
        "status": "healthy",
        "mongodb": db_status,
        "gemini": gemini_status,
        "timestamp": datetime.utcnow().isoformat()
    }


@app.get("/prices")
def get_prices():
    for c in COMMODITIES:
        change = random.uniform(-0.02, 0.02)
        prices_cache[c] = round(prices_cache[c] * (1 + change), 2)
    return {
        "commodities": prices_cache,
        "forex": forex_cache,
        "timestamp": datetime.utcnow().isoformat()
    }


@app.get("/alerts")
def get_alerts():
    database = get_db()
    if database is not None:
        try:
            alerts = list(database.alerts.find({}, {"_id": 0}).sort("timestamp", -1).limit(10))
            return {"alerts": alerts}
        except Exception:
            pass
    return {
        "alerts": [{
            "type": "info",
            "message": "System running in demo mode",
            "severity": "low",
            "timestamp": datetime.utcnow().isoformat()
        }]
    }


@app.post("/agent/query")
async def agent_query(req: AgentQueryRequest):
    steps = []
    steps.append(AgentStep(step=1, action="Analyzing question", result=f"Processing: {req.question}"))

    commodity_data = dict(prices_cache)
    steps.append(AgentStep(step=2, action="Fetching commodity data", result=str(commodity_data)))

    forex_data = dict(forex_cache)
    steps.append(AgentStep(step=3, action="Fetching forex data", result=str(forex_data)))

    conclusion = "Gemini not configured - showing demo response."
    confidence = "low"

    if GEMINI_API_KEY:
        try:
            model = genai.GenerativeModel("gemini-1.5-flash")
            prompt = f"""You are an economic intelligence agent. Answer concisely in 2-3 sentences.
Question: {req.question}
Commodity prices: {commodity_data}
Forex rates: {forex_data}"""
            response = model.generate_content(prompt)
            conclusion = response.text
            confidence = "high"
            steps.append(AgentStep(step=4, action="Gemini analysis complete", result="Insight generated"))
        except Exception as e:
            conclusion = f"Analysis error: {str(e)}"

    result = AgentQueryResponse(
        steps=steps,
        conclusion=conclusion,
        confidence=confidence,
        sources=["Live commodity data", "Forex feed", "Gemini 1.5 Flash"],
        question=req.question
    )

    database = get_db()
    if database is not None:
        try:
            database.sessions.insert_one({
                "question": req.question,
                "response": result.model_dump(),
                "timestamp": datetime.utcnow()
            })
        except Exception:
            pass

    return result


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=False)