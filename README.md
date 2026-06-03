EcoAgent · Mission Control

Real-time global economic intelligence — powered by Gemini AI
What is EcoAgent?
EcoAgent is a Jarvis-style AI intelligence assistant that gives you real-time economic and global news briefings — spoken, cited, and visualised. Ask it anything about inflation, markets, geopolitics, or breaking news and it synthesises live data from multiple sources into a concise, cited answer.
Think: Bloomberg Terminal meets Iron Man's JARVIS.
Live: econagent.vercel.app

Features

AI-powered Q&A — Ask natural language questions. EcoAgent responds as a confident briefing agent, addressing you as Boss
Live news ticker — Real-time headlines from Reuters, Bloomberg, FT, WSJ, CNBC, CoinDesk
Economic indicators — CPI, Fed rate signals, PMI data, oil prices, crypto markets
Inflation dashboard — Dedicated inflation view with current CPI and trend context
Conversation memory — Chat history persisted across the session
Sci-fi Mission Control UI — Dark glassmorphism interface with animated status indicators
Mobile responsive — Works on desktop and mobile


Demo
User: "What is happening with inflation in the US?"

EcoAgent: "Boss, US CPI dropped to 2.88% as energy prices stabilised.
           The Fed is signalling potential rate cuts in Q3 2026 if the
           trend holds. Markets are cautiously optimistic — here's what
           the data shows..."
→ Try it live

Tech Stack
LayerTechnologyFrontendReact + Vite (deployed on Vercel)AI BrainGoogle Gemini 1.5 FlashBackendFastAPI (Python)News FeedLive financial headlinesStylingCustom CSS — glassmorphism dark themeHostingVercel (frontend) · Railway (backend)

Architecture
User Query
    │
    ▼
React Frontend (Vercel)
    │  POST /ask
    ▼
FastAPI Backend
    ├── Gemini 1.5 Flash  ← synthesises response + cites sources
    ├── News API          ← live headlines
    └── Economic data     ← CPI, rates, PMI
    │
    ▼
JSON Response
{ speech, countries, newsCards, sources, prediction }
    │
    ▼
Frontend renders:
  • AI text response
  • News cards
  • Live ticker update

Getting Started
Prerequisites

Python 3.11+
Node.js 18+
Google Gemini API key → aistudio.google.com
News API key → newsapi.org

Backend Setup
bash# Clone the repo
git clone https://github.com/k-kj0/econagent.git
cd econagent/ecoagent-backend

# Install dependencies
pip install -r requirements.txt

# Set environment variables
cp .env.example .env
# Add your keys to .env:
# GEMINI_API_KEY=your_key_here
# NEWS_API_KEY=your_key_here

# Run locally
uvicorn main:app --reload --port 8080
Frontend Setup
bashcd econagent  # repo root

# Install dependencies
npm install

# Set backend URL
echo "VITE_BACKEND_URL=http://localhost:8080" > .env.local

# Run locally
npm run dev
Open http://localhost:5173

Environment Variables
Backend (.env)
VariableDescriptionGEMINI_API_KEYGoogle Gemini API key from AI StudioNEWS_API_KEYNewsAPI.org key for live headlinesPORTServer port (default: 8080)
Frontend (.env.local)
VariableDescriptionVITE_BACKEND_URLBackend API URL

Deployment
Frontend → Vercel
bash# Push to GitHub, then:
# 1. Go to vercel.com → Import repo
# 2. Set VITE_BACKEND_URL to your backend URL
# 3. Deploy — done
Backend → Railway / Supabase Edge Functions
The backend is a standard FastAPI app with a Dockerfile included. Deploy to any container platform:
bash# Railway: connect GitHub repo → set env vars → deploy
# Supabase: use Edge Functions (see /supabase folder if present)
# Docker:
docker build -t ecoagent-backend .
docker run -p 8080:8080 --env-file .env ecoagent-backend

API Reference
GET /
Health check.
json{ "status": "EcoAgent online" }
POST /ask
Submit a query to EcoAgent.
Request:
json{ "text": "What is happening with US inflation?" }
Response:
json{
  "speech": "Boss, US CPI dropped to 2.88%...",
  "countries": ["US"],
  "prediction": "Rate cuts likely in Q3 2026 if trend holds.",
  "sources": ["Federal Reserve", "BLS", "Reuters"],
  "newsCards": [
    {
      "headline": "Fed Signals Potential Rate Cuts in Q3 2026",
      "source": "Reuters",
      "url": "https://...",
      "image": "https://..."
    }
  ]
}

Project Structure
econagent/
├── ecoagent-backend/
│   ├── main.py              # FastAPI app + /ask endpoint
│   ├── requirements.txt     # Python dependencies
│   ├── Dockerfile           # Container config
│   └── .env.example         # Environment variable template
├── src/
│   ├── EcoAgent.jsx         # Main dashboard component
│   ├── components/          # UI components
│   └── assets/              # Static assets
├── public/
├── package.json
├── vite.config.js
└── README.md

Roadmap

 Voice wake word — clap detection + "Hey Eco" trigger
 3D interactive globe — countries light up as EcoAgent speaks
 Browser TTS — EcoAgent speaks responses aloud
 YouTube integration — relevant video links per topic
 World Bank + FRED API — deeper economic data
 User authentication — personalised briefing profiles
 Mobile app (React Native)


Built For
This project was built for the Google Gemini Hackathon on Kaggle and as a portfolio piece demonstrating full-stack AI agent development.
Stack alignment with hackathon criteria:

✅ Gemini API as the core AI model
✅ Agentic architecture — tool selection, data synthesis, cited output
✅ Real-world use case — economic intelligence is genuinely useful
✅ Live deployment with public URL
✅ Multi-source data synthesis with citations shown to user


Author
k-kj0 — github.com/k-kj0
Built with Gemini 1.5 Flash · FastAPI · React · Vercel

License
MIT — free to use, fork, and build on.
