"use client";
import { useState, useEffect, useRef, useCallback } from "react";

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

/* ══════════════════════════════════════════════
   REVOLVING WIREFRAME GLOBE (Image-2 style)
══════════════════════════════════════════════ */
function WireframeGlobe({ activeCountries }: { activeCountries: string[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotRef = useRef(0);
  const rafRef = useRef<number>(0);

  const CONTINENTS: [number, number][][] = [
    // North America
    [[70,-140],[65,-168],[50,-180],[48,-125],[42,-82],[25,-80],[18,-88],[10,-85],[8,-77],[15,-61],[20,-87],[30,-88],[25,-80],[30,-75],[42,-70],[50,-56],[60,-64],[70,-78],[75,-120],[76,-85],[70,-75],[65,-68],[55,-59],[48,-53],[50,-56],[60,-64],[70,-78],[75,-140],[70,-140]],
    // South America
    [[12,-72],[10,-62],[0,-50],[-5,-35],[-22,-40],[-34,-52],[-56,-68],[-40,-62],[-25,-50],[-15,-76],[-2,-80],[0,-78],[10,-75],[12,-72]],
    // Europe
    [[71,28],[70,18],[65,14],[58,5],[51,3],[44,-2],[36,-6],[36,10],[40,18],[42,20],[40,26],[38,26],[36,28],[37,36],[42,42],[46,40],[52,32],[60,28],[65,28],[71,28]],
    // Africa
    [[37,10],[37,37],[12,44],[2,42],[-4,40],[-11,38],[-34,26],[-34,19],[-25,17],[-5,8],[5,2],[5,9],[10,15],[22,37],[31,32],[37,10]],
    // Asia (main)
    [[70,28],[72,105],[70,140],[60,160],[50,157],[45,135],[40,125],[30,120],[20,110],[10,104],[0,104],[-8,115],[5,100],[10,95],[22,90],[30,78],[38,68],[42,50],[50,57],[65,57],[70,28]],
    // Australia
    [[-16,136],[-14,130],[-22,114],[-32,116],[-38,145],[-44,148],[-32,152],[-16,144],[-12,136],[-16,136]],
  ];

  const HOTSPOTS: Record<string, [number, number]> = {
    US:[38,-97], UK:[55,-3], CN:[35,105], IN:[22,79], EU:[50,10],
    JP:[37,138], RU:[62,100], BR:[-15,-47], AU:[-25,133],
    DE:[51,10], FR:[47,2], CA:[56,-106], MX:[24,-102],
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2;
    const R = Math.min(W, H) * 0.44;

    function proj(lat: number, lon: number, rotY: number) {
      const phi = (lat * Math.PI) / 180;
      const lam = ((lon + rotY) * Math.PI) / 180;
      const x3 = Math.cos(phi) * Math.cos(lam);
      const y3 = Math.sin(phi);
      const z3 = Math.cos(phi) * Math.sin(lam);
      return { x: cx + R * x3, y: cy - R * y3, vis: z3 > -0.1 };
    }

    function drawPath(pts: [number,number][], rot: number, color: string, width: number, blur: number) {
      ctx.lineWidth = width;
      ctx.shadowBlur = blur;
      ctx.shadowColor = color;
      ctx.strokeStyle = color;
      ctx.beginPath();
      let started = false;
      for (const [lat, lon] of pts) {
        const p = proj(lat, lon, rot);
        if (p.vis) {
          if (!started) { ctx.moveTo(p.x, p.y); started = true; }
          else ctx.lineTo(p.x, p.y);
        } else {
          if (started) { ctx.stroke(); ctx.beginPath(); started = false; }
        }
      }
      if (started) ctx.stroke();
      ctx.shadowBlur = 0;
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      const rot = rotRef.current;

      // Outer glow
      const atmo = ctx.createRadialGradient(cx, cy, R * 0.85, cx, cy, R * 1.35);
      atmo.addColorStop(0, "rgba(0,180,255,0.08)");
      atmo.addColorStop(1, "rgba(0,100,200,0)");
      ctx.fillStyle = atmo;
      ctx.beginPath(); ctx.arc(cx, cy, R * 1.35, 0, Math.PI * 2); ctx.fill();

      // Ocean sphere
      const ocean = ctx.createRadialGradient(cx - R*0.25, cy - R*0.25, 0, cx, cy, R);
      ocean.addColorStop(0, "rgba(0,60,100,0.3)");
      ocean.addColorStop(0.7, "rgba(0,20,50,0.15)");
      ocean.addColorStop(1, "rgba(0,5,20,0.05)");
      ctx.fillStyle = ocean;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

      // Latitude grid lines
      for (let lat = -80; lat <= 80; lat += 20) {
        const pts: [number,number][] = [];
        for (let lon = -180; lon <= 180; lon += 4) pts.push([lat, lon]);
        drawPath(pts, rot, "rgba(0,180,255,0.22)", 0.4, 0);
      }

      // Longitude grid lines
      for (let lon = -180; lon < 180; lon += 20) {
        const pts: [number,number][] = [];
        for (let lat = -85; lat <= 85; lat += 4) pts.push([lat, lon]);
        drawPath(pts, rot, "rgba(0,180,255,0.18)", 0.4, 0);
      }

      // Equator — bright highlight
      const eqPts: [number,number][] = [];
      for (let lon = -180; lon <= 180; lon += 2) eqPts.push([0, lon]);
      drawPath(eqPts, rot, "rgba(0,255,200,0.5)", 1.0, 8);

      // Tropics
      const trop1: [number,number][] = [], trop2: [number,number][] = [];
      for (let lon = -180; lon <= 180; lon += 3) {
        trop1.push([23.5, lon]);
        trop2.push([-23.5, lon]);
      }
      drawPath(trop1, rot, "rgba(0,200,255,0.25)", 0.5, 0);
      drawPath(trop2, rot, "rgba(0,200,255,0.25)", 0.5, 0);

      // Continents — bright glowing cyan
      for (const c of CONTINENTS) {
        drawPath(c, rot, "rgba(0,220,255,0.9)", 1.8, 10);
      }

      // Globe ring
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(0,200,255,0.6)";
      ctx.shadowColor = "rgba(0,200,255,0.9)";
      ctx.shadowBlur = 18;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
      ctx.shadowBlur = 0;

      // Second faint ring (atmosphere)
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(0,150,255,0.15)";
      ctx.beginPath(); ctx.arc(cx, cy, R * 1.04, 0, Math.PI * 2); ctx.stroke();

      // Active country hotspot dots
      for (const cc of activeCountries) {
        const coords = HOTSPOTS[cc.toUpperCase()];
        if (!coords) continue;
        const p = proj(coords[0], coords[1], rot);
        if (!p.vis) continue;
        // Outer pulse ring
        ctx.beginPath();
        ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,255,150,0.15)";
        ctx.fill();
        // Core dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,255,150,1)";
        ctx.shadowColor = "rgba(0,255,150,1)";
        ctx.shadowBlur = 20;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      rotRef.current -= 0.15; // degrees per frame
      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCountries]);

  return (
    <canvas
      ref={canvasRef}
      width={560}
      height={560}
      style={{ width: "100%", height: "100%", display: "block", maxHeight: "100%" }}
    />
  );
}

/* ══ Sparkline ══ */
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data), min = Math.min(...data);
  const W = 200, H = 44;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((v - min) / (max - min || 1)) * (H - 6) - 3;
    return `${x},${y}`;
  });
  const line = pts.join(" ");
  const last = pts[pts.length - 1].split(",");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 44 }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`g${color.replace(/[^a-z0-9]/gi,"")}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={`M ${line} L ${W},${H} L 0,${H} Z`} fill={`url(#g${color.replace(/[^a-z0-9]/gi,"")})`}/>
      <polyline points={line} fill="none" stroke={color} strokeWidth="1.5"
        style={{ filter: `drop-shadow(0 0 3px ${color})` }}/>
      <circle cx={last[0]} cy={last[1]} r="3" fill={color}
        style={{ filter: `drop-shadow(0 0 8px ${color})` }}>
        <animate attributeName="r" values="2.5;4;2.5" dur="1.5s" repeatCount="indefinite"/>
      </circle>
    </svg>
  );
}

/* ══ Static data ══ */
const SP_DATA =  [4200,4350,4280,4420,4380,4500,4450,4498];
const CPI_DATA = [3.1,3.0,2.98,2.95,2.92,2.90,2.88,2.87];
const BTC_DATA = [85000,90000,88000,100000,102000,104000,106200,106500];

const SIGNALS = [
  { dot:"#fc8181", text:"Fed meeting: Jul 30" },
  { dot:"#63b3ed", text:"ECB: Sep 2026" },
  { dot:"#68d391", text:"NFP: +142K last" },
  { dot:"#f6ad55", text:"Oil: $72.3 WTI" },
];

const TICKER = [
  "US CPI falls to 2.88% as energy prices stabilise · Reuters",
  "Fed signals potential rate cuts in Q3 2026 · Bloomberg",
  "S&P 500 edges higher as tech leads rally · CNBC",
  "Bitcoin surpasses $106K amid institutional demand · CoinDesk",
  "ECB holds rates, signals September review · FT",
  "Gold steady at $2,340/oz ahead of Fed minutes · Reuters",
];

/* ══════════════════════════════════════════════
   ELEVENLABS TTS
══════════════════════════════════════════════ */
async function speakElevenLabs(text: string, apiKey: string): Promise<void> {
  // Rachel voice — natural, professional
  const VOICE_ID = "21m00Tcm4TlvDq8ikWAM";
  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_turbo_v2",
          voice_settings: { stability: 0.45, similarity_boost: 0.85, style: 0.3, use_speaker_boost: true },
        }),
      }
    );
    if (!res.ok) throw new Error(`ElevenLabs ${res.status}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.playbackRate = 1.05;
    await audio.play();
    audio.onended = () => URL.revokeObjectURL(url);
  } catch (err) {
    console.warn("ElevenLabs failed, falling back to browser TTS:", err);
    // Browser TTS fallback
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(text);
      utt.rate = 0.92; utt.pitch = 0.85;
      const voices = window.speechSynthesis.getVoices();
      const v = voices.find(x => x.name.includes("Daniel") || x.name.includes("UK English Male"));
      if (v) utt.voice = v;
      window.speechSynthesis.speak(utt);
    }
  }
}

/* ══════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════ */
export default function Page() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<EcoResponse | null>(null);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [tickerIdx, setTickerIdx] = useState(0);
  const [listening, setListening] = useState(false);
  const [sessionSecs, setSessionSecs] = useState(0);
  const [wakeActive, setWakeActive] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const recRef = useRef<any>(null);
  const wakeRecRef = useRef<any>(null);
  const wakeLoopRef = useRef(true);

  const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";
  const ELEVENLABS_KEY = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY ?? "";

  const fmt = (s: number) =>
    [Math.floor(s/3600), Math.floor((s%3600)/60), s%60]
      .map(n => String(n).padStart(2,"0")).join(":");

  const nowStr = () =>
    new Date().toLocaleTimeString("en-GB", { hour:"2-digit", minute:"2-digit" });

  // Session timer
  useEffect(() => {
    const t = setInterval(() => setSessionSecs(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Ticker
  useEffect(() => {
    const t = setInterval(() => setTickerIdx(i => (i+1) % TICKER.length), 5000);
    return () => clearInterval(t);
  }, []);

  // Scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  /* ── Greeting ── */
  const greet = useCallback(async () => {
    const greeting = "Hey Boss, EcoAgent online. What would you like to know today?";
    setChat(prev => [...prev, { role:"eco", text: greeting, time: nowStr() }]);
    if (ELEVENLABS_KEY) {
      await speakElevenLabs(greeting, ELEVENLABS_KEY);
    } else if (typeof window !== "undefined" && window.speechSynthesis) {
      const utt = new SpeechSynthesisUtterance(greeting);
      utt.rate = 0.92; utt.pitch = 0.85;
      window.speechSynthesis.speak(utt);
    }
  }, [ELEVENLABS_KEY]);

  /* ── Ask EcoAgent ── */
  const askEco = useCallback(async (text: string) => {
    if (!text.trim()) return;
    setLoading(true);
    setQuery("");
    setChat(prev => [...prev, { role:"user", text, time: nowStr() }]);

    try {
      const res = await fetch(`${BACKEND}/ask`, {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error(`Backend ${res.status}: check NEXT_PUBLIC_BACKEND_URL`);
      const data: EcoResponse = await res.json();
      setResponse(data);
      setChat(prev => [...prev, { role:"eco", text: data.speech, time: nowStr() }]);
      // Speak with ElevenLabs
      if (data.speech) {
        if (ELEVENLABS_KEY) {
          await speakElevenLabs(data.speech, ELEVENLABS_KEY);
        } else if (typeof window !== "undefined" && window.speechSynthesis) {
          window.speechSynthesis.cancel();
          const utt = new SpeechSynthesisUtterance(data.speech);
          utt.rate = 0.92; utt.pitch = 0.85;
          window.speechSynthesis.speak(utt);
        }
      }
    } catch (err) {
      const msg = `Boss, backend error: ${err}. Add NEXT_PUBLIC_BACKEND_URL in Vercel env vars.`;
      setChat(prev => [...prev, { role:"eco", text: msg, time: nowStr() }]);
      if (ELEVENLABS_KEY) speakElevenLabs(msg, ELEVENLABS_KEY);
    } finally {
      setLoading(false);
    }
  }, [BACKEND, ELEVENLABS_KEY]);

  /* ── Wake word listener: "hey eco" ── */
  useEffect(() => {
    const SR = (typeof window !== "undefined")
      ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
      : null;
    if (!SR) return;

    let active = true;
    wakeLoopRef.current = true;

    function startWake() {
      if (!active || !wakeLoopRef.current) return;
      const rec = new SR();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-US";
      rec.onresult = async (e: any) => {
        const said = e.results[0][0].transcript.toLowerCase().trim();
        if (said.includes("hey eco") || said.includes("eco")) {
          setWakeActive(true);
          await greet();
          setTimeout(() => setWakeActive(false), 3000);
          // After greeting, start command listen
          setTimeout(() => startCommandListen(), 3500);
        }
      };
      rec.onend = () => {
        if (active && wakeLoopRef.current) setTimeout(startWake, 300);
      };
      rec.onerror = () => {
        if (active && wakeLoopRef.current) setTimeout(startWake, 1000);
      };
      wakeRecRef.current = rec;
      try { rec.start(); } catch {}
    }

    function startCommandListen() {
      if (!active) return;
      const rec = new SR();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-US";
      rec.onresult = (e: any) => {
        const said = e.results[0][0].transcript;
        askEco(said);
      };
      rec.onend = () => { if (active) setTimeout(startWake, 500); };
      rec.onerror = () => { if (active) setTimeout(startWake, 1000); };
      try { rec.start(); } catch {}
    }

    // Delay start slightly so page loads first
    const timer = setTimeout(startWake, 1500);

    return () => {
      active = false;
      wakeLoopRef.current = false;
      clearTimeout(timer);
      try { wakeRecRef.current?.stop(); } catch {}
    };
  }, [greet, askEco]);

  /* ── Manual mic button ── */
  const toggleMic = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Use Chrome for voice input."); return; }

    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-US";
    rec.onresult = (e: any) => {
      askEco(e.results[0][0].transcript);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  }, [listening, askEco]);

  const activeCountries = response?.countries ?? [];

  /* ════════════════════════════════
     RENDER
  ════════════════════════════════ */
  return (
    <div className="eco-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Rajdhani:wght@300;400;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        html,body{height:100%;background:#020a14;color:#c8e8f0;overflow:hidden;}
        ::-webkit-scrollbar{width:3px;height:3px;}
        ::-webkit-scrollbar-thumb{background:rgba(0,200,255,0.2);border-radius:2px;}
        @keyframes ping{0%{transform:scale(1);opacity:.7}100%{transform:scale(3);opacity:0}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.2}}
        @keyframes ticker{0%{opacity:0;transform:translateY(5px)}15%{opacity:1;transform:translateY(0)}85%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(-5px)}}
        @keyframes slideIn{from{opacity:0;transform:translateX(8px)}to{opacity:1;transform:translateX(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes pulseGlow{0%,100%{opacity:1;box-shadow:0 0 15px rgba(0,255,100,0.5)}50%{opacity:.7;box-shadow:0 0 30px rgba(0,255,100,0.9)}}
        @keyframes scanline{0%{top:-4px}100%{top:100%}}
        @keyframes wakeFlash{0%{opacity:0}20%{opacity:1}80%{opacity:1}100%{opacity:0}}

        .eco-root{display:flex;flex-direction:column;height:100vh;width:100vw;overflow:hidden;background:#020a14;font-family:'Rajdhani',system-ui,sans-serif;}

        /* Header */
        .hdr{display:flex;align-items:center;justify-content:space-between;padding:0 20px;height:48px;border-bottom:1px solid rgba(0,200,255,0.15);background:rgba(1,6,14,0.97);flex-shrink:0;}
        .hdr-left{display:flex;align-items:center;gap:12px;}
        .hdr-diamond{width:18px;height:18px;background:linear-gradient(135deg,#00cfff,#0080ff);transform:rotate(45deg);box-shadow:0 0 14px rgba(0,200,255,0.8);flex-shrink:0;}
        .hdr-brand{font-family:'Share Tech Mono',monospace;font-size:17px;letter-spacing:.4em;color:#00e5ff;text-shadow:0 0 18px rgba(0,229,255,0.7);}
        .hdr-sep{color:rgba(0,200,255,0.25);margin:0 4px;}
        .hdr-sub{font-family:'Share Tech Mono',monospace;font-size:10px;letter-spacing:.22em;color:rgba(0,200,255,0.45);}
        .hdr-right{display:flex;align-items:center;gap:10px;}
        .online-pill{display:flex;align-items:center;gap:6px;font-family:'Share Tech Mono',monospace;font-size:11px;color:rgba(0,200,255,0.6);}
        .online-dot{width:8px;height:8px;border-radius:50%;background:#00ff88;box-shadow:0 0 10px #00ff88;animation:blink 2s ease-in-out infinite;}
        .wake-banner{position:fixed;top:55px;left:50%;transform:translateX(-50%);z-index:100;background:rgba(0,255,150,0.12);border:1px solid rgba(0,255,150,0.4);border-radius:6px;padding:6px 18px;font-family:'Share Tech Mono',monospace;font-size:12px;color:#00ff96;letter-spacing:.15em;animation:wakeFlash 3s ease forwards;pointer-events:none;}

        /* Ticker */
        .ticker{height:30px;display:flex;align-items:center;gap:12px;padding:0 16px;border-bottom:1px solid rgba(0,200,255,0.08);background:rgba(0,8,18,0.7);flex-shrink:0;overflow:hidden;}
        .ticker-live{font-family:'Share Tech Mono',monospace;font-size:9px;background:rgba(0,255,100,0.12);border:1px solid rgba(0,255,100,0.35);color:#00ff88;padding:2px 7px;letter-spacing:.2em;border-radius:2px;flex-shrink:0;}
        .ticker-text{font-family:'Share Tech Mono',monospace;font-size:11px;color:rgba(0,200,255,0.75);animation:ticker 5s ease-in-out infinite;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}

        /* Body */
        .body{display:flex;flex:1;overflow:hidden;min-height:0;}

        /* Left panel */
        .left{width:230px;flex-shrink:0;border-right:1px solid rgba(0,200,255,0.1);display:flex;flex-direction:column;overflow-y:auto;background:rgba(1,6,14,0.8);}
        .panel-hdr{font-family:'Share Tech Mono',monospace;font-size:10px;letter-spacing:.25em;color:rgba(0,200,255,0.45);padding:10px 14px 5px;}
        .mcard{margin:0 10px 8px;background:rgba(0,25,45,0.55);border:1px solid rgba(0,200,255,0.1);border-radius:5px;padding:9px 11px;}
        .mcard-lbl{font-family:'Share Tech Mono',monospace;font-size:9px;letter-spacing:.2em;color:rgba(0,200,255,0.45);text-transform:uppercase;}
        .mcard-row{display:flex;justify-content:space-between;align-items:baseline;margin:3px 0 1px;}
        .mcard-val{font-family:'Share Tech Mono',monospace;font-size:19px;color:#e2f4ff;}
        .mcard-d{font-family:'Share Tech Mono',monospace;font-size:11px;}
        .sig{display:flex;align-items:center;gap:8px;padding:4px 14px;font-family:'Share Tech Mono',monospace;font-size:11px;color:rgba(0,200,255,0.65);}
        .sig-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0;}
        .hist{padding:0 12px 8px;overflow-y:auto;max-height:130px;}
        .hist-row{display:flex;gap:6px;font-family:'Share Tech Mono',monospace;font-size:10px;margin-bottom:2px;animation:slideIn .2s ease;}
        .hist-lbl-you{color:rgba(0,200,255,0.5);}
        .hist-lbl-eco{color:rgba(0,255,140,0.55);}
        .hist-txt{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:rgba(180,220,240,0.6);}
        .hist-t{color:rgba(0,200,255,0.2);flex-shrink:0;}
        .sess-info{margin:8px 14px 10px;font-family:'Share Tech Mono',monospace;font-size:10px;color:rgba(0,200,255,0.3);letter-spacing:.08em;}

        /* Globe center */
        .center{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0;position:relative;}
        .globe-area{flex:1;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;}
        .scanline{position:absolute;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,rgba(0,200,255,0.25),transparent);animation:scanline 5s linear infinite;pointer-events:none;z-index:2;}

        /* News strip */
        .news-strip{border-top:1px solid rgba(0,200,255,0.08);height:165px;flex-shrink:0;display:flex;flex-direction:column;background:rgba(1,6,14,0.6);}
        .news-row{display:flex;gap:10px;overflow-x:auto;padding:8px 12px;flex:1;}
        .ncard{min-width:210px;max-width:210px;background:rgba(0,20,38,0.8);border:1px solid rgba(0,200,255,0.1);border-radius:5px;padding:9px 10px;cursor:pointer;transition:border-color .2s;text-decoration:none;display:block;flex-shrink:0;animation:slideIn .35s ease;}
        .ncard:hover{border-color:rgba(0,200,255,0.4);}
        .ncard-src{font-family:'Share Tech Mono',monospace;font-size:9px;letter-spacing:.15em;color:rgba(0,200,255,0.45);margin-bottom:5px;}
        .ncard-hl{font-size:12px;line-height:1.4;color:rgba(200,232,245,0.85);display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;}

        /* Right panel */
        .right{width:270px;flex-shrink:0;border-left:1px solid rgba(0,200,255,0.1);display:flex;flex-direction:column;background:rgba(1,6,14,0.8);}
        .intel-scroll{flex:1;overflow-y:auto;padding:10px 13px;}
        .you-lbl{font-family:'Share Tech Mono',monospace;font-size:9px;letter-spacing:.2em;color:rgba(0,200,255,0.38);margin-bottom:3px;}
        .you-box{background:rgba(0,200,255,0.05);border:1px solid rgba(0,200,255,0.18);border-radius:4px;padding:7px 9px;font-family:'Share Tech Mono',monospace;font-size:12px;color:#c8e8f0;margin-bottom:10px;word-break:break-word;}
        .eco-lbl{font-family:'Share Tech Mono',monospace;font-size:9px;letter-spacing:.2em;color:rgba(0,255,140,0.45);margin-bottom:5px;}
        .eco-resp{font-size:13px;line-height:1.65;color:#c8e8f0;animation:fadeIn .4s ease;}
        .eco-pred{margin-top:9px;padding-top:9px;border-top:1px solid rgba(0,200,255,0.1);font-family:'Share Tech Mono',monospace;font-size:11px;color:#00e5ff;opacity:.75;}
        .eco-srcs{margin-top:7px;display:flex;flex-wrap:wrap;gap:4px;}
        .src-badge{font-family:'Share Tech Mono',monospace;font-size:9px;padding:2px 6px;border:1px solid rgba(0,200,255,0.18);border-radius:2px;color:rgba(0,200,255,0.55);}
        .awaiting{display:flex;flex-direction:column;align-items:center;justify-content:center;height:130px;color:rgba(0,200,255,0.2);font-family:'Share Tech Mono',monospace;font-size:11px;letter-spacing:.2em;gap:8px;text-align:center;}

        /* Input bar */
        .input-bar{display:flex;align-items:center;gap:10px;padding:9px 16px;border-top:1px solid rgba(0,200,255,0.13);background:rgba(1,5,12,0.97);flex-shrink:0;}
        .mic-btn{width:40px;height:40px;border-radius:50%;border:none;cursor:pointer;display:grid;place-items:center;font-size:17px;flex-shrink:0;transition:all .2s;}
        .mic-idle{background:rgba(0,200,255,0.08);box-shadow:0 0 10px rgba(0,200,255,0.15);}
        .mic-on{background:rgba(0,255,100,0.15);box-shadow:0 0 20px rgba(0,255,100,0.5);animation:pulseGlow 1s ease-in-out infinite;}
        .qinp{flex:1;background:rgba(0,200,255,0.04);border:1px solid rgba(0,200,255,0.18);border-radius:4px;padding:9px 13px;color:#c8e8f0;font-size:13px;font-family:'Rajdhani',system-ui,sans-serif;outline:none;}
        .qinp:focus{border-color:rgba(0,200,255,0.45);}
        .qinp::placeholder{color:rgba(0,200,255,0.22);}
        .brief-btn{background:linear-gradient(135deg,rgba(0,200,255,0.18),rgba(0,100,200,0.28));border:1px solid rgba(0,200,255,0.38);border-radius:4px;color:#00e5ff;font-family:'Share Tech Mono',monospace;font-size:11px;letter-spacing:.2em;padding:9px 16px;cursor:pointer;transition:all .2s;white-space:nowrap;flex-shrink:0;}
        .brief-btn:hover{background:linear-gradient(135deg,rgba(0,200,255,0.32),rgba(0,100,200,0.42));box-shadow:0 0 15px rgba(0,200,255,0.25);}
        .brief-btn:disabled{opacity:.35;cursor:not-allowed;}
        .ldots{display:inline-flex;gap:4px;align-items:center;}
        .ldots span{width:5px;height:5px;border-radius:50%;background:#00e5ff;animation:blink 1s ease-in-out infinite;}
        .ldots span:nth-child(2){animation-delay:.2s;}
        .ldots span:nth-child(3){animation-delay:.4s;}

        @media(max-width:900px){.left{width:180px;}}
        @media(max-width:700px){.left{display:none;}.right{width:220px;}}
        @media(max-width:500px){.right{display:none;}}
      `}</style>

      {/* Wake-word banner */}
      {wakeActive && <div className="wake-banner">◈ WAKE WORD DETECTED — ECONAGENT ACTIVE</div>}

      {/* Header */}
      <header className="hdr">
        <div className="hdr-left">
          <div className="hdr-diamond"/>
          <span className="hdr-brand">ECONAGENT</span>
          <span className="hdr-sep">·</span>
          <span className="hdr-sub">MISSION CONTROL · ECONOMIC INTELLIGENCE</span>
        </div>
        <div className="hdr-right">
          <div className="online-pill">
            <div className="online-dot"/>
            <span>ONLINE</span>
          </div>
          <span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:11,color:"rgba(0,200,255,0.3)"}}>
            {fmt(sessionSecs)}
          </span>
        </div>
      </header>

      {/* Ticker */}
      <div className="ticker">
        <div className="ticker-live">LIVE</div>
        <div className="ticker-text" key={tickerIdx}>{TICKER[tickerIdx]}</div>
      </div>

      {/* Body */}
      <div className="body">

        {/* LEFT — metrics */}
        <div className="left">
          <div className="panel-hdr">// LIVE READOUT</div>
          <div className="mcard">
            <div className="mcard-lbl">S&amp;P 500</div>
            <div className="mcard-row">
              <span className="mcard-val">4498</span>
              <span className="mcard-d" style={{color:"#68d391"}}>▲ +0.8%</span>
            </div>
            <Sparkline data={SP_DATA} color="#68d391"/>
          </div>
          <div className="mcard">
            <div className="mcard-lbl">US CPI</div>
            <div className="mcard-row">
              <span className="mcard-val">2.87%</span>
              <span className="mcard-d" style={{color:"#63b3ed"}}>▼ -0.02</span>
            </div>
            <Sparkline data={CPI_DATA} color="#63b3ed"/>
          </div>
          <div className="mcard">
            <div className="mcard-lbl">BTC/USD</div>
            <div className="mcard-row">
              <span className="mcard-val" style={{fontSize:16}}>$106.5K</span>
              <span className="mcard-d" style={{color:"#f6ad55"}}>▲ +2.1%</span>
            </div>
            <Sparkline data={BTC_DATA} color="#f6ad55"/>
          </div>

          <div className="panel-hdr">// KEY SIGNALS</div>
          {SIGNALS.map((s,i) => (
            <div className="sig" key={i}>
              <div className="sig-dot" style={{background:s.dot,boxShadow:`0 0 8px ${s.dot}`}}/>
              {s.text}
            </div>
          ))}

          {chat.length > 0 && <>
            <div className="panel-hdr" style={{marginTop:10}}>// SESSION HISTORY</div>
            <div className="hist">
              {chat.map((m,i) => (
                <div key={i} className="hist-row">
                  <span className={m.role==="user"?"hist-lbl-you":"hist-lbl-eco"}>
                    {m.role==="user"?"YOU":"ECO"}
                  </span>
                  <span className="hist-txt">{m.text}</span>
                  <span className="hist-t">{m.time}</span>
                </div>
              ))}
            </div>
          </>}

          <div className="sess-info">SESSION {fmt(sessionSecs)}</div>
        </div>

        {/* CENTER — Globe + news */}
        <div className="center">
          <div className="globe-area">
            <div className="scanline"/>
            <WireframeGlobe activeCountries={activeCountries}/>
          </div>

          {/* News strip */}
          <div className="news-strip">
            <div className="panel-hdr" style={{padding:"7px 14px 4px"}}>// INTEL FEED</div>
            <div className="news-row">
              {loading && (
                <div style={{display:"flex",alignItems:"center",gap:8,padding:"0 8px",fontFamily:"'Share Tech Mono',monospace",fontSize:11,color:"rgba(0,200,255,0.45)"}}>
                  <div className="ldots"><span/><span/><span/></div>
                  Fetching intelligence...
                </div>
              )}
              {response?.newsCards?.map((n,i) => (
                <a key={i} className="ncard" href={n.url} target="_blank" rel="noopener noreferrer">
                  <div className="ncard-src">{n.source?.toUpperCase()}</div>
                  <div className="ncard-hl">{n.headline}</div>
                </a>
              ))}
              {!loading && !response && (
                <div style={{display:"flex",alignItems:"center",padding:"0 8px",fontFamily:"'Share Tech Mono',monospace",fontSize:11,color:"rgba(0,200,255,0.2)",letterSpacing:".12em"}}>
                  SAY &quot;HEY ECO&quot; OR TYPE A QUERY TO LOAD LIVE INTEL
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT — Intelligence brief */}
        <div className="right">
          <div className="panel-hdr">// INTELLIGENCE BRIEF</div>
          <div className="intel-scroll">
            {chat.length === 0 && !loading && (
              <div className="awaiting">
                <div style={{fontSize:24,opacity:.4}}>◈</div>
                <div>AWAITING QUERY</div>
                <div style={{fontSize:10,opacity:.5,lineHeight:1.6}}>
                  Say &quot;Hey Eco&quot;<br/>or type below
                </div>
              </div>
            )}

            {chat.filter(m=>m.role==="user").slice(-1).map((m,i) => (
              <div key={i}>
                <div className="you-lbl">YOU ASKED</div>
                <div className="you-box">{m.text}</div>
              </div>
            ))}

            {loading && (
              <div style={{display:"flex",gap:8,alignItems:"center",fontFamily:"'Share Tech Mono',monospace",fontSize:11,color:"rgba(0,200,255,0.45)"}}>
                <div className="ldots"><span/><span/><span/></div>
                Processing briefing...
              </div>
            )}

            {response && !loading && (
              <div style={{animation:"fadeIn .4s ease"}}>
                <div className="eco-lbl">ECONAGENT</div>
                <div className="eco-resp">{response.speech}</div>
                {response.prediction && (
                  <div className="eco-pred">⟶ {response.prediction}</div>
                )}
                {response.sources && response.sources.length > 0 && (
                  <div className="eco-srcs">
                    {response.sources.map((s,i) => (
                      <span key={i} className="src-badge">{s}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div ref={chatEndRef}/>
          </div>
        </div>

      </div>

      {/* Input bar */}
      <div className="input-bar">
        <button
          className={`mic-btn ${listening?"mic-on":"mic-idle"}`}
          onClick={toggleMic}
          title={listening?"Stop":"Voice input"}
        >🎙</button>
        <input
          className="qinp"
          placeholder="Ask EcoAgent anything about global economics..."
          value={query}
          onChange={e=>setQuery(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&!loading&&askEco(query)}
          disabled={loading}
        />
        <button
          className="brief-btn"
          onClick={()=>askEco(query)}
          disabled={loading||!query.trim()}
        >
          {loading
            ? <span className="ldots"><span/><span/><span/></span>
            : "BRIEF ME"
          }
        </button>
      </div>
    </div>
  );
}
