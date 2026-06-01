"use client";
import { useState, useEffect, useRef } from "react";

interface NewsCard { headline: string; source: string; url: string; image: string; }
interface YtLink { title: string; url: string; thumbnail: string; }
interface EcoResponse {
  speech: string; countries: string[]; prediction: string;
  sources: string[]; newsCards: NewsCard[]; ytLinks: YtLink[]; audioUrl: string;
}

const CONVOS = [
  "World markets today", "US inflation update", "Tech sector news",
  "Climate crisis latest", "Geopolitical tensions",
];

export default function EcoAgent() {
  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<EcoResponse | null>(null);
  const [transcript, setTranscript] = useState("");
  const [sessionTime, setSessionTime] = useState(0);
  const [activeConvo, setActiveConvo] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setInterval(() => setSessionTime(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const fmt = (s: number) => {
    const h = Math.floor(s / 3600).toString().padStart(2, "0");
    const m = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${h}:${m}:${sec}`;
  };

  async function askEco(text: string) {
    if (!text.trim()) return;
    setLoading(true);
    setTranscript(text);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data: EcoResponse = await res.json();
      setResponse(data);
      if (data.audioUrl) {
        new Audio(data.audioUrl).play();
      } else if (data.speech && window.speechSynthesis) {
        const u = new SpeechSynthesisUtterance(data.speech);
        u.rate = 0.92; u.pitch = 0.85;
        window.speechSynthesis.speak(u);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function startListening() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Use Chrome for voice features"); return; }
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onresult = (e: any) => {
      const t = e.results[0][0].transcript;
      setQuery(t);
      askEco(t);
    };
    rec.onerror = () => setListening(false);
    rec.start();
  }

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw", overflow: "hidden", background: "#080d1a", color: "#e2e8f0", fontFamily: "monospace" }}>

      {/* SIDEBAR */}
      <aside style={{ width: 260, borderRight: "1px solid rgba(0,212,255,0.15)", background: "rgba(0,212,255,0.03)", display: "flex", flexDirection: "column", padding: "20px 0" }}>
        <div style={{ padding: "0 20px 20px", borderBottom: "1px solid rgba(0,212,255,0.1)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: "linear-gradient(135deg,#00d4ff,#7c3aed)", display: "grid", placeItems: "center", boxShadow: "0 0 20px rgba(0,212,255,0.4)" }}>
              ✦
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#00d4ff", letterSpacing: "0.3em", textShadow: "0 0 10px rgba(0,212,255,0.8)" }}>ECO</div>
              <div style={{ fontSize: 9, color: "#64748b", letterSpacing: "0.2em" }}>AGENT v2.4</div>
            </div>
          </div>
        </div>
        <div style={{ padding: "16px 12px 8px", fontSize: 9, color: "#64748b", letterSpacing: "0.25em" }}>CONVERSATIONS</div>
        <div style={{ flex: 1, overflowY: "auto", padding: "0 8px" }}>
          {CONVOS.map((c, i) => (
            <button key={i} onClick={() => { setActiveConvo(i); askEco(c); }}
              style={{ width: "100%", textAlign: "left", padding: "10px 12px", borderRadius: 6, marginBottom: 2, background: activeConvo === i ? "rgba(0,212,255,0.12)" : "transparent", border: activeConvo === i ? "1px solid rgba(0,212,255,0.35)" : "1px solid transparent", color: activeConvo === i ? "#e2e8f0" : "#94a3b8", fontSize: 12, cursor: "pointer" }}>
              {c}
            </button>
          ))}
        </div>
        <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(0,212,255,0.1)", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#00d4ff)" }} />
          <div>
            <div style={{ fontSize: 12 }}>Commander</div>
            <div style={{ fontSize: 9, color: "#64748b" }}>clearance · L4</div>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* TOP BAR */}
        <header style={{ height: 56, borderBottom: "1px solid rgba(0,212,255,0.15)", background: "rgba(0,212,255,0.03)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", boxShadow: "0 0 8px #ef4444", display: "inline-block" }} />
              <span style={{ fontSize: 11, color: "#ef4444", letterSpacing: "0.3em" }}>LIVE</span>
            </div>
            <span style={{ color: "rgba(0,212,255,0.2)" }}>|</span>
            <span style={{ fontSize: 10, color: "#64748b", letterSpacing: "0.2em" }}>SESSION</span>
            <span style={{ fontSize: 13, fontFamily: "monospace", color: "#e2e8f0" }}>{fmt(sessionTime)}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {loading && <span style={{ fontSize: 10, color: "#00d4ff", letterSpacing: "0.2em", animation: "pulse 1s infinite" }}>PROCESSING...</span>}
            <button style={{ padding: "6px 16px", borderRadius: 6, border: "1px solid rgba(124,58,237,0.5)", background: "linear-gradient(135deg,rgba(124,58,237,0.2),rgba(0,212,255,0.2))", color: "#a78bfa", fontSize: 11, letterSpacing: "0.2em", cursor: "pointer" }}>
              ♛ BOSS MODE
            </button>
          </div>
        </header>

        {/* CONTENT AREA */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden", paddingBottom: 80 }}>

          {/* CENTER */}
          <main style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12, padding: 16, overflow: "hidden" }}>

            {/* GLOBE */}
            <div style={{ flex: "0 0 55%", borderRadius: 12, border: "1px solid rgba(0,212,255,0.15)", background: "rgba(0,212,255,0.03)", position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 50%, rgba(0,212,255,0.15) 0%, transparent 70%)" }} />
              {/* Globe SVG */}
              <div style={{ width: "min(80%,420px)", aspectRatio: "1", position: "relative" }}>
                <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "radial-gradient(circle at 30% 30%, rgba(0,212,255,0.6), rgba(0,20,60,0.95) 60%, #080d1a 100%)", boxShadow: "0 0 60px rgba(0,212,255,0.3), inset 0 0 60px rgba(0,50,100,0.5)" }} />
                <svg viewBox="0 0 200 200" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", animation: "spin-slow 20s linear infinite", opacity: 0.5 }}>
                  {[15,30,45,60,75,90].map(r => <ellipse key={r} cx="100" cy="100" rx={r} ry="99" fill="none" stroke="rgba(0,212,255,0.2)" strokeWidth="0.3"/>)}
                  {[15,30,45,60,75,90].map(r => <ellipse key={r} cx="100" cy="100" rx="99" ry={r} fill="none" stroke="rgba(0,212,255,0.15)" strokeWidth="0.3"/>)}
                  <g fill="rgba(0,212,255,0.4)">
                    <path d="M55 70 Q70 60 85 70 T110 80 Q115 95 100 100 L80 95 Q65 90 55 70Z"/>
                    <path d="M120 90 Q140 85 150 100 T145 130 L130 125 Q115 110 120 90Z"/>
                    <path d="M70 120 Q90 115 100 130 T85 150 L75 145 Q60 135 70 120Z"/>
                  </g>
                </svg>
                {/* Hotspots */}
                {[{l:"35%",t:"40%",c:"#ef4444"},{l:"60%",t:"55%",c:"#00d4ff"},{l:"70%",t:"30%",c:"#7c3aed"}].map((h,i) => (
                  <div key={i} style={{ position: "absolute", left: h.l, top: h.t, width: 8, height: 8, borderRadius: "50%", background: h.c, boxShadow: `0 0 12px ${h.c}`, transform: "translate(-50%,-50%)" }}>
                    <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: h.c, opacity: 0.6, animation: "ping-slow 1.5s ease-out infinite" }} />
                  </div>
                ))}
              </div>
              {response?.countries && response.countries.length > 0 && (
                <div style={{ position: "absolute", bottom: 12, left: 12, fontSize: 10, color: "#00d4ff", letterSpacing: "0.2em" }}>
                  ACTIVE: {response.countries.join(" · ")}
                </div>
              )}
              <div style={{ position: "absolute", top: 12, left: 12, fontSize: 10, color: "rgba(0,212,255,0.6)", letterSpacing: "0.2em" }}>
                // GLOBAL FEED<br/>
                <span style={{ color: "#64748b" }}>lat 0.000 · lon 0.000</span>
              </div>
            </div>

            {/* NEWS CARDS */}
            <div style={{ flex: 1, overflow: "hidden" }}>
              <div style={{ fontSize: 10, color: "#00d4ff", letterSpacing: "0.3em", marginBottom: 8 }}>// INTEL FEED</div>
              <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8, height: "calc(100% - 24px)" }}>
                {(response?.newsCards || PLACEHOLDER_NEWS).map((card, i) => (
                  <a key={i} href={card.url} target="_blank" rel="noopener noreferrer"
                    style={{ width: 240, flexShrink: 0, borderRadius: 8, border: "1px solid rgba(0,212,255,0.15)", background: "rgba(0,212,255,0.03)", overflow: "hidden", textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column" }}>
                    <div style={{ height: 100, overflow: "hidden", position: "relative", background: "#0f172a" }}>
                      {card.image && <img src={card.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.8 }} />}
                      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, #080d1a, transparent)" }} />
                      <span style={{ position: "absolute", top: 6, left: 6, fontSize: 9, padding: "2px 6px", borderRadius: 3, background: "rgba(8,13,26,0.8)", border: "1px solid rgba(0,212,255,0.4)", color: "#00d4ff", letterSpacing: "0.15em" }}>{card.source}</span>
                    </div>
                    <div style={{ padding: 10, flex: 1 }}>
                      <div style={{ fontSize: 12, lineHeight: 1.4, marginBottom: 8, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{card.headline}</div>
                    </div>
                  </a>
                ))}
                {(response?.ytLinks || []).map((yt, i) => (
                  <a key={`yt-${i}`} href={yt.url} target="_blank" rel="noopener noreferrer"
                    style={{ width: 240, flexShrink: 0, borderRadius: 8, border: "1px solid rgba(124,58,237,0.3)", background: "rgba(124,58,237,0.05)", overflow: "hidden", textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column" }}>
                    <div style={{ height: 100, overflow: "hidden", position: "relative", background: "#0f172a" }}>
                      <img src={yt.thumbnail} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.8 }} />
                      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, #080d1a, transparent)" }} />
                      <span style={{ position: "absolute", top: 6, right: 6, fontSize: 9, padding: "2px 6px", borderRadius: 3, background: "rgba(124,58,237,0.8)", color: "white", letterSpacing: "0.1em" }}>▶ YT</span>
                    </div>
                    <div style={{ padding: 10, flex: 1, fontSize: 11 }}>{yt.title}</div>
                  </a>
                ))}
              </div>
            </div>
          </main>

          {/* RIGHT PANEL */}
          <aside style={{ width: 300, borderLeft: "1px solid rgba(0,212,255,0.15)", background: "rgba(0,212,255,0.02)", padding: 16, display: "flex", flexDirection: "column", gap: 12, overflowY: "auto" }}>
            <div style={{ fontSize: 10, color: "#00d4ff", letterSpacing: "0.3em" }}>// LIVE READOUT</div>

            {/* ECO SPEECH */}
            <div style={{ padding: 14, borderRadius: 8, border: "1px solid rgba(0,212,255,0.2)", background: "rgba(0,212,255,0.05)" }}>
              <div style={{ fontSize: 9, color: "#64748b", letterSpacing: "0.2em", marginBottom: 8 }}>ECO RESPONSE</div>
              <div style={{ fontSize: 12, lineHeight: 1.6, color: "#e2e8f0" }}>
                {loading ? "Processing your request, Boss..." : (response?.speech || "Say 'Hey Eco' or type below to begin, Boss.")}
              </div>
            </div>

            {/* PREDICTION */}
            {response?.prediction && (
              <div style={{ padding: 14, borderRadius: 8, border: "1px solid rgba(124,58,237,0.3)", background: "rgba(124,58,237,0.05)" }}>
                <div style={{ fontSize: 9, color: "#a78bfa", letterSpacing: "0.2em", marginBottom: 8 }}>PREDICTION</div>
                <div style={{ fontSize: 12, lineHeight: 1.6, color: "#c4b5fd" }}>{response.prediction}</div>
              </div>
            )}

            {/* COUNTRIES */}
            {response?.countries && response.countries.length > 0 && (
              <div style={{ padding: 14, borderRadius: 8, border: "1px solid rgba(0,212,255,0.15)", background: "rgba(0,212,255,0.03)" }}>
                <div style={{ fontSize: 9, color: "#64748b", letterSpacing: "0.2em", marginBottom: 8 }}>REGIONS ACTIVE</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {response.countries.map((c, i) => (
                    <span key={i} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 4, border: "1px solid rgba(0,212,255,0.4)", color: "#00d4ff", letterSpacing: "0.15em" }}>{c}</span>
                  ))}
                </div>
              </div>
            )}

            {/* SOURCES */}
            {response?.sources && response.sources.length > 0 && (
              <div style={{ padding: 14, borderRadius: 8, border: "1px solid rgba(0,212,255,0.1)", background: "rgba(0,212,255,0.02)" }}>
                <div style={{ fontSize: 9, color: "#64748b", letterSpacing: "0.2em", marginBottom: 8 }}>CITATIONS</div>
                {response.sources.map((s, i) => (
                  <div key={i} style={{ fontSize: 11, color: "#94a3b8", paddingBottom: 4 }}>[{i+1}] {s}</div>
                ))}
              </div>
            )}
          </aside>
        </div>

        {/* BOTTOM VOICE BAR */}
        <div style={{ position: "fixed", bottom: 0, left: 260, right: 0, height: 72, borderTop: "1px solid rgba(0,212,255,0.15)", background: "rgba(8,13,26,0.95)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", gap: 16, padding: "0 20px", zIndex: 50 }}>
          <button onClick={startListening}
            style={{ width: 48, height: 48, borderRadius: "50%", background: listening ? "linear-gradient(135deg,#ef4444,#dc2626)" : "linear-gradient(135deg,#00d4ff,#7c3aed)", border: "none", cursor: "pointer", fontSize: 18, display: "grid", placeItems: "center", boxShadow: listening ? "0 0 20px rgba(239,68,68,0.5)" : "0 0 20px rgba(0,212,255,0.5)", flexShrink: 0 }}>
            🎤
          </button>
          <div style={{ flex: 1, display: "flex", gap: 3, alignItems: "center", height: 32 }}>
            {Array.from({length: 40}).map((_,i) => (
              <span key={i} style={{ display: "block", width: 3, borderRadius: 2, background: i < 20 ? "#00d4ff" : "#7c3aed", boxShadow: `0 0 4px ${i < 20 ? "#00d4ff" : "#7c3aed"}`, height: listening ? `${20 + Math.sin(i * 0.5) * 15}px` : "4px", transition: "height 0.1s", animationDelay: `${i * 0.05}s`, animation: listening ? `wave ${0.8 + (i % 3) * 0.3}s ease-in-out infinite` : "none" }} />
            ))}
          </div>
          <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { askEco(query); setQuery(""); }}}
            placeholder='Type here or say "Hey Eco"...'
            style={{ width: 280, padding: "10px 16px", borderRadius: 8, border: "1px solid rgba(0,212,255,0.3)", background: "rgba(0,212,255,0.05)", color: "#e2e8f0", fontSize: 12, outline: "none", fontFamily: "monospace" }} />
          <button onClick={() => { askEco(query); setQuery(""); }}
            style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid rgba(0,212,255,0.4)", background: "rgba(0,212,255,0.1)", color: "#00d4ff", fontSize: 11, letterSpacing: "0.2em", cursor: "pointer" }}>
            SEND
          </button>
          <div style={{ fontSize: 10, color: listening ? "#00d4ff" : "#64748b", letterSpacing: "0.2em", textAlign: "right", textShadow: listening ? "0 0 10px rgba(0,212,255,0.8)" : "none" }}>
            {listening ? "LISTENING..." : "Hey Eco..."}<br/>
            <span style={{ color: "#475569" }}>press ⌘K</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const PLACEHOLDER_NEWS = [
  { headline: "Markets surge on Fed rate decision", source: "Reuters", url: "#", image: "" },
  { headline: "Tech layoffs continue across Silicon Valley", source: "Bloomberg", url: "#", image: "" },
  { headline: "Climate summit reaches landmark agreement", source: "BBC", url: "#", image: "" },
  { headline: "Oil prices rise amid Middle East tensions", source: "AP News", url: "#", image: "" },
  { headline: "AI regulation bill passes Senate committee", source: "Politico", url: "#", image: "" },
];
