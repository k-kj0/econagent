"use client";
import { useState, useEffect, useRef, useCallback } from "react";

/* ── Types ─────────────────────────────────────────────── */
interface NewsCard {
  headline: string;
  source: string;
  url: string;
  image?: string;
}
interface EcoResponse {
  speech: string;
  countries: string[];
  prediction: string;
  sources: string[];
  newsCards: NewsCard[];
}
interface ChatMessage {
  role: "user" | "eco";
  text: string;
  time: string;
}

/* ── Revolving Wireframe Globe ─────────────────────────── */
function WireframeGlobe({ activeCountries }: { activeCountries: string[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const angleRef = useRef(0);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;
    const R = Math.min(W, H) * 0.42;

    // Simplified continent outlines as lat/lon pairs [lat, lon]
    const continents: [number, number][][] = [
      // North America
      [[70,-140],[65,-165],[55,-168],[50,-180],[48,-125],[42,-82],[25,-80],[18,-88],[15,-92],[10,-85],[8,-77],[10,-75],[15,-61],[20,-87],[30,-88],[25,-80],[30,-75],[42,-70],[47,-64],[50,-56],[60,-64],[70,-78],[72,-94],[75,-120],[78,-105],[76,-85],[75,-80],[70,-75],[65,-68],[60,-64],[55,-59],[50,-55],[48,-53],[50,-56],[60,-64],[70,-78],[75,-120],[75,-140],[70,-140]],
      // Europe  
      [[71,28],[70,18],[65,14],[58,5],[51,3],[44,-2],[36,-6],[36,10],[40,18],[42,20],[40,26],[38,26],[36,28],[37,36],[42,42],[46,40],[52,32],[60,28],[65,28],[71,28]],
      // Africa
      [[37,10],[37,37],[12,44],[11,43],[2,42],[-4,40],[-11,38],[-34,26],[-34,19],[-25,17],[-18,12],[-5,8],[5,2],[5,9],[10,15],[15,12],[22,37],[31,32],[37,10]],
      // Asia
      [[70,28],[72,105],[70,140],[60,160],[50,157],[45,135],[40,125],[30,120],[20,110],[10,104],[0,104],[-8,115],[5,100],[10,95],[22,90],[30,78],[38,68],[42,50],[50,57],[65,57],[70,28]],
      // South America
      [[12,-72],[10,-62],[8,-60],[0,-50],[-5,-35],[-10,-38],[-22,-40],[-33,-52],[-55,-68],[-56,-68],[-40,-62],[-25,-50],[-15,-76],[-2,-80],[0,-78],[10,-75],[12,-72]],
      // Australia
      [[-16,136],[-14,130],[-22,114],[-32,116],[-38,145],[-44,148],[-38,148],[-32,152],[-16,144],[-12,136],[-16,136]],
      // Antarctica (simplified)
      [[-70,-180],[-70,180],[-80,180],[-80,-180],[-70,-180]],
    ];

    function project(lat: number, lon: number, rotY: number): { x: number; y: number; visible: boolean } {
      const phi = (lat * Math.PI) / 180;
      const lam = ((lon + rotY) * Math.PI) / 180;
      const x3 = Math.cos(phi) * Math.cos(lam);
      const y3 = Math.sin(phi);
      const z3 = Math.cos(phi) * Math.sin(lam);
      return { x: cx + R * x3, y: cy - R * y3, visible: z3 > 0 };
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);

      const rot = angleRef.current;

      // Atmosphere glow
      const grad = ctx.createRadialGradient(cx, cy, R * 0.8, cx, cy, R * 1.3);
      grad.addColorStop(0, "rgba(0,200,255,0.07)");
      grad.addColorStop(1, "rgba(0,150,255,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.3, 0, Math.PI * 2);
      ctx.fill();

      // Sphere base
      const sphereGrad = ctx.createRadialGradient(cx - R * 0.2, cy - R * 0.2, 0, cx, cy, R);
      sphereGrad.addColorStop(0, "rgba(0,50,80,0.25)");
      sphereGrad.addColorStop(0.6, "rgba(0,20,50,0.15)");
      sphereGrad.addColorStop(1, "rgba(0,10,30,0.05)");
      ctx.fillStyle = sphereGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fill();

      // Latitude lines
      ctx.lineWidth = 0.4;
      for (let lat = -80; lat <= 80; lat += 20) {
        ctx.beginPath();
        let started = false;
        for (let lon = -180; lon <= 180; lon += 3) {
          const p = project(lat, lon, rot);
          if (p.visible) {
            const alpha = Math.max(0, (p.visible ? 0.35 : 0));
            ctx.strokeStyle = `rgba(0,200,255,${alpha})`;
            if (!started) { ctx.moveTo(p.x, p.y); started = true; }
            else ctx.lineTo(p.x, p.y);
          } else {
            if (started) { ctx.stroke(); ctx.beginPath(); started = false; }
          }
        }
        if (started) ctx.stroke();
      }

      // Longitude lines
      for (let lon = -180; lon < 180; lon += 20) {
        ctx.beginPath();
        let started = false;
        for (let lat = -90; lat <= 90; lat += 3) {
          const p = project(lat, lon, rot);
          if (p.visible) {
            ctx.strokeStyle = "rgba(0,200,255,0.3)";
            if (!started) { ctx.moveTo(p.x, p.y); started = true; }
            else ctx.lineTo(p.x, p.y);
          } else {
            if (started) { ctx.stroke(); ctx.beginPath(); started = false; }
          }
        }
        if (started) ctx.stroke();
      }

      // Continent outlines — glowing bright cyan
      ctx.lineWidth = 1.5;
      ctx.shadowColor = "rgba(0,220,255,0.8)";
      ctx.shadowBlur = 6;
      for (const continent of continents) {
        ctx.beginPath();
        let started = false;
        for (const [lat, lon] of continent) {
          const p = project(lat, lon, rot);
          const alpha = p.visible ? 0.85 : 0;
          ctx.strokeStyle = `rgba(0,220,255,${alpha})`;
          if (!started) { ctx.moveTo(p.x, p.y); started = true; }
          else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      }
      ctx.shadowBlur = 0;

      // Outer glow ring
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "rgba(0,200,255,0.5)";
      ctx.shadowColor = "rgba(0,200,255,0.8)";
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Equator highlight
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(0,255,200,0.4)";
      ctx.shadowColor = "rgba(0,255,200,0.6)";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      let eqStarted = false;
      for (let lon = -180; lon <= 180; lon += 2) {
        const p = project(0, lon, rot);
        if (p.visible) {
          if (!eqStarted) { ctx.moveTo(p.x, p.y); eqStarted = true; }
          else ctx.lineTo(p.x, p.y);
        } else {
          if (eqStarted) { ctx.stroke(); ctx.beginPath(); eqStarted = false; }
        }
      }
      if (eqStarted) ctx.stroke();
      ctx.shadowBlur = 0;

      // Country hotspots
      const hotspots: Record<string, [number, number]> = {
        US: [38, -97], UK: [55, -3], CN: [35, 105], IN: [22, 79],
        EU: [50, 10], JP: [37, 138], RU: [62, 100], BR: [-15, -47],
        AU: [-25, 133], DE: [51, 10], FR: [47, 2],
      };
      for (const country of activeCountries) {
        const coords = hotspots[country.toUpperCase()];
        if (coords) {
          const p = project(coords[0], coords[1], rot);
          if (p.visible) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(0,255,180,0.9)";
            ctx.shadowColor = "rgba(0,255,180,1)";
            ctx.shadowBlur = 15;
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        }
      }

      angleRef.current -= 0.18; // rotation speed
      frameRef.current = requestAnimationFrame(draw);
    }

    frameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameRef.current);
  }, [activeCountries]);

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={600}
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}

/* ── Sparkline ─────────────────────────────────────────── */
function Sparkline({ data, color, up }: { data: number[]; color: string; up: boolean }) {
  const max = Math.max(...data), min = Math.min(...data);
  const W = 220, H = 48;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((v - min) / (max - min || 1)) * (H - 6) - 3;
    return `${x},${y}`;
  });
  const line = pts.join(" L ");
  const fill = `M ${line} L ${W},${H} L 0,${H} Z`;
  const last = pts[pts.length - 1].split(",");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 48, display: "block" }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`sg${color.replace(/[^a-z]/gi, "")}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`M ${fill}`} fill={`url(#sg${color.replace(/[^a-z]/gi, "")})`} />
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 3px ${color})` }} />
      <circle cx={last[0]} cy={last[1]} r="3" fill={color} style={{ filter: `drop-shadow(0 0 6px ${color})` }}>
        <animate attributeName="r" values="2.5;4;2.5" dur="1.5s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

/* ── Static data ───────────────────────────────────────── */
const SP_DATA = [4200, 4350, 4280, 4420, 4380, 4500, 4450, 4498];
const CPI_DATA = [3.1, 3.0, 2.98, 2.95, 2.92, 2.90, 2.88, 2.87];
const BTC_DATA = [85000, 90000, 95000, 88000, 100000, 102000, 104000, 106200];

const SIGNALS = [
  { dot: "#fc8181", text: "Fed meeting: Jul 30" },
  { dot: "#63b3ed", text: "ECB: Sep 2026" },
  { dot: "#68d391", text: "NFP: +142K last" },
  { dot: "#f6ad55", text: "Oil: $72.3 WTI" },
];

/* ── News ticker items ─────────────────────────────────── */
const TICKER_ITEMS = [
  "US CPI falls to 2.88% as energy prices stabilise · Reuters",
  "Fed signals potential rate cuts in Q3 2026 · Bloomberg",
  "S&P 500 edges higher as tech leads rally · CNBC",
  "Bitcoin surpasses $106K amid institutional demand · CoinDesk",
  "ECB holds rates, signals September review · FT",
];

/* ── Main Page ─────────────────────────────────────────── */
export default function Page() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<EcoResponse | null>(null);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [tickerIdx, setTickerIdx] = useState(0);
  const [listening, setListening] = useState(false);
  const [sessionSecs, setSessionSecs] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Session timer
  useEffect(() => {
    const t = setInterval(() => setSessionSecs(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Ticker rotation
  useEffect(() => {
    const t = setInterval(() => setTickerIdx(i => (i + 1) % TICKER_ITEMS.length), 5000);
    return () => clearInterval(t);
  }, []);

  // Scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  const now = () => new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "https://ecoagent-backend-production.up.railway.app";

  const askEco = useCallback(async (text: string) => {
    if (!text.trim()) return;
    setLoading(true);
    setQuery("");
    const userMsg: ChatMessage = { role: "user", text, time: now() };
    setChat(prev => [...prev, userMsg]);

    try {
      const res = await fetch(`${BACKEND}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error(`Backend ${res.status}`);
      const data: EcoResponse = await res.json();
      setResponse(data);
      const ecoMsg: ChatMessage = { role: "eco", text: data.speech, time: now() };
      setChat(prev => [...prev, ecoMsg]);

      // TTS
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const utt = new SpeechSynthesisUtterance(data.speech);
        utt.rate = 0.92;
        utt.pitch = 0.85;
        const voices = window.speechSynthesis.getVoices();
        const preferred = voices.find(v => v.name.includes("Google UK English Male") || v.name.includes("Daniel"));
        if (preferred) utt.voice = preferred;
        window.speechSynthesis.speak(utt);
      }
    } catch (err) {
      const ecoMsg: ChatMessage = {
        role: "eco",
        text: `Boss, the backend is offline. Check NEXT_PUBLIC_BACKEND_URL in Vercel env vars. Error: ${err}`,
        time: now(),
      };
      setChat(prev => [...prev, ecoMsg]);
    } finally {
      setLoading(false);
    }
  }, [BACKEND]);

  // Voice recognition
  const toggleVoice = useCallback(() => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      alert("Speech recognition not supported in this browser. Use Chrome.");
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec: SpeechRecognition = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-US";
    rec.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = e.results[0][0].transcript;
      askEco(transcript);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  }, [listening, askEco]);

  const fmtTime = (s: number) => {
    const h = String(Math.floor(s / 3600)).padStart(2, "0");
    const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
    const sec = String(s % 60).padStart(2, "0");
    return `${h}:${m}:${sec}`;
  };

  const activeCountries = response?.countries ?? [];

  return (
    <div className="eco-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Exo+2:wght@300;400;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:#020b14;color:#c8e8f0;font-family:'Exo 2',system-ui,sans-serif;overflow:hidden;height:100vh;}
        ::-webkit-scrollbar{width:3px;height:3px;}
        ::-webkit-scrollbar-thumb{background:rgba(0,200,255,0.2);border-radius:2px;}
        @keyframes ping{0%{transform:scale(1);opacity:.7}100%{transform:scale(2.5);opacity:0}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes ticker{0%{opacity:0;transform:translateY(4px)}10%{opacity:1;transform:translateY(0)}90%{opacity:1}100%{opacity:0;transform:translateY(-4px)}}
        @keyframes slideIn{from{opacity:0;transform:translateX(10px)}to{opacity:1;transform:translateX(0)}}
        @keyframes scanline{0%{top:0}100%{top:100%}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        .eco-root{display:flex;flex-direction:column;height:100vh;overflow:hidden;background:#020b14;}
        /* Header */
        .hdr{display:flex;align-items:center;justify-content:space-between;padding:0 20px;height:50px;border-bottom:1px solid rgba(0,200,255,0.15);background:rgba(2,10,20,0.95);backdrop-filter:blur(20px);flex-shrink:0;}
        .hdr-logo{display:flex;align-items:center;gap:10px;}
        .hdr-diamond{width:20px;height:20px;background:linear-gradient(135deg,#00cfff,#0080ff);transform:rotate(45deg);box-shadow:0 0 15px rgba(0,200,255,0.8);}
        .hdr-name{font-family:'Share Tech Mono',monospace;font-size:18px;letter-spacing:.35em;color:#00e5ff;text-shadow:0 0 20px rgba(0,229,255,0.8);}
        .hdr-sub{font-family:'Share Tech Mono',monospace;font-size:10px;letter-spacing:.25em;color:rgba(0,200,255,0.5);}
        .hdr-right{display:flex;align-items:center;gap:8px;font-family:'Share Tech Mono',monospace;font-size:11px;}
        .online-dot{width:8px;height:8px;border-radius:50%;background:#00ff88;box-shadow:0 0 10px #00ff88;animation:pulse 2s ease-in-out infinite;}
        /* Ticker */
        .ticker{height:32px;display:flex;align-items:center;gap:12px;padding:0 16px;border-bottom:1px solid rgba(0,200,255,0.1);background:rgba(0,10,20,0.6);flex-shrink:0;overflow:hidden;}
        .ticker-live{font-family:'Share Tech Mono',monospace;font-size:9px;background:rgba(0,255,100,0.15);border:1px solid rgba(0,255,100,0.4);color:#00ff88;padding:2px 6px;letter-spacing:.2em;border-radius:2px;}
        .ticker-text{font-family:'Share Tech Mono',monospace;font-size:11px;color:rgba(0,200,255,0.8);animation:ticker 5s ease-in-out infinite;}
        /* Main body */
        .body{display:flex;flex:1;overflow:hidden;}
        /* Left panel */
        .left{width:240px;flex-shrink:0;border-right:1px solid rgba(0,200,255,0.1);display:flex;flex-direction:column;overflow-y:auto;background:rgba(2,8,18,0.7);}
        .panel-hdr{font-family:'Share Tech Mono',monospace;font-size:10px;letter-spacing:.25em;color:rgba(0,200,255,0.5);padding:12px 14px 6px;}
        .metric-card{margin:0 10px 10px;background:rgba(0,30,50,0.5);border:1px solid rgba(0,200,255,0.12);border-radius:6px;padding:10px 12px;}
        .metric-label{font-family:'Share Tech Mono',monospace;font-size:9px;letter-spacing:.2em;color:rgba(0,200,255,0.5);text-transform:uppercase;}
        .metric-row{display:flex;justify-content:space-between;align-items:baseline;margin:3px 0;}
        .metric-val{font-family:'Share Tech Mono',monospace;font-size:20px;color:#e2f4ff;}
        .metric-delta{font-family:'Share Tech Mono',monospace;font-size:11px;}
        .signal-item{display:flex;align-items:center;gap:8px;padding:4px 14px;font-family:'Share Tech Mono',monospace;font-size:11px;color:rgba(0,200,255,0.7);}
        .signal-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0;}
        .session-info{margin:10px 14px;font-family:'Share Tech Mono',monospace;font-size:10px;color:rgba(0,200,255,0.35);letter-spacing:.1em;}
        /* Globe center */
        .center{flex:1;display:flex;flex-direction:column;overflow:hidden;position:relative;}
        .globe-wrap{flex:1;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;}
        .globe-scanline{position:absolute;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,rgba(0,200,255,0.3),transparent);animation:scanline 4s linear infinite;pointer-events:none;}
        /* News area */
        .news-area{border-top:1px solid rgba(0,200,255,0.1);height:180px;display:flex;flex-direction:column;background:rgba(2,8,18,0.5);flex-shrink:0;}
        .news-scroll{display:flex;gap:10px;overflow-x:auto;padding:10px 14px;flex:1;}
        .news-card{min-width:220px;max-width:220px;background:rgba(0,25,40,0.7);border:1px solid rgba(0,200,255,0.12);border-radius:6px;padding:10px;flex-shrink:0;cursor:pointer;transition:border-color .2s;animation:slideIn .4s ease;}
        .news-card:hover{border-color:rgba(0,200,255,0.4);}
        .news-src{font-family:'Share Tech Mono',monospace;font-size:9px;letter-spacing:.15em;color:rgba(0,200,255,0.5);margin-bottom:5px;}
        .news-headline{font-size:12px;line-height:1.4;color:rgba(200,230,240,0.85);display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;}
        /* Right panel */
        .right{width:280px;flex-shrink:0;border-left:1px solid rgba(0,200,255,0.1);display:flex;flex-direction:column;background:rgba(2,8,18,0.7);}
        .intel-body{flex:1;overflow-y:auto;padding:10px 14px;}
        .intel-query{background:rgba(0,200,255,0.06);border:1px solid rgba(0,200,255,0.2);border-radius:4px;padding:8px 10px;font-family:'Share Tech Mono',monospace;font-size:12px;color:#c8e8f0;margin-bottom:10px;word-break:break-word;}
        .intel-response{font-size:13px;line-height:1.65;color:#c8e8f0;animation:slideIn .3s ease;}
        .intel-prediction{margin-top:10px;padding-top:10px;border-top:1px solid rgba(0,200,255,0.1);font-family:'Share Tech Mono',monospace;font-size:11px;color:#00e5ff;opacity:.8;}
        .intel-sources{margin-top:8px;display:flex;flex-wrap:wrap;gap:4px;}
        .src-badge{font-family:'Share Tech Mono',monospace;font-size:9px;padding:2px 6px;border:1px solid rgba(0,200,255,0.2);border-radius:2px;color:rgba(0,200,255,0.6);}
        .awaiting{display:flex;flex-direction:column;align-items:center;justify-content:center;height:120px;color:rgba(0,200,255,0.25);font-family:'Share Tech Mono',monospace;font-size:11px;letter-spacing:.2em;gap:8px;}
        /* Chat */
        .chat-area{border-top:1px solid rgba(0,200,255,0.1);max-height:100px;overflow-y:auto;padding:6px 14px;background:rgba(0,5,12,0.5);}
        .chat-row{display:flex;gap:8px;font-family:'Share Tech Mono',monospace;font-size:11px;margin-bottom:2px;animation:slideIn .2s ease;}
        .chat-you{color:rgba(0,200,255,0.5);}
        .chat-eco{color:rgba(0,255,140,0.6);}
        .chat-time{color:rgba(0,200,255,0.2);margin-left:auto;flex-shrink:0;}
        .chat-text{color:rgba(200,230,240,0.75);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        /* Input bar */
        .input-bar{display:flex;align-items:center;gap:10px;padding:10px 16px;border-top:1px solid rgba(0,200,255,0.15);background:rgba(2,8,18,0.95);flex-shrink:0;}
        .mic-btn{width:40px;height:40px;border-radius:50%;border:none;cursor:pointer;display:grid;place-items:center;font-size:16px;flex-shrink:0;transition:all .2s;}
        .mic-idle{background:rgba(0,200,255,0.1);box-shadow:0 0 12px rgba(0,200,255,0.2);}
        .mic-active{background:rgba(0,255,100,0.2);box-shadow:0 0 20px rgba(0,255,100,0.5);animation:pulse 1s ease-in-out infinite;}
        .query-inp{flex:1;background:rgba(0,200,255,0.05);border:1px solid rgba(0,200,255,0.2);border-radius:5px;padding:9px 14px;color:#c8e8f0;font-size:13px;font-family:'Exo 2',system-ui,sans-serif;outline:none;}
        .query-inp:focus{border-color:rgba(0,200,255,0.5);}
        .query-inp::placeholder{color:rgba(0,200,255,0.25);}
        .brief-btn{background:linear-gradient(135deg,rgba(0,200,255,0.2),rgba(0,100,200,0.3));border:1px solid rgba(0,200,255,0.4);border-radius:5px;color:#00e5ff;font-family:'Share Tech Mono',monospace;font-size:11px;letter-spacing:.2em;padding:9px 16px;cursor:pointer;transition:all .2s;white-space:nowrap;}
        .brief-btn:hover{background:linear-gradient(135deg,rgba(0,200,255,0.35),rgba(0,100,200,0.45));box-shadow:0 0 15px rgba(0,200,255,0.3);}
        .brief-btn:disabled{opacity:.4;cursor:not-allowed;}
        .loading-dots{display:inline-flex;gap:4px;align-items:center;}
        .loading-dots span{width:5px;height:5px;border-radius:50%;background:#00e5ff;animation:pulse 1s ease-in-out infinite;}
        .loading-dots span:nth-child(2){animation-delay:.2s;}
        .loading-dots span:nth-child(3){animation-delay:.4s;}
        @media(max-width:900px){.left{display:none;}.right{width:240px;}}
        @media(max-width:600px){.right{display:none;}}
      `}</style>

      {/* ── Header ── */}
      <header className="hdr">
        <div className="hdr-logo">
          <div className="hdr-diamond" />
          <div>
            <div className="hdr-name">ECONAGENT</div>
          </div>
          <div className="hdr-sub">MISSION CONTROL · ECONOMIC INTELLIGENCE</div>
        </div>
        <div className="hdr-right">
          <div className="online-dot" />
          <span style={{ color: "rgba(0,200,255,0.6)", fontSize: 11, fontFamily: "'Share Tech Mono',monospace" }}>ONLINE</span>
          <span style={{ color: "rgba(0,200,255,0.3)", marginLeft: 16, fontFamily: "'Share Tech Mono',monospace", fontSize: 11 }}>{fmtTime(sessionSecs)}</span>
        </div>
      </header>

      {/* ── News ticker ── */}
      <div className="ticker">
        <div className="ticker-live">LIVE</div>
        <div className="ticker-text" key={tickerIdx}>{TICKER_ITEMS[tickerIdx]}</div>
      </div>

      {/* ── Body ── */}
      <div className="body">

        {/* Left — metrics */}
        <div className="left">
          <div className="panel-hdr">// LIVE READOUT</div>

          {/* S&P */}
          <div className="metric-card">
            <div className="metric-label">S&amp;P 500</div>
            <div className="metric-row">
              <span className="metric-val">4498</span>
              <span className="metric-delta" style={{ color: "#68d391" }}>▲ +0.8%</span>
            </div>
            <Sparkline data={SP_DATA} color="#68d391" up={true} />
          </div>

          {/* CPI */}
          <div className="metric-card">
            <div className="metric-label">US CPI</div>
            <div className="metric-row">
              <span className="metric-val">2.87%</span>
              <span className="metric-delta" style={{ color: "#63b3ed" }}>▼ -0.02</span>
            </div>
            <Sparkline data={CPI_DATA} color="#63b3ed" up={false} />
          </div>

          {/* BTC */}
          <div className="metric-card">
            <div className="metric-label">BTC/USD</div>
            <div className="metric-row">
              <span className="metric-val" style={{ fontSize: 16 }}>$106.2K</span>
              <span className="metric-delta" style={{ color: "#f6ad55" }}>▲ +2.1%</span>
            </div>
            <Sparkline data={BTC_DATA} color="#f6ad55" up={true} />
          </div>

          <div className="panel-hdr">// KEY SIGNALS</div>
          {SIGNALS.map((s, i) => (
            <div className="signal-item" key={i}>
              <div className="signal-dot" style={{ background: s.dot, boxShadow: `0 0 8px ${s.dot}` }} />
              {s.text}
            </div>
          ))}

          {/* Session history */}
          {chat.length > 0 && (
            <>
              <div className="panel-hdr" style={{ marginTop: 12 }}>// SESSION HISTORY</div>
              <div style={{ padding: "0 14px 10px", overflowY: "auto", maxHeight: 140 }}>
                {chat.map((m, i) => (
                  <div key={i} style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 11, marginBottom: 3, display: "flex", gap: 6 }}>
                    <span style={{ color: m.role === "user" ? "rgba(0,200,255,0.5)" : "rgba(0,255,140,0.6)", flexShrink: 0 }}>
                      {m.role === "user" ? "YOU" : "ECO"}
                    </span>
                    <span style={{ color: "rgba(200,230,240,0.6)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{m.text}</span>
                    <span style={{ color: "rgba(0,200,255,0.2)", flexShrink: 0 }}>{m.time}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="session-info">SESSION {fmtTime(sessionSecs)}</div>
        </div>

        {/* Center — Globe + news */}
        <div className="center">
          <div className="globe-wrap">
            <div className="globe-scanline" />
            <WireframeGlobe activeCountries={activeCountries} />
          </div>

          {/* News cards */}
          <div className="news-area">
            <div className="panel-hdr" style={{ padding: "8px 14px 4px" }}>// INTEL FEED</div>
            <div className="news-scroll">
              {loading && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 10px", fontFamily: "'Share Tech Mono',monospace", fontSize: 12, color: "rgba(0,200,255,0.5)" }}>
                  <div className="loading-dots"><span /><span /><span /></div>
                  Fetching intelligence...
                </div>
              )}
              {response?.newsCards?.map((n, i) => (
                <a key={i} className="news-card" href={n.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                  <div className="news-src">{n.source?.toUpperCase()}</div>
                  <div className="news-headline">{n.headline}</div>
                </a>
              ))}
              {!loading && !response && (
                <div style={{ display: "flex", alignItems: "center", padding: "0 10px", fontFamily: "'Share Tech Mono',monospace", fontSize: 11, color: "rgba(0,200,255,0.25)", letterSpacing: ".15em" }}>
                  ASK ECONAGENT TO LOAD LIVE FEED
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right — Intelligence Brief */}
        <div className="right">
          <div className="panel-hdr" style={{ padding: "12px 14px 6px" }}>// INTELLIGENCE BRIEF</div>
          <div className="intel-body">
            {chat.length === 0 && !loading ? (
              <div className="awaiting">
                <div style={{ fontSize: 22 }}>◈</div>
                <div>AWAITING QUERY</div>
                <div style={{ fontSize: 10, opacity: .6 }}>Say &quot;Hey Eco&quot; or type below</div>
              </div>
            ) : null}

            {chat.filter(m => m.role === "user").slice(-1).map((m, i) => (
              <div key={i}>
                <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 9, letterSpacing: ".2em", color: "rgba(0,200,255,0.4)", marginBottom: 4 }}>YOU ASKED</div>
                <div className="intel-query">{m.text}</div>
              </div>
            ))}

            {loading && (
              <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 11, color: "rgba(0,200,255,0.5)", display: "flex", gap: 8, alignItems: "center" }}>
                <div className="loading-dots"><span /><span /><span /></div>
                Processing...
              </div>
            )}

            {response && !loading && (
              <div>
                <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 9, letterSpacing: ".2em", color: "rgba(0,255,140,0.5)", marginBottom: 6 }}>ECONAGENT</div>
                <div className="intel-response">{response.speech}</div>
                {response.prediction && (
                  <div className="intel-prediction">⟶ {response.prediction}</div>
                )}
                {response.sources?.length > 0 && (
                  <div className="intel-sources">
                    {response.sources.map((s, i) => <span key={i} className="src-badge">{s}</span>)}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Chat scroll in right panel */}
          <div className="chat-area">
            {chat.map((m, i) => (
              <div key={i} className="chat-row">
                <span className={m.role === "user" ? "chat-you" : "chat-eco"}>{m.role === "user" ? "YOU" : "ECO"}</span>
                <span className="chat-text">{m.text}</span>
                <span className="chat-time">{m.time}</span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        </div>
      </div>

      {/* ── Input bar ── */}
      <div className="input-bar">
        <button
          className={`mic-btn ${listening ? "mic-active" : "mic-idle"}`}
          onClick={toggleVoice}
          title={listening ? "Stop listening" : "Voice input"}
        >
          🎙
        </button>
        <input
          className="query-inp"
          placeholder="Ask EcoAgent anything about global economics..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !loading && askEco(query)}
          disabled={loading}
        />
        <button
          className="brief-btn"
          onClick={() => askEco(query)}
          disabled={loading || !query.trim()}
        >
          {loading ? <span className="loading-dots"><span /><span /><span /></span> : "BRIEF ME"}
        </button>
      </div>
    </div>
  );
}
