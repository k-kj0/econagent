"use client";
import { useState, useEffect, useRef, useCallback } from "react";

/* ── Types ─────────────────────────────────────────────────────────────── */
interface NewsCard { headline: string; source: string; url: string; image?: string; }
interface HistoryItem { role: "user" | "agent"; text: string; time: string; }
interface AgentResponse {
  speech?: string; response?: string; sources?: string[];
  newsCards?: NewsCard[]; prediction?: string; youtubeId?: string;
}

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "https://econagent-production.up.railway.app";
const ELEVEN_API_KEY = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY || "";
const ELEVEN_VOICE_ID = process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID || "EXAVITQu4vr4xnSDxMaL";

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
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 48, display: "block" }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`g${color.replace(/[^a-z0-9]/gi, "")}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`M ${pts} L ${W},${H} L 0,${H} Z`} fill={`url(#g${color.replace(/[^a-z0-9]/gi, "")})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 3px ${color})` }} />
      <circle cx={lx} cy={ly} r="3" fill={color} style={{ filter: `drop-shadow(0 0 5px ${color})` }}>
        <animate attributeName="r" values="3;4.5;3" dur="1.5s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

/* ── Globe SVG ──────────────────────────────────────────────────────────── */
function Globe() {
  return (
    <div style={{ position: "relative", width: 320, height: 320, margin: "auto" }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,200,255,0.25) 0%, transparent 70%)", filter: "blur(28px)" }} />
      <svg viewBox="0 0 200 200" style={{ width: "100%", height: "100%", display: "block", animation: "rotateSlow 30s linear infinite" }}>
        <defs>
          <radialGradient id="planet" cx="35%" cy="30%" r="60%">
            <stop offset="0%" stopColor="#1a4a7a" />
            <stop offset="60%" stopColor="#0a2240" />
            <stop offset="100%" stopColor="#04101e" />
          </radialGradient>
          <clipPath id="gc"><circle cx="100" cy="100" r="97" /></clipPath>
        </defs>
        <circle cx="100" cy="100" r="97" fill="url(#planet)" />
        <g fill="rgba(0,200,255,0.3)" clipPath="url(#gc)">
          <path d="M55 70 Q72 58 87 68 T112 78 Q118 95 102 102 L80 97 Q64 90 55 70Z" />
          <path d="M118 88 Q140 82 152 100 T148 132 L132 126 Q116 110 118 88Z" />
          <path d="M68 118 Q90 112 102 130 T86 152 L76 146 Q60 135 68 118Z" />
          <path d="M128 48 Q146 43 152 58 L142 64 Q126 58 128 48Z" />
          <path d="M30 90 Q50 85 55 100 L45 108 Q28 105 30 90Z" />
        </g>
        {[20, 35, 50, 65, 80].map(r => (
          <ellipse key={r} cx="100" cy="100" rx={r} ry="97" fill="none" stroke="rgba(0,200,255,0.1)" strokeWidth="0.4" />
        ))}
        {[20, 35, 50, 65, 80].map(r => (
          <ellipse key={r} cx="100" cy="100" rx="97" ry={r} fill="none" stroke="rgba(0,200,255,0.08)" strokeWidth="0.4" />
        ))}
        <circle cx="100" cy="100" r="97" fill="none" stroke="rgba(0,200,255,0.35)" strokeWidth="1.5" style={{ filter: "drop-shadow(0 0 8px rgba(0,200,255,0.5))" }} />
      </svg>
      {/* Pulsing hotspots */}
      {[{ x: "38%", y: "42%", c: "#ff4466" }, { x: "65%", y: "55%", c: "#00ff88" }, { x: "72%", y: "28%", c: "#00c8ff" }, { x: "48%", y: "68%", c: "#f6ad55" }].map((h, i) => (
        <div key={i} style={{ position: "absolute", left: h.x, top: h.y, transform: "translate(-50%,-50%)" }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: h.c, boxShadow: `0 0 12px ${h.c}`, animation: "pulseDot 2s ease-in-out infinite" }} />
        </div>
      ))}
    </div>
  );
}

/* ── 4 Neon Rotating Rings ──────────────────────────────────────────────── */
function NeonRings() {
  const rings = [
    { size: 340, color: "#00c8ff", duration: "12s", direction: "normal", tilt: "rotateX(15deg) rotateY(0deg)" },
    { size: 280, color: "#00ff88", duration: "18s", direction: "reverse", tilt: "rotateX(60deg) rotateY(30deg)" },
    { size: 220, color: "#7b2fff", duration: "24s", direction: "normal", tilt: "rotateX(75deg) rotateY(60deg)" },
    { size: 160, color: "#ff4488", duration: "30s", direction: "reverse", tilt: "rotateX(45deg) rotateY(90deg)" },
  ];
  return (
    <div style={{ position: "relative", width: 360, height: 360, display: "flex", alignItems: "center", justifyContent: "center", perspective: "800px" }}>
      <div style={{ position: "absolute", width: 360, height: 360, transformStyle: "preserve-3d" }}>
        {rings.map((r, i) => (
          <div key={i} style={{
            position: "absolute",
            top: `${(360 - r.size) / 2}px`,
            left: `${(360 - r.size) / 2}px`,
            width: r.size, height: r.size,
            borderRadius: "50%",
            border: `2px solid ${r.color}`,
            boxShadow: `0 0 12px ${r.color}, 0 0 24px ${r.color}55, inset 0 0 12px ${r.color}22`,
            transform: r.tilt,
            animation: `ringRotate ${r.duration} linear infinite ${r.direction}`,
            transformOrigin: "center center",
          }}>
            {/* Ring dot marker */}
            <div style={{
              position: "absolute", top: -5, left: "50%", marginLeft: -5,
              width: 10, height: 10, borderRadius: "50%",
              background: r.color, boxShadow: `0 0 16px ${r.color}`,
            }} />
          </div>
        ))}
        {/* Center glow orb */}
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: 60, height: 60, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,200,255,0.8) 0%, rgba(0,200,255,0.2) 50%, transparent 70%)",
          boxShadow: "0 0 40px rgba(0,200,255,0.6), 0 0 80px rgba(0,200,255,0.3)",
          animation: "coreGlow 3s ease-in-out infinite",
        }} />
      </div>
      {/* Mic listening hint */}
      <div style={{
        position: "absolute", bottom: -40, left: "50%", transform: "translateX(-50%)",
        fontFamily: "'JetBrains Mono', monospace", fontSize: "0.65rem",
        letterSpacing: "0.2em", color: "rgba(0,200,255,0.5)",
        whiteSpace: "nowrap", animation: "blinkText 2s ease-in-out infinite",
      }}>
        SAY "HEY ECO"
      </div>
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────────────────────── */
export default function Home() {
  const [mode, setMode] = useState<"rings" | "globe">("rings");
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [agentAnswer, setAgentAnswer] = useState("");
  const [agentSpeaking, setAgentSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [newsCards, setNewsCards] = useState<NewsCard[]>([]);
  const [youtubeId, setYoutubeId] = useState<string | null>(null);
  const [tickerIdx, setTickerIdx] = useState(0);
  const [status, setStatus] = useState<"online" | "thinking" | "error">("online");
  const [wakeActive, setWakeActive] = useState(false);
  const [textQuery, setTextQuery] = useState("");

  // Stats (mock live data for panels)
  const [stats, setStats] = useState({
    spx: [4200, 4250, 4180, 4320, 4290, 4400, 4380, 4450, 4420, 4500],
    cpi: [3.2, 3.1, 3.0, 2.9, 2.95, 2.88, 2.85, 2.88, 2.86, 2.88],
    btc: [95000, 98000, 102000, 99000, 105000, 103000, 107000, 105000, 108000, 105000],
  });

  const recognitionRef = useRef<any>(null);
  const wakeRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const historyBottomRef = useRef<HTMLDivElement>(null);

  // Ticker rotation
  useEffect(() => {
    const t = setInterval(() => setTickerIdx(i => (i + 1) % TICKER.length), 4000);
    return () => clearInterval(t);
  }, []);

  // Live stats wiggle
  useEffect(() => {
    const t = setInterval(() => {
      setStats(prev => ({
        spx: [...prev.spx.slice(1), prev.spx.at(-1)! + (Math.random() - 0.48) * 30],
        cpi: [...prev.cpi.slice(1), Math.max(2.5, prev.cpi.at(-1)! + (Math.random() - 0.52) * 0.05)],
        btc: [...prev.btc.slice(1), prev.btc.at(-1)! + (Math.random() - 0.48) * 800],
      }));
    }, 2000);
    return () => clearInterval(t);
  }, []);

  // Scroll history to bottom
  useEffect(() => {
    historyBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  // ElevenLabs TTS
  const speakWithElevenLabs = useCallback(async (text: string) => {
    if (!ELEVEN_API_KEY) {
      // Fallback: browser TTS
      const utt = new SpeechSynthesisUtterance(text);
      utt.rate = 0.95; utt.pitch = 1.0;
      window.speechSynthesis.speak(utt);
      utt.onend = () => setAgentSpeaking(false);
      return;
    }
    try {
      setAgentSpeaking(true);
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_VOICE_ID}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "xi-api-key": ELEVEN_API_KEY },
        body: JSON.stringify({ text, model_id: "eleven_monolingual_v1", voice_settings: { stability: 0.5, similarity_boost: 0.75 } }),
      });
      if (!res.ok) throw new Error("TTS failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (audioRef.current) { audioRef.current.pause(); URL.revokeObjectURL(audioRef.current.src); }
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.play();
      audio.onended = () => { setAgentSpeaking(false); URL.revokeObjectURL(url); };
    } catch {
      setAgentSpeaking(false);
    }
  }, []);

  // Ask backend
  const askAgent = useCallback(async (question: string) => {
    if (!question.trim() || loading) return;
    setLoading(true);
    setStatus("thinking");
    setMode("globe");
    setTranscript(question);
    setAgentAnswer("");
    setNewsCards([]);
    setYoutubeId(null);

    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setHistory(prev => [...prev, { role: "user", text: question, time }]);

    try {
      const res = await fetch(`${BACKEND}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: question }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const data: AgentResponse = await res.json();
      const answer = data.speech || data.response || "No response received.";
      setAgentAnswer(answer);
      if (data.newsCards?.length) setNewsCards(data.newsCards);
      if (data.youtubeId) setYoutubeId(data.youtubeId);
      setStatus("online");
      setHistory(prev => [...prev, { role: "agent", text: answer, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }]);
      await speakWithElevenLabs(answer);
    } catch {
      const err = "I'm having trouble reaching the intelligence backend.";
      setAgentAnswer(err);
      setStatus("error");
      setHistory(prev => [...prev, { role: "agent", text: err, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }]);
    } finally {
      setLoading(false);
    }
  }, [loading, speakWithElevenLabs]);

  // Wake word detection — continuous background recognition
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    let wakeRecog: any = null;
    let commandRecog: any = null;
    let active = true;

    const startCommandListening = () => {
      if (!active) return;
      commandRecog = new SR();
      commandRecog.lang = "en-US";
      commandRecog.continuous = false;
      commandRecog.interimResults = false;
      setListening(true);
      setWakeActive(true);

      commandRecog.onresult = (e: any) => {
        const q = e.results[0][0].transcript.trim();
        setListening(false);
        setWakeActive(false);
        if (q) askAgent(q);
        setTimeout(startWakeListening, 1000);
      };
      commandRecog.onerror = () => { setListening(false); setWakeActive(false); setTimeout(startWakeListening, 1000); };
      commandRecog.onend = () => { if (listening) { setListening(false); setWakeActive(false); setTimeout(startWakeListening, 1000); } };
      commandRecog.start();
    };

    const startWakeListening = () => {
      if (!active) return;
      wakeRecog = new SR();
      wakeRecog.lang = "en-US";
      wakeRecog.continuous = true;
      wakeRecog.interimResults = true;

      wakeRecog.onresult = (e: any) => {
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript.toLowerCase();
          if (t.includes("hey eco")) {
            wakeRecog.stop();
            setMode("rings");
            setTimeout(startCommandListening, 300);
            return;
          }
        }
      };
      wakeRecog.onerror = () => setTimeout(startWakeListening, 2000);
      wakeRecog.onend = () => { if (active && !listening) startWakeListening(); };
      try { wakeRecog.start(); } catch {}
    };

    startWakeListening();
    return () => { active = false; try { wakeRecog?.stop(); commandRecog?.stop(); } catch {} };
  }, [askAgent]);

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (textQuery.trim()) { askAgent(textQuery); setTextQuery(""); }
  };

  const resetToRings = () => { setMode("rings"); setAgentAnswer(""); setTranscript(""); setNewsCards([]); setYoutubeId(null); };

  const spxCurrent = stats.spx.at(-1)!.toFixed(0);
  const cpiCurrent = stats.cpi.at(-1)!.toFixed(2);
  const btcCurrent = (stats.btc.at(-1)! / 1000).toFixed(1);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#080c10", color: "#c8d8e8", fontFamily: "'JetBrains Mono','Fira Code','Courier New',monospace", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(0,200,255,0.2); }
        @keyframes ringRotate { from { transform: var(--tilt) rotate(0deg); } to { transform: var(--tilt) rotate(360deg); } }
        @keyframes rotateSlow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulseDot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.6;transform:scale(1.5)} }
        @keyframes coreGlow { 0%,100%{opacity:0.8;transform:translate(-50%,-50%) scale(1)} 50%{opacity:1;transform:translate(-50%,-50%) scale(1.2)} }
        @keyframes blinkText { 0%,100%{opacity:0.5} 50%{opacity:1} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes dotBlink { 0%,80%,100%{opacity:0.2;transform:scale(0.8)} 40%{opacity:1;transform:scale(1)} }
        @keyframes listenRing { 0%{box-shadow:0 0 0 0 rgba(0,200,255,0.6)} 100%{box-shadow:0 0 0 40px rgba(0,200,255,0)} }
        .ring-container { animation: ringRotate 12s linear infinite; }
        .msg-in { animation: fadeUp 0.3s ease-out; }
      `}</style>

      {/* ── Header ── */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 20px", borderBottom: "1px solid rgba(0,200,255,0.12)", background: "rgba(0,12,22,0.9)", backdropFilter: "blur(12px)", flexShrink: 0, zIndex: 20 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
          <span style={{ fontSize: "1rem", fontWeight: 700, letterSpacing: "0.25em", color: "#00c8ff", textShadow: "0 0 14px rgba(0,200,255,0.6)" }}>◈ ECONAGENT</span>
          <span style={{ fontSize: "0.6rem", letterSpacing: "0.15em", color: "rgba(0,200,255,0.4)" }}>MISSION CONTROL · ECONOMIC INTELLIGENCE</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {wakeActive && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", border: "1px solid rgba(0,200,255,0.4)", background: "rgba(0,200,255,0.08)" }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#00c8ff", animation: "pulse 0.5s infinite" }} />
              <span style={{ fontSize: "0.6rem", letterSpacing: "0.15em", color: "#00c8ff" }}>LISTENING</span>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: status === "online" ? "#00ff88" : status === "thinking" ? "#ffcc00" : "#ff4466", boxShadow: `0 0 6px ${status === "online" ? "#00ff88" : status === "thinking" ? "#ffcc00" : "#ff4466"}`, animation: status !== "error" ? "pulse 2s infinite" : "none" }} />
            <span style={{ fontSize: "0.6rem", letterSpacing: "0.12em", color: "rgba(200,220,240,0.5)" }}>
              {status === "online" ? "ONLINE" : status === "thinking" ? "PROCESSING" : "OFFLINE"}
            </span>
          </div>
        </div>
      </header>

      {/* ── Ticker ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 20px", background: "rgba(0,200,255,0.04)", borderBottom: "1px solid rgba(0,200,255,0.07)", flexShrink: 0 }}>
        <span style={{ fontSize: "0.55rem", letterSpacing: "0.15em", color: "#00ff88", background: "rgba(0,255,136,0.1)", border: "1px solid rgba(0,255,136,0.3)", padding: "1px 5px", flexShrink: 0 }}>LIVE</span>
        <span key={tickerIdx} style={{ fontSize: "0.68rem", color: "rgba(200,220,240,0.65)", animation: "fadeUp 0.4s ease-out", whiteSpace: "nowrap" }}>{TICKER[tickerIdx]}</span>
      </div>

      {/* ── Main 3-panel layout ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>

        {/* ── LEFT PANEL: Stats/Graphs ── */}
        <aside style={{ width: 260, flexShrink: 0, borderRight: "1px solid rgba(0,200,255,0.1)", background: "rgba(0,8,18,0.7)", display: "flex", flexDirection: "column", gap: 0, overflowY: "auto", padding: 14 }}>
          <div style={{ fontSize: "0.58rem", letterSpacing: "0.2em", color: "rgba(0,200,255,0.5)", marginBottom: 12, textTransform: "uppercase" }}>// Live Readout</div>

          {/* SPX */}
          <div style={{ background: "rgba(0,200,255,0.04)", border: "1px solid rgba(0,200,255,0.1)", padding: "10px 12px", marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
              <span style={{ fontSize: "0.58rem", letterSpacing: "0.15em", color: "rgba(200,220,240,0.4)" }}>S&P 500</span>
              <span style={{ fontSize: "0.6rem", color: "#00ff88" }}>▲ +0.8%</span>
            </div>
            <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#e2eaf7", marginBottom: 4 }}>{spxCurrent}</div>
            <Spark data={stats.spx} color="#00ff88" />
          </div>

          {/* CPI */}
          <div style={{ background: "rgba(0,200,255,0.04)", border: "1px solid rgba(0,200,255,0.1)", padding: "10px 12px", marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
              <span style={{ fontSize: "0.58rem", letterSpacing: "0.15em", color: "rgba(200,220,240,0.4)" }}>US CPI</span>
              <span style={{ fontSize: "0.6rem", color: "#00c8ff" }}>▼ -0.02</span>
            </div>
            <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#e2eaf7", marginBottom: 4 }}>{cpiCurrent}%</div>
            <Spark data={stats.cpi} color="#00c8ff" />
          </div>

          {/* BTC */}
          <div style={{ background: "rgba(0,200,255,0.04)", border: "1px solid rgba(0,200,255,0.1)", padding: "10px 12px", marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
              <span style={{ fontSize: "0.58rem", letterSpacing: "0.15em", color: "rgba(200,220,240,0.4)" }}>BTC/USD</span>
              <span style={{ fontSize: "0.6rem", color: "#f6ad55" }}>▲ +2.1%</span>
            </div>
            <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#e2eaf7", marginBottom: 4 }}>${btcCurrent}K</div>
            <Spark data={stats.btc} color="#f6ad55" />
          </div>

          {/* Key signals */}
          <div style={{ fontSize: "0.58rem", letterSpacing: "0.2em", color: "rgba(0,200,255,0.5)", marginBottom: 8, textTransform: "uppercase" }}>// Key Signals</div>
          {[
            { c: "#ff4466", t: "Fed meeting: Jul 30" },
            { c: "#00c8ff", t: "ECB: Sep 2026" },
            { c: "#00ff88", t: "NFP: +142K last" },
            { c: "#f6ad55", t: "Oil: $77.8 WTI" },
            { c: "#7b2fff", t: "Gold: $2,340/oz" },
          ].map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8, animation: `fadeUp 0.3s ${i * 0.05}s ease-out both` }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: s.c, boxShadow: `0 0 6px ${s.c}`, marginTop: 5, flexShrink: 0 }} />
              <span style={{ fontSize: "0.7rem", color: "rgba(200,220,240,0.65)", lineHeight: 1.4 }}>{s.t}</span>
            </div>
          ))}
        </aside>

        {/* ── CENTER: Rings / Globe ── */}
        <main style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", gap: 20 }}>
          {/* Background radial glow */}
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, rgba(0,200,255,0.06) 0%, transparent 65%)", pointerEvents: "none" }} />

          {mode === "rings" ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
              <NeonRings />
              {listening && (
                <div style={{ marginTop: 60, display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#00c8ff", animation: "listenRing 1s ease-out infinite" }} />
                  <span style={{ fontSize: "0.75rem", letterSpacing: "0.2em", color: "#00c8ff" }}>LISTENING...</span>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, animation: "fadeUp 0.5s ease-out", width: "100%" }}>
              <Globe />

              {/* News cards on globe area */}
              {newsCards.length > 0 && (
                <div style={{ display: "flex", gap: 10, overflowX: "auto", width: "100%", padding: "0 20px", justifyContent: "center" }}>
                  {newsCards.slice(0, 3).map((card, i) => (
                    <a key={i} href={card.url} target="_blank" rel="noreferrer" style={{ flexShrink: 0, width: 200, background: "rgba(0,200,255,0.05)", border: "1px solid rgba(0,200,255,0.15)", padding: 10, textDecoration: "none", display: "flex", flexDirection: "column", gap: 6, animation: `fadeUp 0.3s ${i * 0.1}s ease-out both` }}>
                      {card.image && <img src={card.image} alt="" style={{ width: "100%", height: 60, objectFit: "cover", opacity: 0.8 }} />}
                      <span style={{ fontSize: "0.55rem", letterSpacing: "0.1em", color: "rgba(0,200,255,0.5)", textTransform: "uppercase" }}>{card.source}</span>
                      <span style={{ fontSize: "0.68rem", color: "rgba(200,220,240,0.8)", lineHeight: 1.4 }}>{card.headline}</span>
                    </a>
                  ))}
                </div>
              )}

              {/* YouTube embed */}
              {youtubeId && (
                <div style={{ animation: "fadeUp 0.4s ease-out" }}>
                  <iframe width="320" height="180" src={`https://www.youtube.com/embed/${youtubeId}?autoplay=0`} style={{ border: "1px solid rgba(0,200,255,0.2)", borderRadius: 4 }} allowFullScreen />
                </div>
              )}

              {/* Back to rings button */}
              <button onClick={resetToRings} style={{ marginTop: 4, fontFamily: "inherit", fontSize: "0.6rem", letterSpacing: "0.15em", padding: "5px 14px", background: "transparent", border: "1px solid rgba(0,200,255,0.2)", color: "rgba(0,200,255,0.4)", cursor: "pointer", transition: "all 0.2s" }}
                onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = "rgba(0,200,255,0.5)"; (e.target as HTMLElement).style.color = "#00c8ff"; }}
                onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = "rgba(0,200,255,0.2)"; (e.target as HTMLElement).style.color = "rgba(0,200,255,0.4)"; }}>
                ← RETURN TO STANDBY
              </button>
            </div>
          )}

          {/* Loading dots in center */}
          {loading && (
            <div style={{ position: "absolute", bottom: 20, display: "flex", gap: 6 }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(0,200,255,0.6)", animation: `dotBlink 1.2s ${i * 0.2}s infinite` }} />
              ))}
            </div>
          )}
        </main>

        {/* ── RIGHT PANEL: Q&A Transcript ── */}
        <aside style={{ width: 280, flexShrink: 0, borderLeft: "1px solid rgba(0,200,255,0.1)", background: "rgba(0,8,18,0.7)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "12px 14px", borderBottom: "1px solid rgba(0,200,255,0.08)", fontSize: "0.58rem", letterSpacing: "0.2em", color: "rgba(0,200,255,0.5)", textTransform: "uppercase" }}>// Intelligence Brief</div>

          <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 14 }}>
            {!transcript && !agentAnswer && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: 8, textAlign: "center", opacity: 0.4 }}>
                <div style={{ fontSize: "2rem" }}>◈</div>
                <div style={{ fontSize: "0.65rem", letterSpacing: "0.15em" }}>AWAITING QUERY</div>
                <div style={{ fontSize: "0.6rem", color: "rgba(200,220,240,0.4)", lineHeight: 1.6 }}>Say "Hey Eco" or type below to begin briefing</div>
              </div>
            )}

            {transcript && (
              <div style={{ animation: "fadeUp 0.3s ease-out" }}>
                <div style={{ fontSize: "0.55rem", letterSpacing: "0.15em", color: "rgba(200,220,240,0.35)", marginBottom: 5 }}>YOU ASKED</div>
                <div style={{ background: "rgba(0,200,255,0.07)", border: "1px solid rgba(0,200,255,0.2)", padding: "10px 12px", fontSize: "0.78rem", lineHeight: 1.6 }}>{transcript}</div>
              </div>
            )}

            {(agentAnswer || loading) && (
              <div style={{ animation: "fadeUp 0.3s ease-out" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                  <div style={{ fontSize: "0.55rem", letterSpacing: "0.15em", color: "rgba(0,200,255,0.5)" }}>ECONAGENT</div>
                  {agentSpeaking && (
                    <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
                      {[0, 1, 2, 3].map(i => (
                        <div key={i} style={{ width: 2, background: "#00c8ff", borderRadius: 1, animation: `dotBlink ${0.6 + i * 0.1}s ${i * 0.15}s infinite` , height: `${6 + i * 3}px` }} />
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ background: "rgba(0,12,24,0.6)", border: "1px solid rgba(0,200,255,0.1)", padding: "10px 12px", fontSize: "0.78rem", lineHeight: 1.7 }}>
                  {loading && !agentAnswer ? (
                    <div style={{ display: "flex", gap: 5 }}>
                      {[0, 1, 2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(0,200,255,0.5)", animation: `dotBlink 1.2s ${i * 0.2}s infinite` }} />)}
                    </div>
                  ) : agentAnswer}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* ── BOTTOM: Chat history + text input ── */}
      <div style={{ flexShrink: 0, borderTop: "1px solid rgba(0,200,255,0.12)", background: "rgba(0,6,14,0.95)", backdropFilter: "blur(12px)", display: "flex", flexDirection: "column" }}>
        {/* Chat history strip */}
        {history.length > 0 && (
          <div style={{ maxHeight: 120, overflowY: "auto", padding: "8px 20px", borderBottom: "1px solid rgba(0,200,255,0.07)", display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ fontSize: "0.55rem", letterSpacing: "0.2em", color: "rgba(0,200,255,0.3)", marginBottom: 2 }}>// SESSION HISTORY</div>
            {history.map((h, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "baseline", animation: "fadeUp 0.3s ease-out" }}>
                <span style={{ fontSize: "0.58rem", color: h.role === "user" ? "rgba(0,200,255,0.6)" : "rgba(0,255,136,0.6)", flexShrink: 0, letterSpacing: "0.08em" }}>{h.role === "user" ? "YOU" : "ECO"}</span>
                <span style={{ fontSize: "0.65rem", color: "rgba(200,220,240,0.55)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{h.text}</span>
                <span style={{ fontSize: "0.55rem", color: "rgba(200,220,240,0.25)", flexShrink: 0 }}>{h.time}</span>
              </div>
            ))}
            <div ref={historyBottomRef} />
          </div>
        )}

        {/* Text input + mic button */}
        <form onSubmit={handleTextSubmit} style={{ display: "flex", gap: 0, padding: "12px 20px", alignItems: "center", gap: 10 }}>
          {/* Mic button */}
          <button type="button" onClick={() => {
            if (listening) return;
            const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (!SR) return;
            const r = new SR();
            r.lang = "en-US"; r.continuous = false; r.interimResults = false;
            setListening(true); setWakeActive(true);
            r.onresult = (e: any) => { const q = e.results[0][0].transcript.trim(); setListening(false); setWakeActive(false); if (q) askAgent(q); };
            r.onerror = () => { setListening(false); setWakeActive(false); };
            r.onend = () => { setListening(false); setWakeActive(false); };
            r.start();
          }} style={{
            width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
            background: listening ? "rgba(0,200,255,0.25)" : "rgba(0,200,255,0.1)",
            border: `1px solid ${listening ? "#00c8ff" : "rgba(0,200,255,0.3)"}`,
            color: "#00c8ff", cursor: "pointer", fontSize: 18, display: "grid", placeItems: "center",
            boxShadow: listening ? "0 0 20px rgba(0,200,255,0.4), 0 0 0 8px rgba(0,200,255,0.1)" : "none",
            transition: "all 0.2s",
            animation: listening ? "listenRing 1s ease-out infinite" : "none",
          }}>🎙</button>

          <input
            value={textQuery}
            onChange={e => setTextQuery(e.target.value)}
            placeholder="Ask EcoAgent anything about global economics..."
            disabled={loading}
            style={{ flex: 1, fontFamily: "inherit", fontSize: "0.8rem", padding: "11px 14px", background: "rgba(0,200,255,0.04)", border: "1px solid rgba(0,200,255,0.18)", borderRight: "none", color: "#c8d8e8", outline: "none" }}
          />
          <button type="submit" disabled={loading || !textQuery.trim()} style={{
            fontFamily: "inherit", fontSize: "0.7rem", letterSpacing: "0.12em", padding: "11px 20px",
            background: "rgba(0,200,255,0.1)", border: "1px solid rgba(0,200,255,0.3)", color: "#00c8ff",
            cursor: "pointer", opacity: (loading || !textQuery.trim()) ? 0.3 : 1, transition: "all 0.2s",
          }}>BRIEF ME</button>
        </form>
      </div>
    </div>
  );
}
