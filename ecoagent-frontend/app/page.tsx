"use client";
import { useState, useEffect, useRef, useCallback } from "react";

/* ── Types ─────────────────────────────────────────────────────────────── */
interface NewsCard { headline: string; source: string; url: string; image?: string; }
interface HistoryItem { role: "user" | "agent"; text: string; time: string; }
interface AgentResponse {
  speech?: string; response?: string; sources?: string[];
  newsCards?: NewsCard[]; prediction?: string; youtubeId?: string;
}

const BACKEND = "/api";

/* ── API KEYS ───────────────────────────────────────────────────────────── */
const ELEVEN_API_KEY = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY || "";
const ELEVEN_VOICE_ID = process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID || "EXAVITQu4vr4xnSDxMaL";

/* ✅ ADDED GOOGLE API KEY (REPLACES ANY ANTHROPIC USAGE IN BACKEND SETUP) */
const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || "";

/* ── Ticker ─────────────────────────────────────────────────────────────── */
const TICKER = [
  "Fed signals potential rate cuts in Q3 2026 · Bloomberg",
  "US CPI falls to 2.88% as energy prices stabilise · Reuters",
  "Bitcoin crosses $105K amid institutional inflows · CoinDesk",
  "ECB holds rates steady, eyes September decision · FT",
  "Crude oil dips below $78 on demand concerns · CNBC",
  "S&P 500 hits record high on strong earnings · WSJ",
  "India GDP growth forecast revised up to 7.2% · Reuters",
];

/* ── Sparkline ──────────────────────────────────────────────────────────── */
function Spark({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data), min = Math.min(...data), range = max - min || 1;
  const W = 200, H = 48;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * W},${H - ((v - min) / range) * (H - 6) - 3}`).join(" L ");
  const [lx, ly] = pts.split(" L ").at(-1)!.split(",").map(Number);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 48 }} preserveAspectRatio="none">
      <path d={`M ${pts} L ${W},${H} L 0,${H} Z`} fill={`rgba(0,200,255,0.1)`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" />
      <circle cx={lx} cy={ly} r="3" fill={color} />
    </svg>
  );
}

/* ── Globe ──────────────────────────────────────────────────────────────── */
function Globe() {
  return (
    <div style={{ width: 320, height: 320, margin: "auto" }}>
      <svg viewBox="0 0 200 200" style={{ width: "100%", height: "100%" }}>
        <circle cx="100" cy="100" r="97" fill="#0a2240" />
      </svg>
    </div>
  );
}

/* ── Main ───────────────────────────────────────────────────────────────── */
export default function Home() {
  const [loading, setLoading] = useState(false);
  const [agentAnswer, setAgentAnswer] = useState("");
  const [textQuery, setTextQuery] = useState("");

  const askAgent = useCallback(async (question: string) => {
    if (!question.trim()) return;

    setLoading(true);

    try {
      const res = await fetch(`${BACKEND}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: question }),
      });

      const data: AgentResponse = await res.json();
      setAgentAnswer(data.speech || data.response || "No response");
    } catch {
      setAgentAnswer("Backend error");
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>EcoAgent</h2>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          askAgent(textQuery);
        }}
      >
        <input
          value={textQuery}
          onChange={(e) => setTextQuery(e.target.value)}
          placeholder="Ask..."
        />
        <button type="submit">Send</button>
      </form>

      {loading && <p>Loading...</p>}
      {agentAnswer && <p>{agentAnswer}</p>}
    </div>
  );
}
