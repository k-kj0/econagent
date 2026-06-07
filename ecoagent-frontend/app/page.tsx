"use client";
import { useState, useEffect, useRef, useCallback } from "react";

interface NewsCard { headline: string; source: string; url: string; }
interface EcoResponse { speech: string; countries: string[]; prediction: string; sources: string[]; newsCards: NewsCard[]; }
interface Msg { role: "user" | "eco"; text: string; time: string; }

/* ── Sparkline ── */
function Spark({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data), min = Math.min(...data);
  const W = 200, H = 44;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * W},${H - ((v - min) / (max - min || 1)) * (H - 6) - 3}`);
  const last = pts[pts.length - 1].split(",");
  const id = `g${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 44 }} preserveAspectRatio="none">
      <defs><linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity="0.4" />
        <stop offset="100%" stopColor={color} stopOpacity="0" />
      </linearGradient></defs>
      <path d={`M ${pts.join(" L ")} L ${W},${H} L 0,${H} Z`} fill={`url(#${id})`} />
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="1.5"
        style={{ filter: `drop-shadow(0 0 3px ${color})` }} />
      <circle cx={last[0]} cy={last[1]} r="3" fill={color} style={{ filter: `drop-shadow(0 0 8px ${color})` }}>
        <animate attributeName="r" values="2.5;4;2.5" dur="1.5s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

/* ── Static data ── */
const SP  = [4200,4350,4280,4420,4380,4500,4450,4498];
const CPI = [3.1,3.0,2.98,2.95,2.92,2.90,2.88,2.87];
const BTC = [85000,90000,88000,100000,102000,104000,106200,106500];
const SIGS = [
  { dot:"#fc8181", txt:"Fed meeting: Jul 30" },
  { dot:"#63b3ed", txt:"ECB: Sep 2026" },
  { dot:"#68d391", txt:"NFP: +142K last" },
  { dot:"#f6ad55", txt:"Oil: $72.3 WTI" },
];
const TICKER = [
  "US CPI falls to 2.88% as energy prices stabilise · Reuters",
  "Fed signals potential rate cuts in Q3 2026 · Bloomberg",
  "S&P 500 edges higher as tech leads rally · CNBC",
  "Bitcoin surpasses $106K amid institutional demand · CoinDesk",
  "ECB holds rates, signals September review · FT",
  "Gold steady at $2,340/oz ahead of Fed minutes · Reuters",
  "China exports rise 8.2% in May despite tariff headwinds · Bloomberg",
  "IMF upgrades India growth forecast to 6.8% for 2026 · IMF",
];

/* ── ElevenLabs + browser TTS fallback ── */
async function speakText(text: string, elKey: string) {
  // Try ElevenLabs first
  if (elKey) {
    try {
      const res = await fetch(
        "https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM/stream",
        {
          method: "POST",
          headers: { "xi-api-key": elKey, "Content-Type": "application/json", Accept: "audio/mpeg" },
          body: JSON.stringify({
            text,
            model_id: "eleven_turbo_v2",
            voice_settings: { stability: 0.45, similarity_boost: 0.85, style: 0.2, use_speaker_boost: true },
          }),
        }
      );
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        await audio.play();
        audio.onended = () => URL.revokeObjectURL(url);
        return;
      }
    } catch (e) {
      console.warn("ElevenLabs error:", e);
    }
  }
  // Browser TTS fallback
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.9; u.pitch = 0.85;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v =>
      v.name.includes("Daniel") || v.name.includes("Google UK") || v.name.includes("Male")
    );
    if (preferred) u.voice = preferred;
    window.speechSynthesis.speak(u);
  }
}

/* ════════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════════ */
export default function Page() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<EcoResponse | null>(null);
  const [chat, setChat] = useState<Msg[]>([]);
  const [listening, setListening] = useState(false);
  const [secs, setSecs] = useState(0);
  const [wakeOn, setWakeOn] = useState(false);
  const chatEnd = useRef<HTMLDivElement>(null);
  const recRef = useRef<any>(null);
  const wakeRef = useRef<any>(null);
  const wakeLoop = useRef(true);

  const BACKEND = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "").replace(/\/$/, "");
  const EL_KEY  = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY ?? "";

  const ts  = () => new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const fmt = (s: number) =>
    [Math.floor(s/3600), Math.floor((s%3600)/60), s%60].map(n => String(n).padStart(2,"0")).join(":");

  useEffect(() => { const t = setInterval(() => setSecs(s => s+1), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [chat]);

  /* ── Greet ── */
  const greet = useCallback(async () => {
    const msg = "Hey Boss, EcoAgent online. What would you like to know today?";
    setChat(p => [...p, { role: "eco", text: msg, time: ts() }]);
    await speakText(msg, EL_KEY);
  }, [EL_KEY]);

  /* ── Ask backend ── */
  const askEco = useCallback(async (text: string) => {
    if (!text.trim()) return;
    setLoading(true);
    setQuery("");
    setChat(p => [...p, { role: "user", text, time: ts() }]);

    if (!BACKEND) {
      const err = "Boss, NEXT_PUBLIC_BACKEND_URL is not set in Vercel environment variables. Add it and redeploy.";
      setChat(p => [...p, { role: "eco", text: err, time: ts() }]);
      await speakText(err, EL_KEY);
      setLoading(false);
      return;
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 25000);
      const res = await fetch(`${BACKEND}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`);
      }
      const data: EcoResponse = await res.json();
      setResponse(data);
      setChat(p => [...p, { role: "eco", text: data.speech, time: ts() }]);
      if (data.speech) await speakText(data.speech, EL_KEY);
    } catch (err: any) {
      const msg = err?.name === "AbortError"
        ? "Boss, the backend timed out. Check Railway deployment is running."
        : `Boss, error: ${String(err).slice(0, 180)}`;
      setChat(p => [...p, { role: "eco", text: msg, time: ts() }]);
      await speakText(msg, EL_KEY);
    } finally {
      setLoading(false);
    }
  }, [BACKEND, EL_KEY]);

  /* ── Wake word listener ── */
  useEffect(() => {
    const SR = typeof window !== "undefined"
      ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
      : null;
    if (!SR) return;
    let alive = true;
    wakeLoop.current = true;

    function startWake() {
      if (!alive) return;
      const rec: any = new SR();
      rec.continuous = false; rec.interimResults = false; rec.lang = "en-US";
      rec.onresult = async (e: any) => {
        const said = e.results[0][0].transcript.toLowerCase();
        if (said.includes("hey eco") || said.includes("eco")) {
          setWakeOn(true);
          await greet();
          setTimeout(() => setWakeOn(false), 3000);
          setTimeout(() => startCmd(), 3500);
        }
      };
      rec.onend  = () => { if (alive && wakeLoop.current) setTimeout(startWake, 400); };
      rec.onerror = () => { if (alive && wakeLoop.current) setTimeout(startWake, 1200); };
      wakeRef.current = rec;
      try { rec.start(); } catch { }
    }

    function startCmd() {
      if (!alive) return;
      const rec: any = new SR();
      rec.continuous = false; rec.interimResults = false; rec.lang = "en-US";
      rec.onresult = (e: any) => askEco(e.results[0][0].transcript);
      rec.onend   = () => { if (alive) setTimeout(startWake, 500); };
      rec.onerror = () => { if (alive) setTimeout(startWake, 1200); };
      try { rec.start(); } catch { }
    }

    const t = setTimeout(startWake, 1500);
    return () => {
      alive = false; wakeLoop.current = false;
      clearTimeout(t);
      try { wakeRef.current?.stop(); } catch { }
    };
  }, [greet, askEco]);

  /* ── Manual mic ── */
  const toggleMic = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Use Chrome for voice input."); return; }
    if (listening) { recRef.current?.stop(); setListening(false); return; }
    const rec: any = new SR();
    rec.continuous = false; rec.interimResults = false; rec.lang = "en-US";
    rec.onresult = (e: any) => askEco(e.results[0][0].transcript);
    rec.onend  = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec; rec.start(); setListening(true);
  }, [listening, askEco]);

  /* ── Ticker marquee text ── */
  const tickerText = TICKER.join("   ·   ");

  return (
    <div className="root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Rajdhani:wght@400;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        html,body{height:100%;background:#020a14;color:#c8e8f0;overflow:hidden;}
        ::-webkit-scrollbar{width:3px;height:3px;}
        ::-webkit-scrollbar-thumb{background:rgba(0,200,255,0.2);border-radius:2px;}

        @keyframes blink{0%,100%{opacity:1}50%{opacity:.2}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes slideIn{from{opacity:0;transform:translateX(6px)}to{opacity:1;transform:translateX(0)}}
        @keyframes pulseGlow{0%,100%{box-shadow:0 0 10px rgba(0,255,100,.3)}50%{box-shadow:0 0 26px rgba(0,255,100,.8)}}
        @keyframes wakeFlash{0%{opacity:0}15%{opacity:1}85%{opacity:1}100%{opacity:0}}
        @keyframes scanPulse{0%{opacity:.3}50%{opacity:.7}100%{opacity:.3}}
        @keyframes marquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        @keyframes dotsPulse{0%,100%{opacity:.4}50%{opacity:1}}

        .root{display:flex;flex-direction:column;height:100vh;width:100vw;overflow:hidden;font-family:'Rajdhani',system-ui,sans-serif;background:#020a14;}

        /* ── Header ── */
        .hdr{display:flex;align-items:center;justify-content:space-between;padding:0 20px;height:46px;border-bottom:1px solid rgba(0,200,255,.15);background:rgba(1,5,12,.98);flex-shrink:0;z-index:20;}
        .hdr-l{display:flex;align-items:center;gap:10px;}
        .diamond{width:18px;height:18px;background:linear-gradient(135deg,#00cfff,#0060ff);transform:rotate(45deg);box-shadow:0 0 14px rgba(0,200,255,.9);flex-shrink:0;}
        .brand{font-family:'Share Tech Mono',monospace;font-size:17px;letter-spacing:.4em;color:#00e5ff;text-shadow:0 0 18px rgba(0,229,255,.7);}
        .sep{color:rgba(0,200,255,.25);margin:0 4px;}
        .sub{font-family:'Share Tech Mono',monospace;font-size:10px;letter-spacing:.2em;color:rgba(0,200,255,.4);}
        .hdr-r{display:flex;align-items:center;gap:8px;font-family:'Share Tech Mono',monospace;font-size:11px;color:rgba(0,200,255,.55);}
        .odot{width:8px;height:8px;border-radius:50%;background:#00ff88;box-shadow:0 0 10px #00ff88;animation:blink 2s ease-in-out infinite;}

        /* ── Ticker marquee ── */
        .ticker-wrap{height:28px;overflow:hidden;border-bottom:1px solid rgba(0,200,255,.08);background:rgba(0,6,16,.8);flex-shrink:0;display:flex;align-items:center;gap:0;z-index:20;}
        .ticker-live{font-family:'Share Tech Mono',monospace;font-size:9px;background:rgba(0,255,100,.1);border:1px solid rgba(0,255,100,.35);color:#00ff88;padding:2px 8px;letter-spacing:.2em;border-radius:2px;flex-shrink:0;margin:0 12px;}
        .ticker-track{display:flex;animation:marquee 40s linear infinite;white-space:nowrap;}
        .ticker-item{font-family:'Share Tech Mono',monospace;font-size:11px;color:rgba(0,200,255,.75);padding-right:80px;}

        /* ── Wake banner ── */
        .wake{position:fixed;top:80px;left:50%;transform:translateX(-50%);z-index:99;background:rgba(0,255,150,.1);border:1px solid rgba(0,255,150,.4);border-radius:5px;padding:5px 18px;font-family:'Share Tech Mono',monospace;font-size:12px;color:#00ff96;letter-spacing:.15em;animation:wakeFlash 3s ease forwards;pointer-events:none;}

        /* ── Body ── */
        .body{display:flex;flex:1;overflow:hidden;min-height:0;}

        /* ── Left ── */
        .left{width:228px;flex-shrink:0;border-right:1px solid rgba(0,200,255,.1);display:flex;flex-direction:column;overflow-y:auto;background:rgba(1,5,14,.88);z-index:5;}
        .ph{font-family:'Share Tech Mono',monospace;font-size:10px;letter-spacing:.25em;color:rgba(0,200,255,.42);padding:10px 14px 5px;}
        .mc{margin:0 10px 8px;background:rgba(0,22,44,.55);border:1px solid rgba(0,200,255,.1);border-radius:5px;padding:9px 11px;}
        .mc-lbl{font-family:'Share Tech Mono',monospace;font-size:9px;letter-spacing:.18em;color:rgba(0,200,255,.42);}
        .mc-row{display:flex;justify-content:space-between;align-items:baseline;margin:3px 0 1px;}
        .mc-val{font-family:'Share Tech Mono',monospace;font-size:20px;color:#e2f4ff;}
        .mc-d{font-family:'Share Tech Mono',monospace;font-size:11px;}
        .sig{display:flex;align-items:center;gap:8px;padding:4px 14px;font-family:'Share Tech Mono',monospace;font-size:11px;color:rgba(0,200,255,.62);}
        .sdot{width:6px;height:6px;border-radius:50%;flex-shrink:0;}
        .hist{padding:0 12px 8px;overflow-y:auto;max-height:150px;}
        .hrow{display:flex;gap:6px;font-family:'Share Tech Mono',monospace;font-size:10px;margin-bottom:2px;animation:slideIn .2s ease;}
        .hy{color:rgba(0,200,255,.5);flex-shrink:0;}
        .he{color:rgba(0,255,140,.5);flex-shrink:0;}
        .htxt{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:rgba(180,222,240,.6);}
        .ht{color:rgba(0,200,255,.2);flex-shrink:0;}
        .sess{margin:8px 14px 10px;font-family:'Share Tech Mono',monospace;font-size:10px;color:rgba(0,200,255,.28);}

        /* ── Center: Earth map ── */
        .center{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0;position:relative;}
        .earth-wrap{flex:1;position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center;background:#020c1a;}

        /* The earth image — Mollweide glowing map */
        .earth-img{
          width:90%;max-width:820px;
          filter:drop-shadow(0 0 30px rgba(0,180,255,0.5)) drop-shadow(0 0 60px rgba(0,100,255,0.25));
          position:relative;z-index:2;
          animation:scanPulse 4s ease-in-out infinite;
        }

        /* Scanline overlay */
        .scanlines{position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.04) 2px,rgba(0,0,0,0.04) 4px);pointer-events:none;z-index:3;}

        /* Corner decorations */
        .corner{position:absolute;width:24px;height:24px;border-color:rgba(0,200,255,.3);border-style:solid;z-index:4;}
        .c-tl{top:10px;left:10px;border-width:1px 0 0 1px;}
        .c-tr{top:10px;right:10px;border-width:1px 1px 0 0;}
        .c-bl{bottom:10px;left:10px;border-width:0 0 1px 1px;}
        .c-br{bottom:10px;right:10px;border-width:0 1px 1px 0;}

        /* News strip */
        .news-strip{border-top:1px solid rgba(0,200,255,.08);height:150px;flex-shrink:0;display:flex;flex-direction:column;background:rgba(1,5,14,.75);z-index:5;}
        .nrow{display:flex;gap:10px;overflow-x:auto;padding:8px 12px;flex:1;}
        .nc{min-width:205px;max-width:205px;background:rgba(0,18,36,.85);border:1px solid rgba(0,200,255,.1);border-radius:5px;padding:9px 10px;cursor:pointer;transition:border-color .2s;text-decoration:none;display:block;flex-shrink:0;animation:slideIn .35s ease;}
        .nc:hover{border-color:rgba(0,200,255,.4);}
        .nc-src{font-family:'Share Tech Mono',monospace;font-size:9px;letter-spacing:.14em;color:rgba(0,200,255,.45);margin-bottom:5px;}
        .nc-hl{font-size:12px;line-height:1.4;color:rgba(200,232,245,.85);display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;}

        /* ── Right: Intelligence Brief ── */
        .right{width:280px;flex-shrink:0;border-left:1px solid rgba(0,200,255,.1);display:flex;flex-direction:column;background:rgba(1,5,14,.88);z-index:5;}
        .iscroll{flex:1;overflow-y:auto;padding:10px 13px;}
        .ylbl{font-family:'Share Tech Mono',monospace;font-size:9px;letter-spacing:.2em;color:rgba(0,200,255,.36);margin-bottom:3px;}
        .ybox{background:rgba(0,200,255,.04);border:1px solid rgba(0,200,255,.17);border-radius:4px;padding:7px 9px;font-family:'Share Tech Mono',monospace;font-size:12px;color:#c8e8f0;margin-bottom:10px;word-break:break-word;}
        .elbl{font-family:'Share Tech Mono',monospace;font-size:9px;letter-spacing:.2em;color:rgba(0,255,140,.42);margin-bottom:5px;margin-top:4px;}
        .eresp{font-size:13px;line-height:1.65;color:#c8e8f0;animation:fadeIn .4s ease;}
        .epred{margin-top:9px;padding-top:9px;border-top:1px solid rgba(0,200,255,.1);font-family:'Share Tech Mono',monospace;font-size:11px;color:#00e5ff;opacity:.72;}
        .esrcs{margin-top:7px;display:flex;flex-wrap:wrap;gap:4px;}
        .sbadge{font-family:'Share Tech Mono',monospace;font-size:9px;padding:2px 6px;border:1px solid rgba(0,200,255,.17);border-radius:2px;color:rgba(0,200,255,.52);}
        .await{display:flex;flex-direction:column;align-items:center;justify-content:center;height:130px;color:rgba(0,200,255,.18);font-family:'Share Tech Mono',monospace;font-size:11px;letter-spacing:.2em;gap:8px;text-align:center;}

        /* ── Input bar ── */
        .ibar{display:flex;align-items:center;gap:10px;padding:9px 16px;border-top:1px solid rgba(0,200,255,.12);background:rgba(1,4,11,.98);flex-shrink:0;z-index:20;}
        .mbutton{width:40px;height:40px;border-radius:50%;border:none;cursor:pointer;display:grid;place-items:center;font-size:17px;flex-shrink:0;transition:all .2s;}
        .midle{background:rgba(0,200,255,.08);box-shadow:0 0 10px rgba(0,200,255,.12);}
        .mon{background:rgba(0,255,100,.14);animation:pulseGlow 1s ease-in-out infinite;}
        .qinp{flex:1;background:rgba(0,200,255,.04);border:1px solid rgba(0,200,255,.17);border-radius:4px;padding:9px 13px;color:#c8e8f0;font-size:13px;font-family:'Rajdhani',system-ui,sans-serif;outline:none;}
        .qinp:focus{border-color:rgba(0,200,255,.44);}
        .qinp::placeholder{color:rgba(0,200,255,.22);}
        .brief{background:linear-gradient(135deg,rgba(0,200,255,.16),rgba(0,100,200,.26));border:1px solid rgba(0,200,255,.36);border-radius:4px;color:#00e5ff;font-family:'Share Tech Mono',monospace;font-size:11px;letter-spacing:.2em;padding:9px 16px;cursor:pointer;transition:all .2s;white-space:nowrap;flex-shrink:0;}
        .brief:hover{background:linear-gradient(135deg,rgba(0,200,255,.3),rgba(0,100,200,.4));box-shadow:0 0 14px rgba(0,200,255,.22);}
        .brief:disabled{opacity:.32;cursor:not-allowed;}
        .dots{display:inline-flex;gap:4px;align-items:center;}
        .dots span{width:5px;height:5px;border-radius:50%;background:#00e5ff;animation:dotsPulse 1s ease-in-out infinite;}
        .dots span:nth-child(2){animation-delay:.2s;}
        .dots span:nth-child(3){animation-delay:.4s;}

        @media(max-width:900px){.left{width:180px;}}
        @media(max-width:700px){.left{display:none;}.right{width:220px;}}
        @media(max-width:520px){.right{display:none;}}
      `}</style>

      {wakeOn && <div className="wake">◈ WAKE WORD DETECTED — ECONAGENT ACTIVE</div>}

      {/* ── Header ── */}
      <header className="hdr">
        <div className="hdr-l">
          <div className="diamond" />
          <span className="brand">ECONAGENT</span>
          <span className="sep">·</span>
          <span className="sub">MISSION CONTROL · ECONOMIC INTELLIGENCE</span>
        </div>
        <div className="hdr-r">
          <div className="odot" />
          <span>ONLINE</span>
          <span style={{ color:"rgba(0,200,255,.3)", marginLeft:12 }}>{fmt(secs)}</span>
        </div>
      </header>

      {/* ── Scrolling ticker ── */}
      <div className="ticker-wrap">
        <div className="ticker-live">LIVE</div>
        <div style={{ overflow:"hidden", flex:1 }}>
          <div className="ticker-track">
            {/* Duplicate for seamless loop */}
            {[0,1].map(k => (
              <span key={k} className="ticker-item">{tickerText}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="body">

        {/* LEFT */}
        <div className="left">
          <div className="ph">// LIVE READOUT</div>
          <div className="mc">
            <div className="mc-lbl">S&amp;P 500</div>
            <div className="mc-row"><span className="mc-val">4498</span><span className="mc-d" style={{color:"#68d391"}}>▲ +0.8%</span></div>
            <Spark data={SP} color="#68d391" />
          </div>
          <div className="mc">
            <div className="mc-lbl">US CPI</div>
            <div className="mc-row"><span className="mc-val">2.87%</span><span className="mc-d" style={{color:"#63b3ed"}}>▼ -0.02</span></div>
            <Spark data={CPI} color="#63b3ed" />
          </div>
          <div className="mc">
            <div className="mc-lbl">BTC/USD</div>
            <div className="mc-row"><span className="mc-val" style={{fontSize:16}}>$106.5K</span><span className="mc-d" style={{color:"#f6ad55"}}>▲ +2.1%</span></div>
            <Spark data={BTC} color="#f6ad55" />
          </div>
          <div className="ph">// KEY SIGNALS</div>
          {SIGS.map((s,i) => (
            <div key={i} className="sig">
              <div className="sdot" style={{background:s.dot, boxShadow:`0 0 8px ${s.dot}`}} />
              {s.txt}
            </div>
          ))}
          {chat.length > 0 && <>
            <div className="ph" style={{marginTop:10}}>// SESSION HISTORY</div>
            <div className="hist">
              {chat.map((m,i) => (
                <div key={i} className="hrow">
                  <span className={m.role==="user"?"hy":"he"}>{m.role==="user"?"YOU":"ECO"}</span>
                  <span className="htxt">{m.text}</span>
                  <span className="ht">{m.time}</span>
                </div>
              ))}
            </div>
          </>}
          <div className="sess">SESSION {fmt(secs)}</div>
        </div>

        {/* CENTER */}
        <div className="center">
          <div className="earth-wrap">
            {/* Scanlines */}
            <div className="scanlines" />
            {/* Corner decorations */}
            <div className="corner c-tl" /><div className="corner c-tr" />
            <div className="corner c-bl" /><div className="corner c-br" />
            {/* 
              Earth map — using a free SVG world map rendered as glowing wireframe
              This is the Mollweide-projection neon earth look from image 2
            */}
            <img
              className="earth-img"
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/World_map_-_low_resolution.svg/2560px-World_map_-_low_resolution.svg.png"
              alt="Earth Intelligence Map"
              style={{
                width:"88%", maxWidth:820,
                filter:"invert(1) sepia(1) saturate(3) hue-rotate(170deg) brightness(0.85) drop-shadow(0 0 20px rgba(0,200,255,0.7)) drop-shadow(0 0 60px rgba(0,100,255,0.4))",
                mixBlendMode:"screen",
                position:"relative", zIndex:2,
              }}
              onError={(e) => {
                // Fallback: draw SVG globe inline if image fails
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>

          {/* News strip */}
          <div className="news-strip">
            <div className="ph" style={{padding:"7px 14px 4px"}}>// INTEL FEED</div>
            <div className="nrow">
              {loading && (
                <div style={{display:"flex",alignItems:"center",gap:8,padding:"0 8px",fontFamily:"'Share Tech Mono',monospace",fontSize:11,color:"rgba(0,200,255,.42)"}}>
                  <div className="dots"><span/><span/><span/></div>Fetching intelligence...
                </div>
              )}
              {response?.newsCards?.map((n,i) => (
                <a key={i} className="nc" href={n.url} target="_blank" rel="noopener noreferrer">
                  <div className="nc-src">{n.source?.toUpperCase()}</div>
                  <div className="nc-hl">{n.headline}</div>
                </a>
              ))}
              {!loading && !response && (
                <div style={{display:"flex",alignItems:"center",padding:"0 8px",fontFamily:"'Share Tech Mono',monospace",fontSize:11,color:"rgba(0,200,255,.18)",letterSpacing:".12em"}}>
                  SAY &quot;HEY ECO&quot; OR TYPE A QUERY TO LOAD LIVE INTEL
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="right">
          <div className="ph">// INTELLIGENCE BRIEF</div>
          <div className="iscroll">
            {chat.length===0 && !loading && (
              <div className="await">
                <div style={{fontSize:26,opacity:.35}}>◈</div>
                <div>AWAITING QUERY</div>
                <div style={{fontSize:10,opacity:.45,lineHeight:1.7}}>Say &quot;Hey Eco&quot;<br/>or type below</div>
              </div>
            )}
            {chat.filter(m=>m.role==="user").slice(-1).map((m,i)=>(
              <div key={i}><div className="ylbl">YOU ASKED</div><div className="ybox">{m.text}</div></div>
            ))}
            {loading && (
              <div style={{display:"flex",gap:8,alignItems:"center",fontFamily:"'Share Tech Mono',monospace",fontSize:11,color:"rgba(0,200,255,.42)"}}>
                <div className="dots"><span/><span/><span/></div>Processing briefing...
              </div>
            )}
            {response && !loading && (
              <div style={{animation:"fadeIn .4s ease"}}>
                <div className="elbl">ECONAGENT</div>
                <div className="eresp">{response.speech}</div>
                {response.prediction && <div className="epred">⟶ {response.prediction}</div>}
                {response.sources?.length>0 && (
                  <div className="esrcs">
                    {response.sources.map((s,i)=><span key={i} className="sbadge">{s}</span>)}
                  </div>
                )}
              </div>
            )}
            <div ref={chatEnd}/>
          </div>
        </div>

      </div>

      {/* ── Input ── */}
      <div className="ibar">
        <button className={`mbutton ${listening?"mon":"midle"}`} onClick={toggleMic} title="Voice input">🎙</button>
        <input className="qinp"
          placeholder="Ask EcoAgent anything about global economics..."
          value={query}
          onChange={e=>setQuery(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&!loading&&askEco(query)}
          disabled={loading}
        />
        <button className="brief" onClick={()=>askEco(query)} disabled={loading||!query.trim()}>
          {loading ? <span className="dots"><span/><span/><span/></span> : "BRIEF ME"}
        </button>
      </div>
    </div>
  );
}
