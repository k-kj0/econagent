"""
EconAgent - Economic Intelligence Agent Backend
FastAPI + Gemini + MongoDB Atlas
"""
import os
import asyncio
import random
import json
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv
import httpx
import google.generativeai as genai
from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError

load_dotenv()

# -- Configuration
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/econagent")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
PORT = int(os.getenv("PORT", "8000"))

COMMODITIES = {
    "WHEAT": {"name": "Wheat", "base_price": 620.0, "unit": "USD/tonne"},
    "CORN": {"name": "Corn", "base_price": 450.0, "unit": "USD/tonne"},
    "SOYBEAN": {"name": "Soybean", "base_price": 520.0, "unit": "USD/tonne"},
    "CRUDE_OIL": {"name": "Crude Oil (WTI)", "base_price": 78.5, "unit": "USD/barrel"},
    "GOLD": {"name": "Gold", "base_price": 2350.0, "unit": "USD/oz"},
    "SILVER": {"name": "Silver", "base_price": 28.5, "unit": "USD/oz"},
    "COPPER": {"name": "Copper", "base_price": 4.35, "unit": "USD/lb"},
    "NATURAL_GAS": {"name": "Natural Gas", "base_price": 2.85, "unit": "USD/MMBtu"},
}

FOREX_PAIRS = {
    "USDINR": {"name": "USD/INR", "base_rate": 83.45},
    "USDEUR": {"name": "USD/EUR", "base_rate": 0.92},
    "USDGBP": {"name": "USD/GBP", "base_rate": 0.79},
    "USDJPY": {"name": "USD/JPY", "base_rate": 155.2},
    "USDCNY": {"name": "USD/CNY", "base_rate": 7.23},
}

_price_state = {sym: info["base_price"] for sym, info in COMMODITIES.items()}
_fx_state = {pair: info["base_rate"] for pair, info in FOREX_PAIRS.items()}

_db = None
_prices_col = None
_alerts_col = None
_sessions_col = None

def get_db():
    global _db, _prices_col, _alerts_col, _sessions_col
    if _db is None:
        try:
            client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
            client.admin.command("ping")
            _db = client.get_default_database()
            _prices_col = _db["prices"]
            _alerts_col = _db["alerts"]
            _sessions_col = _db["sessions"]
            _prices_col.create_index([("symbol", ASCENDING), ("timestamp", DESCENDING)])
            _prices_col.create_index([("timestamp", DESCENDING)])
            _alerts_col.create_index([("timestamp", DESCENDING)])
            _alerts_col.create_index([("severity", ASCENDING)])
            _sessions_col.create_index([("timestamp", DESCENDING)])
            print("MongoDB connected successfully")
        except (ConnectionFailure, ServerSelectionTimeoutError) as e:
            print(f"MongoDB connection failed: {e}. Running in degraded mode.")
            _db = None
    return _db

_gemini_model = None

def get_gemini_model():
    global _gemini_model
    if _gemini_model is None and GEMINI_API_KEY:
        genai.configure(api_key=GEMINI_API_KEY)
        _gemini_model = genai.GenerativeModel("gemini-1.5-pro")
    return _gemini_model

def get_commodity_data(symbol: str, limit: int = 30) -> Dict[str, Any]:
    symbol = symbol.upper().strip()
    db = get_db()
    if db is None:
        return {
            "symbol": symbol,
            "data": [
                {
                    "timestamp": (datetime.now(timezone.utc) - timedelta(hours=i)).isoformat(),
                    "price": round(_price_state.get(symbol, 100) * (1 + random.gauss(0, 0.005)), 2),
                    "unit": COMMODITIES.get(symbol, {}).get("unit", "USD"),
                }
                for i in range(limit, 0, -1)
            ],
            "source": "simulated",
        }
    docs = list(_prices_col.find({"symbol": symbol}, {"_id": 0}).sort("timestamp", DESCENDING).limit(limit))
    docs.reverse()
    if not docs:
        return {"symbol": symbol, "data": [], "source": "mongodb", "note": "No data found"}
    return {
        "symbol": symbol,
        "data": docs,
        "source": "mongodb",
        "latest_price": docs[-1]["price"] if docs else None,
        "latest_timestamp": docs[-1]["timestamp"] if docs else None,
    }

def get_forex_data(pair: str, limit: int = 30) -> Dict[str, Any]:
    pair = pair.upper().replace("/", "").strip()
    base_rate = FOREX_PAIRS.get(pair, {}).get("base_rate", 1.0)
    data = []
    for i in range(limit, 0, -1):
        ts = datetime.now(timezone.utc) - timedelta(hours=i)
        rate = round(base_rate * (1 + random.gauss(0, 0.002)), 4)
        data.append({"timestamp": ts.isoformat(), "rate": rate, "pair": pair})
    return {"pair": pair, "data": data, "source": "simulated", "latest_rate": data[-1]["rate"] if data else None}

COMMODITY_TOOL = {
    "function_declarations": [
        {
            "name": "get_commodity_data",
            "description": "Get recent price history for a commodity symbol (e.g., WHEAT, GOLD, CRUDE_OIL)",
            "parameters": {
                "type": "object",
                "properties": {
                    "symbol": {"type": "string", "description": "Commodity symbol like WHEAT, GOLD, CRUDE_OIL, etc."},
                    "limit": {"type": "integer", "description": "Number of data points to retrieve (default 30)"}
                },
                "required": ["symbol"]
            }
        },
        {
            "name": "get_forex_data",
            "description": "Get recent exchange rate history for a currency pair (e.g., USDINR, USDEUR)",
            "parameters": {
                "type": "object",
                "properties": {
                    "pair": {"type": "string", "description": "Currency pair like USDINR, USDEUR, USDGBP"},
                    "limit": {"type": "integer", "description": "Number of data points to retrieve (default 30)"}
                },
                "required": ["pair"]
            }
        }
    ]
}

async def simulate_prices():
    global _price_state
    while True:
        try:
            db = get_db()
            now = datetime.now(timezone.utc)
            for symbol, info in COMMODITIES.items():
                current = _price_state[symbol]
                change_pct = random.gauss(0, 0.008)
                new_price = current * (1 + change_pct)
                _price_state[symbol] = new_price
                doc = {
                    "symbol": symbol,
                    "name": info["name"],
                    "price": round(new_price, 4),
                    "unit": info["unit"],
                    "timestamp": now,
                    "change_pct": round(change_pct * 100, 4),
                }
                if db and _prices_col is not None:
                    try:
                        _prices_col.insert_one(doc)
                    except Exception as e:
                        print(f"MongoDB insert error: {e}")
            await detect_anomalies()
        except Exception as e:
            print(f"Price simulation error: {e}")
        await asyncio.sleep(60)

async def detect_anomalies():
    db = get_db()
    if db is None or _prices_col is None or _alerts_col is None:
        return
    now = datetime.now(timezone.utc)
    day_ago = now - timedelta(hours=24)
    for symbol in COMMODITIES.keys():
        try:
            old_doc = _prices_col.find_one({"symbol": symbol, "timestamp": {"$gte": day_ago}}, sort=[("timestamp", ASCENDING)])
            latest_doc = _prices_col.find_one({"symbol": symbol}, sort=[("timestamp", DESCENDING)])
            if not old_doc or not latest_doc:
                continue
            old_price = old_doc["price"]
            latest_price = latest_doc["price"]
            move_pct = abs((latest_price - old_price) / old_price) * 100
            if move_pct > 3.0:
                direction = "surged" if latest_price > old_price else "plunged"
                severity = "high" if move_pct > 5.0 else "medium"
                alert_doc = {
                    "type": "price_anomaly",
                    "symbol": symbol,
                    "message": f"{COMMODITIES[symbol]['name']} has {direction} {move_pct:.2f}% in 24h (from {old_price:.2f} to {latest_price:.2f})",
                    "severity": severity,
                    "timestamp": now,
                    "old_price": old_price,
                    "new_price": latest_price,
                    "move_pct": round(move_pct, 4),
                }
                last_alert = _alerts_col.find_one({"symbol": symbol, "type": "price_anomaly"}, sort=[("timestamp", DESCENDING)])
                if last_alert is None or (now - last_alert["timestamp"]) > timedelta(hours=1):
                    _alerts_col.insert_one(alert_doc)
                    print(f"Alert: {alert_doc['message']}")
        except Exception as e:
            print(f"Anomaly detection error for {symbol}: {e}")

class PriceResponse(BaseModel):
    symbol: str
    name: str
    price: float
    unit: str
    change_pct: float
    timestamp: str

class AlertItem(BaseModel):
    type: str
    message: str
    severity: str
    timestamp: str

class AgentQueryRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000)

class AgentStep(BaseModel):
    step: int
    action: str
    result: str

class AgentQueryResponse(BaseModel):
        steps: List[AgentStep]
    conclusion: str
    confidence: str
    sources: List[str]
    question: str

@asynccontextmanager
async def lifespan(app: FastAPI):
    get_db()
    asyncio.create_task(simulate_prices())
    db = get_db()
    if db and _prices_col is not None:
        count = _prices_col.estimated_document_count()
        if count == 0:
            print("Seeding initial price data...")
            now = datetime.now(timezone.utc)
            for i in range(48):
                ts = now - timedelta(hours=48 - i)
                for symbol, info in COMMODITIES.items():
                    base = info["base_price"]
                    price = base * (1 + random.gauss(0, 0.01))
                    _prices_col.insert_one({
                        "symbol": symbol,
                        "name": info["name"],
                        "price": round(price, 4),
                        "unit": info["unit"],
                        "timestamp": ts,
                        "change_pct": round(random.gauss(0, 0.5), 4),
                    })
    yield
    print("Shutting down...")

app = FastAPI(
    title="EconAgent API",
    description="Economic Intelligence Agent - FastAPI backend with Gemini + MongoDB",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"status": "ok", "service": "EconAgent API", "version": "1.0.0"}

@app.get("/prices", response_model=List[PriceResponse])
def get_prices():
    now = datetime.now(timezone.utc)
    results = []
    for symbol, info in COMMODITIES.items():
        current = _price_state[symbol]
        change = round(random.gauss(0, 0.5), 2)
        db = get_db()
        if db and _prices_col is not None:
            try:
                day_ago = now - timedelta(hours=24)
                old = _prices_col.find_one({"symbol": symbol, "timestamp": {"$gte": day_ago}}, sort=[("timestamp", ASCENDING)])
                if old:
                    change = round(((current - old["price"]) / old["price"]) * 100, 2)
            except Exception:
                pass
        results.append(PriceResponse(
            symbol=symbol, name=info["name"], price=round(current, 4),
            unit=info["unit"], change_pct=change, timestamp=now.isoformat(),
        ))
    return results

@app.get("/alerts", response_model=List[AlertItem])
def get_alerts(limit: int = 20):
    db = get_db()
    if db is None or _alerts_col is None:
        return [
            AlertItem(type="price_anomaly", message="Wheat has surged 3.4% in 24h (from 615.20 to 636.12)", severity="medium", timestamp=(datetime.now(timezone.utc) - timedelta(minutes=15)).isoformat()),
            AlertItem(type="price_anomaly", message="Gold has plunged 4.1% in 24h (from 2448.00 to 2348.50)", severity="high", timestamp=(datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()),
        ][:limit]
    alerts = list(_alerts_col.find({}, {"_id": 0}).sort("timestamp", DESCENDING).limit(limit))
    return [AlertItem(**a) for a in alerts]

@app.post("/agent/query", response_model=AgentQueryResponse)
async def agent_query(req: AgentQueryRequest):
    question = req.question
    model = get_gemini_model()
    if model is None:
        steps = [
            AgentStep(step=1, action="Parse question", result=f"Identified query: '{question}'"),
            AgentStep(step=2, action="Query commodity data", result="Gemini API not configured. Using simulated data."),
            AgentStep(step=3, action="Query forex data", result="Simulated USD/INR rate: 83.45 (stable)"),
            AgentStep(step=4, action="Cross-asset analysis", result="Wheat showing moderate strength; INR weakness typically supports commodity prices."),
        ]
        response = AgentQueryResponse(
            steps=steps,
            conclusion="Wheat appears to be a reasonable hedge given current INR weakness, though volatility remains elevated. Consider position sizing carefully.",
            confidence="medium",
            sources=["Simulated commodity feed", "Simulated forex feed"],
            question=question,
        )
        db = get_db()
        if db and _sessions_col is not None:
            _sessions_col.insert_one({"question": question, "response": response.model_dump(), "timestamp": datetime.now(timezone.utc), "model": "fallback"})
        return response

    system_prompt = """You are EconAgent, an economic intelligence analyst. Your job is to answer commodity and forex questions using tool calls.

When given a question:
1. Think step by step about what data you need
2. Call the appropriate tools (get_commodity_data, get_forex_data)
3. Analyze the results
4. Provide a structured conclusion with confidence level

Always return your final answer as valid JSON with this exact structure:
{
  "steps": [
    {"step": 1, "action": "description of what you did", "result": "what you found"},
    ...
  ],
  "conclusion": "your final analysis text",
  "confidence": "high|medium|low",
  "sources": ["list of data sources used"]
}

Be concise but thorough. Use real data from the tools."""

    chat = model.start_chat(enable_automatic_function_calling=False)
    tool_config = {"function_calling_config": {"mode": "AUTO"}}

    try:
        response1 = chat.send_message(
            f"{system_prompt}\n\nUser question: {question}",
            tool_config=tool_config,
            tools=[COMMODITY_TOOL],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini API error: {str(e)}")

    tool_results = []
    function_calls = []
    for part in response1.parts:
        if hasattr(part, "function_call") and part.function_call:
            fc = part.function_call
            function_calls.append(fc)
            if fc.name == "get_commodity_data":
                args = dict(fc.args)
                result = get_commodity_data(args.get("symbol", ""), args.get("limit", 30))
                tool_results.append({"tool": "get_commodity_data", "args": args, "result": result})
            elif fc.name == "get_forex_data":
                args = dict(fc.args)
                result = get_forex_data(args.get("pair", ""), args.get("limit", 30))
                tool_results.append({"tool": "get_forex_data", "args": args, "result": result})

    if function_calls and tool_results:
        function_response_parts = []
        for tr in tool_results:
            function_response_parts.append({"function_response": {"name": tr["tool"], "response": tr["result"]}})
        try:
            response2 = chat.send_message(function_response_parts)
            final_text = response2.text
        except Exception as e:
            final_text = json.dumps({
                "steps": [
                    {"step": 1, "action": "Parse question", "result": f"Question: {question}"},
                    {"step": 2, "action": f"Call {tool_results[0]['tool']}", "result": json.dumps(tool_results[0]['result'])[:200]},
                ] + ([{"step": 3, "action": f"Call {tool_results[1]['tool']}", "result": json.dumps(tool_results[1]['result'])[:200]}] if len(tool_results) > 1 else []),
                "conclusion": f"Based on available data, I analyzed {len(tool_results)} data sources. Please review the specific metrics for your trading decision.",
                "confidence": "medium",
                "sources": [tr["tool"] for tr in tool_results],
            })
    else:
        final_text = response1.text

    try:
        text = final_text.strip()
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()
        parsed = json.loads(text)
        steps = [AgentStep(**s) for s in parsed.get("steps", [])]
        conclusion = parsed.get("conclusion", "Analysis complete.")
        confidence = parsed.get("confidence", "medium")
        sources = parsed.get("sources", [])
    except (json.JSONDecodeError, Exception) as e:
        steps = [
            AgentStep(step=1, action="Parse question", result=question),
            AgentStep(step=2, action="Query tools", result=f"Called {len(tool_results)} tools"),
        ]
        conclusion = final_text[:500] if final_text else "Analysis complete."
        confidence = "medium"
        sources = [tr["tool"] for tr in tool_results]

    response = AgentQueryResponse(steps=steps, conclusion=conclusion, confidence=confidence, sources=sources, question=question)
    db = get_db()
    if db and _sessions_col is not None:
        try:
            _sessions_col.insert_one({"question": question, "response": response.model_dump(), "timestamp": datetime.now(timezone.utc), "model": "gemini-1.5-pro", "tool_calls": tool_results})
        except Exception as e:
            print(f"Session store error: {e}")
    return response

@app.get("/health")
def health():
    db_status = "connected" if get_db() is not None else "disconnected"
    gemini_status = "configured" if GEMINI_API_KEY else "not_configured"
    return {"status": "healthy", "mongodb": db_status, "gemini": gemini_status, "timestamp": datetime.now(timezone.utc).isoformat()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=True)