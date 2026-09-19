# EcoAgent — Mission Control

Real-time global economic intelligence assistant, powered by Gemini.

## What it does

Ask it about inflation, markets, or breaking news — it pulls live data and responds with a synthesized, cited answer.

**Live:** econagent.vercel.app

## Features

- Natural language Q&A over live economic and news data
- Real-time headline ticker (Reuters, Bloomberg, FT, WSJ, CNBC, CoinDesk)
- Economic indicators: CPI, Fed rate signals, PMI, oil, crypto
- Dedicated inflation dashboard
- Conversation memory within a session
- Dark glassmorphism UI, mobile responsive

## Example

**Query:** "What is happening with inflation in the US?"
**Response:** "US CPI dropped to 2.88% as energy prices stabilised. The Fed is signalling potential rate cuts in Q3 2026 if the trend holds..."

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite (Vercel) |
| AI | Google Gemini 1.5 Flash |
| Backend | FastAPI (Python) |
| News data | Live financial headlines API |
| Hosting | Vercel (frontend) · Railway (backend) |

## Architecture
User Query → React Frontend → FastAPI Backend
├── Gemini 1.5 Flash (synthesizes response, cites sources)
├── News API (live headlines)
└── Economic data (CPI, rates, PMI)
→ JSON response → Frontend renders text + news cards + ticker


## Local setup

**Backend:**
```bash
git clone https://github.com/k-kj0/econagent.git
cd econagent/ecoagent-backend
pip install -r requirements.txt
cp .env.example .env   # add GEMINI_API_KEY and NEWS_API_KEY
uvicorn main:app --reload --port 8080
```

**Frontend:**
```bash
cd econagent
npm install
echo "VITE_BACKEND_URL=http://localhost:8080" > .env.local
npm run dev
```

## API reference

**POST /ask**
```json
{ "text": "What is happening with US inflation?" }
```
Returns: `speech`, `countries`, `prediction`, `sources`, `newsCards`.

## Why I built this

Solo project exploring agentic architecture with Gemini — tool selection, live multi-source data synthesis, and cited output, built as a portfolio piece rather than for a hackathon.

## License

MIT
