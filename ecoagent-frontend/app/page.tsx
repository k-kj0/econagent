"use client";
import { useState, useEffect, useRef, useCallback } from "react";

interface NewsCard { headline: string; source: string; url: string; }
interface EcoResponse { speech: string; countries: string[]; prediction: string; sources: string[]; newsCards: NewsCard[]; }
interface Msg { role: "user"|"eco"; text: string; time: string; }

/* ══════════════════════════════════════════════
   THREE.JS GLOBE — loaded from CDN at runtime
   Real continent outlines via canvas texture
══════════════════════════════════════════════ */
function ThreeGlobe({ active }: { active: string[] }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Load Three.js from CDN
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
    script.async = true;
    script.onload = () => initGlobe(mount);
    document.head.appendChild(script);

    let cleanup: (() => void) | null = null;

    function initGlobe(container: HTMLDivElement) {
      const THREE = (window as any).THREE;
      if (!THREE) return;

      const W = container.clientWidth || 600;
      const H = container.clientHeight || 500;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 1000);
      camera.position.z = 2.8;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(W, H);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      container.appendChild(renderer.domElement);

      // ── Build globe texture on canvas ──
      const TEX_W = 2048, TEX_H = 1024;
      const canvas = document.createElement("canvas");
      canvas.width = TEX_W; canvas.height = TEX_H;
      const ctx = canvas.getContext("2d")!;

      // Ocean background
      ctx.fillStyle = "#010a18";
      ctx.fillRect(0, 0, TEX_W, TEX_H);

      // Grid lines
      ctx.strokeStyle = "rgba(0,180,255,0.12)";
      ctx.lineWidth = 0.8;
      for (let lat = -80; lat <= 80; lat += 20) {
        const y = TEX_H * (0.5 - lat / 180);
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(TEX_W, y); ctx.stroke();
      }
      for (let lon = -180; lon <= 180; lon += 20) {
        const x = TEX_W * (lon + 180) / 360;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, TEX_H); ctx.stroke();
      }

      // Equator
      ctx.strokeStyle = "rgba(0,255,180,0.35)";
      ctx.lineWidth = 1.5;
      ctx.shadowColor = "rgba(0,255,180,0.6)"; ctx.shadowBlur = 6;
      const eqY = TEX_H * 0.5;
      ctx.beginPath(); ctx.moveTo(0, eqY); ctx.lineTo(TEX_W, eqY); ctx.stroke();
      ctx.shadowBlur = 0;

      // Helper: lon/lat → texture pixel
      function px(lon: number, lat: number): [number, number] {
        return [TEX_W * (lon + 180) / 360, TEX_H * (90 - lat) / 180];
      }

      // Draw continent outlines
      function drawContinent(pts: [number, number][], color = "rgba(0,220,255,0.9)", lw = 1.8, glow = 8) {
        if (pts.length < 2) return;
        ctx.strokeStyle = color;
        ctx.lineWidth = lw;
        ctx.shadowColor = color; ctx.shadowBlur = glow;
        ctx.lineJoin = "round"; ctx.lineCap = "round";
        ctx.beginPath();
        const [x0, y0] = px(...pts[0]);
        ctx.moveTo(x0, y0);
        for (let i = 1; i < pts.length; i++) {
          const [x, y] = px(...pts[i]);
          // Avoid wrap-around lines
          const [px1] = px(...pts[i - 1]);
          if (Math.abs(x - px1) < TEX_W * 0.4) ctx.lineTo(x, y);
          else { ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, y); }
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // ── CONTINENT COORDINATES [lon, lat] ──
      // North America
      drawContinent([[-168,72],[-140,70],[-125,49],[-124,37],[-117,32],[-97,26],[-87,16],[-83,10],[-77,8],[-75,11],[-66,18],[-61,15],[-64,44],[-70,47],[-80,43],[-83,42],[-88,42],[-95,49],[-110,49],[-123,49],[-130,55],[-140,60],[-153,58],[-163,60],[-166,64],[-168,72]]);
      // Greenland
      drawContinent([[-45,83],[-20,83],[-18,70],[-24,65],[-45,60],[-52,66],[-56,76],[-45,83]]);
      // South America
      drawContinent([[-80,11],[-75,12],[-62,12],[-50,5],[-35,-5],[-35,-10],[-38,-15],[-40,-22],[-44,-23],[-48,-28],[-52,-33],[-58,-38],[-65,-42],[-66,-55],[-68,-54],[-72,-50],[-75,-45],[-72,-38],[-70,-18],[-75,-10],[-78,2],[-80,11]]);
      // Europe west coast
      drawContinent([[-10,36],[-9,39],[-9,44],[-2,44],[3,44],[5,43],[8,44],[10,44],[14,45],[14,41],[16,38],[18,40],[20,39],[22,38],[26,37],[28,36],[28,38],[27,40],[29,41],[32,42],[36,42],[40,42],[36,37],[36,36],[28,36],[18,40],[15,38],[10,38],[8,38],[3,43],[0,43],[-2,44],[-9,44],[-8,43],[-9,39],[-8,37],[-10,36]]);
      // Scandinavia
      drawContinent([[5,58],[8,57],[10,55],[12,56],[14,57],[18,59],[20,60],[24,60],[26,61],[28,65],[28,68],[26,71],[24,70],[22,68],[18,68],[16,69],[14,68],[8,63],[5,62],[5,58]]);
      // UK
      drawContinent([[-5,50],[-3,51],[0,51],[2,52],[0,53],[-2,54],[-3,58],[-6,58],[-6,56],[-4,53],[-3,52],[-5,50]]);
      // Africa
      drawContinent([[-6,35],[0,34],[10,37],[12,33],[15,30],[25,31],[32,30],[38,22],[42,12],[44,10],[42,2],[40,-2],[38,-10],[36,-18],[34,-22],[32,-28],[28,-34],[18,-34],[16,-29],[14,-22],[12,-16],[8,-5],[2,4],[0,5],[-2,5],[-6,5],[-10,6],[-14,10],[-15,12],[-17,14],[-16,20],[-12,24],[-8,28],[-6,35]]);
      // Madagascar
      drawContinent([[44,-12],[48,-14],[50,-18],[48,-24],[44,-24],[44,-20],[44,-12]]);
      // Asia (main body)
      drawContinent([[26,42],[36,42],[40,42],[50,42],[56,42],[62,44],[68,45],[72,43],[76,38],[78,30],[80,28],[86,26],[90,22],[100,18],[104,10],[104,2],[108,-2],[110,2],[110,10],[108,16],[110,20],[114,22],[120,24],[122,26],[124,30],[128,36],[130,40],[132,44],[134,48],[136,46],[138,42],[136,40],[138,38],[140,38],[142,46],[140,50],[136,54],[136,56],[136,62],[130,68],[124,72],[100,72],[80,72],[70,68],[60,70],[55,68],[50,65],[42,68],[36,66],[28,70],[26,68],[26,42]]);
      // Indian peninsula
      drawContinent([[66,24],[70,22],[72,20],[76,8],[78,8],[80,10],[82,14],[84,18],[86,20],[80,28],[76,28],[72,28],[68,24],[66,24]]);
      // Japan
      drawContinent([[130,31],[132,34],[134,36],[136,36],[138,38],[140,40],[142,44],[144,44],[142,42],[140,38],[136,34],[130,31]]);
      // SE Asia peninsula
      drawContinent([[98,18],[100,14],[100,6],[103,2],[104,2],[102,6],[100,10],[100,14],[98,18]]);
      // Australia
      drawContinent([[114,-22],[114,-28],[116,-34],[120,-34],[126,-34],[130,-32],[132,-12],[136,-12],[136,-16],[140,-18],[142,-20],[148,-18],[152,-24],[154,-28],[150,-38],[146,-38],[144,-38],[140,-36],[136,-36],[130,-32],[126,-34],[120,-22],[114,-22]]);
      // New Zealand
      drawContinent([[172,-34],[174,-36],[176,-38],[178,-40],[176,-42],[174,-42],[172,-40],[170,-38],[172,-34]]);

      // Create texture from canvas
      const texture = new THREE.CanvasTexture(canvas);

      // Globe sphere
      const geo = new THREE.SphereGeometry(1, 64, 64);
      const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0.95 });
      const globe = new THREE.Mesh(geo, mat);
      scene.add(globe);

      // Atmosphere glow — outer sphere
      const atmoGeo = new THREE.SphereGeometry(1.04, 32, 32);
      const atmoMat = new THREE.MeshBasicMaterial({
        color: 0x0044ff, transparent: true, opacity: 0.06, side: 1
      });
      scene.add(new THREE.Mesh(atmoGeo, atmoMat));

      // Wireframe overlay (subtle)
      const wireMat = new THREE.MeshBasicMaterial({ color: 0x003366, wireframe: true, transparent: true, opacity: 0.04 });
      scene.add(new THREE.Mesh(new THREE.SphereGeometry(1.001, 36, 18), wireMat));

      // Ring glow around equator
      const ringGeo = new THREE.TorusGeometry(1.02, 0.003, 2, 120);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x00ffaa, transparent: true, opacity: 0.4 });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      scene.add(ring);

      // Country hotspot dots
      const HOTSPOTS: Record<string, [number, number]> = {
        US: [-97, 38], UK: [-1, 52], CN: [105, 35], IN: [79, 22],
        EU: [10, 50], JP: [138, 37], RU: [100, 62], BR: [-47, -15],
        AU: [133, -25], DE: [10, 51], FR: [2, 47], CA: [-96, 56],
      };

      const dots: any[] = [];
      function updateDots() {
        dots.forEach(d => scene.remove(d));
        dots.length = 0;
        for (const cc of activeRef.current) {
          const coords = HOTSPOTS[cc.toUpperCase()];
          if (!coords) continue;
          const [lon, lat] = coords;
          const phi = (90 - lat) * Math.PI / 180;
          const theta = (lon + 180) * Math.PI / 180;
          const r = 1.02;
          const x = -r * Math.sin(phi) * Math.cos(theta);
          const y = r * Math.cos(phi);
          const z = r * Math.sin(phi) * Math.sin(theta);
          const dotGeo = new THREE.SphereGeometry(0.018, 8, 8);
          const dotMat = new THREE.MeshBasicMaterial({ color: 0x00ff96 });
          const dot = new THREE.Mesh(dotGeo, dotMat);
          dot.position.set(x, y, z);
          scene.add(dot);
          dots.push(dot);
        }
      }
      updateDots();

      // Animation loop
      let rafId: number;
      let dotTimer = 0;
      function animate() {
        rafId = requestAnimationFrame(animate);
        globe.rotation.y += 0.002;
        ring.rotation.y += 0.002;
        dots.forEach(d => { d.rotation.y += 0.002; });
        dotTimer++;
        if (dotTimer % 30 === 0) updateDots();
        renderer.render(scene, camera);
      }
      animate();

      // Resize
      function onResize() {
        const w = container.clientWidth, h = container.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
      window.addEventListener("resize", onResize);

      // Mouse drag to rotate
      let drag = false, lastX = 0;
      renderer.domElement.addEventListener("mousedown", (e: MouseEvent) => { drag = true; lastX = e.clientX; });
      window.addEventListener("mouseup", () => { drag = false; });
      window.addEventListener("mousemove", (e: MouseEvent) => {
        if (!drag) return;
        globe.rotation.y += (e.clientX - lastX) * 0.005;
        lastX = e.clientX;
      });

      cleanup = () => {
        cancelAnimationFrame(rafId);
        window.removeEventListener("resize", onResize);
        renderer.dispose();
        if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
      };

      document.getElementById("eco-globe-loading")?.remove();
    }

    return () => {
      cleanup?.();
      script.remove();
    };
  }, []);

  return (
    <div ref={mountRef} style={{ width: "100%", height: "100%", position: "relative" }}>
      <div id="eco-globe-loading" style={{
        position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Share Tech Mono',monospace", fontSize: 11, letterSpacing: "0.2em",
        color: "rgba(0,200,255,0.4)"
      }}>INITIALIZING GLOBE...</div>
    </div>
  );
}

/* ══ Sparkline ══ */
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
      <circle cx={last[0]} cy={last[1]} r="3" fill={color}
        style={{ filter: `drop-shadow(0 0 8px ${color})` }}>
        <animate attributeName="r" values="2.5;4;2.5" dur="1.5s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

const SP = [4200, 4350, 4280, 4420, 4380, 4500, 4450, 4498];
const CPI = [3.1, 3.0, 2.98, 2.95, 2.92, 2.90, 2.88, 2.87];
const BTC = [85000, 90000, 88000, 100000, 102000, 104000, 106200, 106500];
const SIGS = [
  { dot: "#fc8181", txt: "Fed meeting: Jul 30" },
  { dot: "#63b3ed", txt: "ECB: Sep 2026" },
  { dot: "#68d391", txt: "NFP: +142K last" },
  { dot: "#f6ad55", txt: "Oil: $72.3 WTI" },
];
const TICKER = [
  "US CPI falls to 2.88% as energy prices stabilise · Reuters",
  "Fed signals potential rate cuts in Q3 2026 · Bloomberg",
  "S&P 500 edges higher as tech leads rally · CNBC",
  "Bitcoin surpasses $106K amid institutional demand · CoinDesk",
  "ECB holds rates, signals September review · FT",
];

async function speak(text: string, key: string) {
  if (!key) {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.92; u.pitch = 0.85;
      window.speechSynthesis.speak(u);
    }
    return;
  }
  try {
    const res = await fetch("https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM/stream", {
      method: "POST",
      headers: { "xi-api-key": key, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({ text, model_id: "eleven_turbo_v2", voice_settings: { stability: 0.45, similarity_boost: 0.85 } })
    });
    if (!res.ok) throw new Error(`EL ${res.status}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.play();
    audio.onended = () => URL.revokeObjectURL(url);
  } catch (e) {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.92; window.speechSynthesis.speak(u);
    }
  }
}

export default function Page() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<EcoResponse | null>(null);
  const [chat, setChat] = useState<Msg[]>([]);
  const [tickIdx, setTickIdx] = useState(0);
  const [listening, setListening] = useState(false);
  const [secs, setSecs] = useState(0);
  const [wakeOn, setWakeOn] = useState(false);
  const chatEnd = useRef<HTMLDivElement>(null);
  const recRef = useRef<any>(null);
  const wakeRef = useRef<any>(null);
  const wakeLoop = useRef(true);

  const BACKEND = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "").replace(/\/$/, "");
  const EL_KEY = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY ?? "";

  const ts = () => new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const fmt = (s: number) => [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60]
    .map(n => String(n).padStart(2, "0")).join(":");

  useEffect(() => { const t = setInterval(() => setSecs(s => s + 1), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { const t = setInterval(() => setTickIdx(i => (i + 1) % TICKER.length), 5000); return () => clearInterval(t); }, []);
  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [chat]);

  const greet = useCallback(async () => {
    const msg = "Hey Boss, EcoAgent online. What would you like to know today?";
    setChat(p => [...p, { role: "eco", text: msg, time: ts() }]);
    await speak(msg, EL_KEY);
  }, [EL_KEY]);

  const askEco = useCallback(async (text: string) => {
    if (!text.trim()) return;
    setLoading(true);
    setQuery("");
    setChat(p => [...p, { role: "user", text, time: ts() }]);

    if (!BACKEND) {
      const err = "Boss, set NEXT_PUBLIC_BACKEND_URL in Vercel environment variables.";
      setChat(p => [...p, { role: "eco", text: err, time: ts() }]);
      await speak(err, EL_KEY);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${BACKEND}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const data: EcoResponse = await res.json();
      setResponse(data);
      setChat(p => [...p, { role: "eco", text: data.speech, time: ts() }]);
      if (data.speech) await speak(data.speech, EL_KEY);
    } catch (err) {
      const msg = `Boss, backend error: ${String(err).slice(0, 150)}`;
      setChat(p => [...p, { role: "eco", text: msg, time: ts() }]);
      await speak(msg, EL_KEY);
    } finally {
      setLoading(false);
    }
  }, [BACKEND, EL_KEY]);

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
      rec.onend = () => { if (alive && wakeLoop.current) setTimeout(startWake, 400); };
      rec.onerror = () => { if (alive && wakeLoop.current) setTimeout(startWake, 1200); };
      wakeRef.current = rec;
      try { rec.start(); } catch { }
    }

    function startCmd() {
      if (!alive) return;
      const rec: any = new SR();
      rec.continuous = false; rec.interimResults = false; rec.lang = "en-US";
      rec.onresult = (e: any) => askEco(e.results[0][0].transcript);
      rec.onend = () => { if (alive) setTimeout(startWake, 500); };
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

  const toggleMic = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Use Chrome for voice."); return; }
    if (listening) { recRef.current?.stop(); setListening(false); return; }
    const rec: any = new SR();
    rec.continuous = false; rec.interimResults = false; rec.lang = "en-US";
    rec.onresult = (e: any) => askEco(e.results[0][0].transcript);
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec; rec.start(); setListening(true);
  }, [listening, askEco]);

  const active = response?.countries ?? [];

  return (
    <div className="root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Rajdhani:wght@400;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        html,body{height:100%;background:#020a14;color:#c8e8f0;overflow:hidden;}
        ::-webkit-scrollbar{width:3px;height:3px;}
        ::-webkit-scrollbar-thumb{background:rgba(0,200,255,0.18);border-radius:2px;}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.2}}
        @keyframes ticker{0%{opacity:0;transform:translateY(4px)}15%{opacity:1;transform:translateY(0)}85%{opacity:1}100%{opacity:0;transform:translateY(-4px)}}
        @keyframes slideIn{from{opacity:0;transform:translateX(6px)}to{opacity:1;transform:translateX(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes pulseGlow{0%,100%{box-shadow:0 0 12px rgba(0,255,100,.4)}50%{box-shadow:0 0 28px rgba(0,255,100,.9)}}
        @keyframes scanline{0%{top:-3px}100%{top:100%}}
        @keyframes wakeFlash{0%{opacity:0}15%{opacity:1}85%{opacity:1}100%{opacity:0}}
        @keyframes twinkle{0%{opacity:.2}100%{opacity:1}}

        .root{display:flex;flex-direction:column;height:100vh;width:100vw;overflow:hidden;font-family:'Rajdhani',system-ui,sans-serif;}
        .hdr{display:flex;align-items:center;justify-content:space-between;padding:0 20px;height:46px;border-bottom:1px solid rgba(0,200,255,.14);background:rgba(1,5,12,.98);flex-shrink:0;z-index:10;}
        .hdr-l{display:flex;align-items:center;gap:12px;}
        .diamond{width:17px;height:17px;background:linear-gradient(135deg,#00cfff,#0060ff);transform:rotate(45deg);box-shadow:0 0 14px rgba(0,200,255,.9);}
        .brand{font-family:'Share Tech Mono',monospace;font-size:16px;letter-spacing:.42em;color:#00e5ff;text-shadow:0 0 18px rgba(0,229,255,.7);}
        .sub{font-family:'Share Tech Mono',monospace;font-size:10px;letter-spacing:.22em;color:rgba(0,200,255,.4);}
        .hdr-r{display:flex;align-items:center;gap:8px;font-family:'Share Tech Mono',monospace;font-size:11px;color:rgba(0,200,255,.55);}
        .online{display:flex;align-items:center;gap:6px;}
        .odot{width:8px;height:8px;border-radius:50%;background:#00ff88;box-shadow:0 0 10px #00ff88;animation:blink 2s ease-in-out infinite;}
        .wake{position:fixed;top:53px;left:50%;transform:translateX(-50%);z-index:99;background:rgba(0,255,150,.1);border:1px solid rgba(0,255,150,.4);border-radius:5px;padding:5px 18px;font-family:'Share Tech Mono',monospace;font-size:12px;color:#00ff96;letter-spacing:.15em;animation:wakeFlash 3s ease forwards;pointer-events:none;}
        .ticker{height:29px;display:flex;align-items:center;gap:12px;padding:0 16px;border-bottom:1px solid rgba(0,200,255,.08);background:rgba(0,6,16,.75);flex-shrink:0;overflow:hidden;z-index:10;}
        .t-live{font-family:'Share Tech Mono',monospace;font-size:9px;background:rgba(0,255,100,.1);border:1px solid rgba(0,255,100,.35);color:#00ff88;padding:2px 7px;letter-spacing:.2em;border-radius:2px;flex-shrink:0;}
        .t-txt{font-family:'Share Tech Mono',monospace;font-size:11px;color:rgba(0,200,255,.75);animation:ticker 5s ease-in-out infinite;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .body{display:flex;flex:1;overflow:hidden;min-height:0;}
        .left{width:228px;flex-shrink:0;border-right:1px solid rgba(0,200,255,.1);display:flex;flex-direction:column;overflow-y:auto;background:rgba(1,5,12,.85);z-index:5;}
        .ph{font-family:'Share Tech Mono',monospace;font-size:10px;letter-spacing:.25em;color:rgba(0,200,255,.42);padding:10px 14px 5px;}
        .mc{margin:0 10px 8px;background:rgba(0,22,44,.6);border:1px solid rgba(0,200,255,.1);border-radius:5px;padding:9px 11px;}
        .mc-lbl{font-family:'Share Tech Mono',monospace;font-size:9px;letter-spacing:.18em;color:rgba(0,200,255,.42);}
        .mc-row{display:flex;justify-content:space-between;align-items:baseline;margin:3px 0 1px;}
        .mc-val{font-family:'Share Tech Mono',monospace;font-size:19px;color:#e2f4ff;}
        .mc-d{font-family:'Share Tech Mono',monospace;font-size:11px;}
        .sig{display:flex;align-items:center;gap:8px;padding:4px 14px;font-family:'Share Tech Mono',monospace;font-size:11px;color:rgba(0,200,255,.62);}
        .sdot{width:6px;height:6px;border-radius:50%;flex-shrink:0;}
        .hist{padding:0 12px 8px;overflow-y:auto;max-height:130px;}
        .hrow{display:flex;gap:6px;font-family:'Share Tech Mono',monospace;font-size:10px;margin-bottom:2px;animation:slideIn .2s ease;}
        .hy{color:rgba(0,200,255,.48);}
        .he{color:rgba(0,255,140,.52);}
        .htxt{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:rgba(180,222,240,.58);}
        .ht{color:rgba(0,200,255,.2);flex-shrink:0;}
        .sess{margin:8px 14px 10px;font-family:'Share Tech Mono',monospace;font-size:10px;color:rgba(0,200,255,.28);letter-spacing:.08em;}
        .center{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0;position:relative;}
        .globe-area{flex:1;position:relative;overflow:hidden;}
        .scanline{position:absolute;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,rgba(0,200,255,.2),transparent);animation:scanline 5s linear infinite;pointer-events:none;z-index:2;}
        .news-strip{border-top:1px solid rgba(0,200,255,.08);height:155px;flex-shrink:0;display:flex;flex-direction:column;background:rgba(1,5,12,.7);z-index:5;}
        .nrow{display:flex;gap:10px;overflow-x:auto;padding:8px 12px;flex:1;}
        .nc{min-width:205px;max-width:205px;background:rgba(0,18,36,.85);border:1px solid rgba(0,200,255,.1);border-radius:5px;padding:9px 10px;cursor:pointer;transition:border-color .2s;text-decoration:none;display:block;flex-shrink:0;animation:slideIn .35s ease;}
        .nc:hover{border-color:rgba(0,200,255,.4);}
        .nc-src{font-family:'Share Tech Mono',monospace;font-size:9px;letter-spacing:.14em;color:rgba(0,200,255,.42);margin-bottom:5px;}
        .nc-hl{font-size:12px;line-height:1.4;color:rgba(200,232,245,.85);display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;}
        .right{width:268px;flex-shrink:0;border-left:1px solid rgba(0,200,255,.1);display:flex;flex-direction:column;background:rgba(1,5,12,.85);z-index:5;}
        .iscroll{flex:1;overflow-y:auto;padding:10px 13px;}
        .ylbl{font-family:'Share Tech Mono',monospace;font-size:9px;letter-spacing:.2em;color:rgba(0,200,255,.36);margin-bottom:3px;}
        .ybox{background:rgba(0,200,255,.04);border:1px solid rgba(0,200,255,.17);border-radius:4px;padding:7px 9px;font-family:'Share Tech Mono',monospace;font-size:12px;color:#c8e8f0;margin-bottom:10px;word-break:break-word;}
        .elbl{font-family:'Share Tech Mono',monospace;font-size:9px;letter-spacing:.2em;color:rgba(0,255,140,.42);margin-bottom:5px;}
        .eresp{font-size:13px;line-height:1.65;color:#c8e8f0;animation:fadeIn .4s ease;}
        .epred{margin-top:9px;padding-top:9px;border-top:1px solid rgba(0,200,255,.1);font-family:'Share Tech Mono',monospace;font-size:11px;color:#00e5ff;opacity:.72;}
        .esrcs{margin-top:7px;display:flex;flex-wrap:wrap;gap:4px;}
        .sbadge{font-family:'Share Tech Mono',monospace;font-size:9px;padding:2px 6px;border:1px solid rgba(0,200,255,.17);border-radius:2px;color:rgba(0,200,255,.52);}
        .await{display:flex;flex-direction:column;align-items:center;justify-content:center;height:130px;color:rgba(0,200,255,.18);font-family:'Share Tech Mono',monospace;font-size:11px;letter-spacing:.2em;gap:8px;text-align:center;}
        .ibar{display:flex;align-items:center;gap:10px;padding:9px 16px;border-top:1px solid rgba(0,200,255,.12);background:rgba(1,4,11,.98);flex-shrink:0;z-index:10;}
        .mbutton{width:40px;height:40px;border-radius:50%;border:none;cursor:pointer;display:grid;place-items:center;font-size:17px;flex-shrink:0;transition:all .2s;}
        .midle{background:rgba(0,200,255,.08);box-shadow:0 0 10px rgba(0,200,255,.12);}
        .mon{background:rgba(0,255,100,.14);animation:pulseGlow 1s ease-in-out infinite;}
        .qinp{flex:1;background:rgba(0,200,255,.04);border:1px solid rgba(0,200,255,.17);border-radius:4px;padding:9px 13px;color:#c8e8f0;font-size:13px;font-family:'Rajdhani',system-ui,sans-serif;outline:none;}
        .qinp:focus{border-color:rgba(0,200,255,.44);}
        .qinp::placeholder{color:rgba(0,200,255,.2);}
        .brief{background:linear-gradient(135deg,rgba(0,200,255,.16),rgba(0,100,200,.26));border:1px solid rgba(0,200,255,.36);border-radius:4px;color:#00e5ff;font-family:'Share Tech Mono',monospace;font-size:11px;letter-spacing:.2em;padding:9px 16px;cursor:pointer;transition:all .2s;white-space:nowrap;flex-shrink:0;}
        .brief:hover{background:linear-gradient(135deg,rgba(0,200,255,.3),rgba(0,100,200,.4));box-shadow:0 0 14px rgba(0,200,255,.22);}
        .brief:disabled{opacity:.32;cursor:not-allowed;}
        .dots{display:inline-flex;gap:4px;align-items:center;}
        .dots span{width:5px;height:5px;border-radius:50%;background:#00e5ff;animation:blink 1s ease-in-out infinite;}
        .dots span:nth-child(2){animation-delay:.2s;}
        .dots span:nth-child(3){animation-delay:.4s;}
        @media(max-width:900px){.left{width:180px;}}
        @media(max-width:700px){.left{display:none;}.right{width:220px;}}
        @media(max-width:500px){.right{display:none;}}
      `}</style>

      {wakeOn && <div className="wake">◈ WAKE WORD DETECTED — ECONAGENT ACTIVE</div>}

      <header className="hdr">
        <div className="hdr-l">
          <div className="diamond" />
          <span className="brand">ECONAGENT</span>
          <span style={{ color: "rgba(0,200,255,.25)" }}>·</span>
          <span className="sub">MISSION CONTROL · ECONOMIC INTELLIGENCE</span>
        </div>
        <div className="hdr-r">
          <div className="online"><div className="odot" /><span>ONLINE</span></div>
          <span style={{ color: "rgba(0,200,255,.28)" }}>{fmt(secs)}</span>
        </div>
      </header>

      <div className="ticker">
        <div className="t-live">LIVE</div>
        <div className="t-txt" key={tickIdx}>{TICKER[tickIdx]}</div>
      </div>

      <div className="body">
        <div className="left">
          <div className="ph">// LIVE READOUT</div>
          <div className="mc">
            <div className="mc-lbl">S&amp;P 500</div>
            <div className="mc-row"><span className="mc-val">4498</span><span className="mc-d" style={{ color: "#68d391" }}>▲ +0.8%</span></div>
            <Spark data={SP} color="#68d391" />
          </div>
          <div className="mc">
            <div className="mc-lbl">US CPI</div>
            <div className="mc-row"><span className="mc-val">2.87%</span><span className="mc-d" style={{ color: "#63b3ed" }}>▼ -0.02</span></div>
            <Spark data={CPI} color="#63b3ed" />
          </div>
          <div className="mc">
            <div className="mc-lbl">BTC/USD</div>
            <div className="mc-row"><span className="mc-val" style={{ fontSize: 16 }}>$106.5K</span><span className="mc-d" style={{ color: "#f6ad55" }}>▲ +2.1%</span></div>
            <Spark data={BTC} color="#f6ad55" />
          </div>
          <div className="ph">// KEY SIGNALS</div>
          {SIGS.map((s, i) => (
            <div key={i} className="sig">
              <div className="sdot" style={{ background: s.dot, boxShadow: `0 0 8px ${s.dot}` }} />
              {s.txt}
            </div>
          ))}
          {chat.length > 0 && <>
            <div className="ph" style={{ marginTop: 10 }}>// SESSION HISTORY</div>
            <div className="hist">
              {chat.map((m, i) => (
                <div key={i} className="hrow">
                  <span className={m.role === "user" ? "hy" : "he"}>{m.role === "user" ? "YOU" : "ECO"}</span>
                  <span className="htxt">{m.text}</span>
                  <span className="ht">{m.time}</span>
                </div>
              ))}
            </div>
          </>}
          <div className="sess">SESSION {fmt(secs)}</div>
        </div>

        <div className="center">
          <div className="globe-area">
            <div className="scanline" />
            <ThreeGlobe active={active} />
          </div>
          <div className="news-strip">
            <div className="ph" style={{ padding: "7px 14px 4px" }}>// INTEL FEED</div>
            <div className="nrow">
              {loading && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 8px", fontFamily: "'Share Tech Mono',monospace", fontSize: 11, color: "rgba(0,200,255,.42)" }}>
                  <div className="dots"><span /><span /><span /></div>Fetching intelligence...
                </div>
              )}
              {response?.newsCards?.map((n, i) => (
                <a key={i} className="nc" href={n.url} target="_blank" rel="noopener noreferrer">
                  <div className="nc-src">{n.source?.toUpperCase()}</div>
                  <div className="nc-hl">{n.headline}</div>
                </a>
              ))}
              {!loading && !response && (
                <div style={{ display: "flex", alignItems: "center", padding: "0 8px", fontFamily: "'Share Tech Mono',monospace", fontSize: 11, color: "rgba(0,200,255,.18)", letterSpacing: ".12em" }}>
                  SAY &quot;HEY ECO&quot; OR TYPE A QUERY TO LOAD LIVE INTEL
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="right">
          <div className="ph">// INTELLIGENCE BRIEF</div>
          <div className="iscroll">
            {chat.length === 0 && !loading && (
              <div className="await">
                <div style={{ fontSize: 26, opacity: .35 }}>◈</div>
                <div>AWAITING QUERY</div>
                <div style={{ fontSize: 10, opacity: .45, lineHeight: 1.7 }}>Say &quot;Hey Eco&quot;<br />or type below</div>
              </div>
            )}
            {chat.filter(m => m.role === "user").slice(-1).map((m, i) => (
              <div key={i}><div className="ylbl">YOU ASKED</div><div className="ybox">{m.text}</div></div>
            ))}
            {loading && (
              <div style={{ display: "flex", gap: 8, alignItems: "center", fontFamily: "'Share Tech Mono',monospace", fontSize: 11, color: "rgba(0,200,255,.42)" }}>
                <div className="dots"><span /><span /><span /></div>Processing briefing...
              </div>
            )}
            {response && !loading && (
              <div style={{ animation: "fadeIn .4s ease" }}>
                <div className="elbl">ECONAGENT</div>
                <div className="eresp">{response.speech}</div>
                {response.prediction && <div className="epred">⟶ {response.prediction}</div>}
                {response.sources?.length > 0 && (
                  <div className="esrcs">
                    {response.sources.map((s, i) => <span key={i} className="sbadge">{s}</span>)}
                  </div>
                )}
              </div>
            )}
            <div ref={chatEnd} />
          </div>
        </div>
      </div>

      <div className="ibar">
        <button className={`mbutton ${listening ? "mon" : "midle"}`} onClick={toggleMic} title="Voice">🎙</button>
        <input className="qinp" placeholder="Ask EcoAgent anything about global economics..."
          value={query} onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !loading && askEco(query)}
          disabled={loading} />
        <button className="brief" onClick={() => askEco(query)} disabled={loading || !query.trim()}>
          {loading ? <span className="dots"><span /><span /><span /></span> : "BRIEF ME"}
        </button>
      </div>
    </div>
  );
}
