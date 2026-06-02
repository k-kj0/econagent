"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/* ─── Types ───────────────────────────────────────────────────── */
interface Message {
  id: string;
  role: "user" | "bot";
  text: string;
  timestamp: Date;
}

interface NewsItem {
  title: string;
  source: string;
  time: string;
  image?: string;
}

/* ─── Sparkline SVG ───────────────────────────────────────────── */
function Sparkline({ data, color = "#00ffff", height = 40, width = 120 }: { data: number[]; color?: string; height?: number; width?: number }) {
  if (!data || data.length < 2) return <div style={{ width, height }} />;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const points = data.map((v, i) => {
    const x = i * step;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={width} height={height} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.5" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline fill="none" stroke={color} strokeWidth="2" points={points} strokeLinecap="round" strokeLinejoin="round" />
      <polygon points={`0,${height} ${points} ${width},${height}`} fill="url(#sparkGrad)" />
    </svg>
  );
}

/* ─── Revolving Globe (Canvas) ───────────────────────────────── */
function RevolvingGlobe({ mode, newsItems }: { mode: "idle" | "news" | "inflation"; newsItems?: NewsItem[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationRef = useRef(0);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (!rect) return;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    const continents = [
      [-0.8,-0.5],[-0.7,-0.4],[-0.9,-0.3],[-0.6,-0.6],[-0.5,-0.5],[-0.8,-0.2],[-0.7,-0.1],[-0.6,-0.3],[-0.9,-0.6],
      [-0.6,0.2],[-0.5,0.4],[-0.7,0.3],[-0.6,0.5],[-0.5,0.1],
      [0.1,-0.5],[0.2,-0.4],[0.0,-0.5],[0.3,-0.5],[0.1,-0.3],
      [0.2,0.0],[0.3,0.2],[0.1,0.1],[0.2,0.4],[0.0,0.2],
      [0.5,-0.4],[0.7,-0.3],[0.6,-0.5],[0.8,-0.2],[0.5,-0.2],[0.7,-0.1],[0.9,-0.3],[0.6,0.0],[0.8,0.0],
      [0.8,0.4],[0.9,0.5],[0.7,0.5],
    ];

    const draw = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (!rect) return;
      const w = rect.width;
      const h = rect.height;
      const cx = w / 2;
      const cy = h / 2;
      const radius = Math.min(w, h) * 0.35;

      ctx.clearRect(0, 0, w, h);
      rotationRef.current += 0.002;
      const rot = rotationRef.current;

      // Outer glow
      const glow = ctx.createRadialGradient(cx, cy, radius * 0.7, cx, cy, radius * 1.5);
      glow.addColorStop(0, "rgba(0,212,255,0.12)");
      glow.addColorStop(0.5, "rgba(0,212,255,0.04)");
      glow.addColorStop(1, "rgba(0,212,255,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

      // Main globe circle
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(0,212,255,0.2)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Grid lines (longitude)
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2 + rot;
        ctx.beginPath();
        ctx.ellipse(cx, cy, radius * Math.cos(angle * 0.3), radius, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0,212,255,${0.05 + Math.sin(angle) * 0.02})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Latitude lines
      for (let i = -3; i <= 3; i++) {
        const y = cy + (i / 3) * radius * 0.6;
        const r = Math.sqrt(Math.max(0, radius * radius - (y - cy) * (y - cy)));
        if (r > 10) {
          ctx.beginPath();
          ctx.ellipse(cx, y, r, r * 0.25, 0, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(0,212,255,0.08)";
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }

      // Continent dots
      continents.forEach(([lon, lat]) => {
        const x = cx + lon * radius * Math.cos(rot * 0.5);
        const y = cy + lat * radius;
        const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        if (dist < radius * 0.95) {
          ctx.beginPath();
          ctx.arc(x, y, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(0,170,255,0.5)";
          ctx.fill();
        }
      });

      // Pulse ring
      const pulse = (Date.now() % 4000) / 4000;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * (0.7 + pulse * 0.5), 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0,212,255,${0.2 * (1 - pulse)})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // News markers
      if (mode === "news" && newsItems) {
        newsItems.forEach((_, i) => {
          const angle = (i / Math.max(newsItems.length, 1)) * Math.PI * 2 + rot * 3;
          const mx = cx + Math.cos(angle) * radius * 0.65;
          const my = cy + Math.sin(angle) * radius * 0.45;
          const blink = 0.5 + Math.sin(Date.now() / 300 + i * 2) * 0.4;

          ctx.beginPath();
          ctx.arc(mx, my, 3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(0,255,255,${blink})`;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(mx, my, 7, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(0,255,255,${blink * 0.5})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        });
      }

      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [mode, newsItems]);

  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      {mode === "news" && newsItems && (
        <div className="absolute top-[10%] left-1/2 -translate-x-1/2 flex gap-3 z-10 max-w-[90%] overflow-x-auto px-2">
          {newsItems.slice(0, 3).map((news, i) => (
            <div key={i} className="glass rounded-lg p-3 min-w-[180px] max-w-[200px] shrink-0 hover:border-[rgba(0,212,255,0.4)] transition-all duration-300 cursor-pointer">
              {news.image && (
                <div className="w-full h-14 rounded bg-cover bg-center mb-2" style={{ backgroundImage: `url(${news.image})` }} />
              )}
              <div className="text-[10px] text-[#00d4ff] mb-1 uppercase tracking-wider">{news.source}</div>
              <div className="text-[11px] text-[#e2e8f0] leading-relaxed line-clamp-3">{news.title}</div>
              <div className="text-[9px] text-[#94a3b8] mt-1">{news.time}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Inflation Dashboard ─────────────────────────────────────── */
function InflationDashboard() {
  const countries = [
    { code: "US", name: "United States", cpi: "2.88%", forecast: "2.61%", change: "-0.27", risk: "14/100", spark: [2.5, 2.8, 3.1, 2.9, 2.7, 2.88] },
    { code: "EU", name: "Eurozone", cpi: "2.3%", forecast: "2.1%", change: "-0.2", risk: "22/100", spark: [2.8, 2.6, 2.4, 2.3, 2.2, 2.3] },
    { code: "UK", name: "United Kingdom", cpi: "3.1%", forecast: "2.8%", change: "-0.3", risk: "31/100", spark: [3.5, 3.3, 3.2, 3.1, 3.0, 3.1] },
    { code: "JP", name: "Japan", cpi: "1.2%", forecast: "1.5%", change: "+0.3", risk: "8/100", spark: [0.8, 0.9, 1.0, 1.1, 1.15, 1.2] },
    { code: "IN", name: "India", cpi: "4.8%", forecast: "4.5%", change: "-0.3", risk: "45/100", spark: [5.2, 5.0, 4.9, 4.8, 4.7, 4.8] },
    { code: "BR", name: "Brazil", cpi: "5.2%", forecast: "4.8%", change: "-0.4", risk: "52/100", spark: [5.8, 5.5, 5.3, 5.2, 5.0, 5.2] },
  ];

  const [selected, setSelected] = useState(countries[0]);

  return (
    <div className="absolute inset-0 flex flex-col p-5 overflow-auto">
      <div className="mb-4">
        <div className="text-[10px] text-[#94a3b8] tracking-[2px] uppercase mb-1">Predictor · v2.4</div>
        <div className="text-xl text-[#e2e8f0] font-light italic">{selected.name} · Headline CPI</div>
        <div className="text-[10px] text-[#94a3b8] mt-1">12-MONTH FORECAST · BIAS: HEADLINE INFLATION</div>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {countries.map((c) => (
          <button
            key={c.code}
            onClick={() => setSelected(c)}
            className={`px-3 py-1.5 rounded text-[11px] transition-all duration-200 border ${
              selected.code === c.code
                ? "bg-[rgba(0,212,255,0.1)] border-[rgba(0,212,255,0.3)] text-[#00d4ff]"
                : "bg-transparent border-[rgba(0,212,255,0.1)] text-[#94a3b8] hover:border-[rgba(0,212,255,0.2)]"
            }`}
          >
            {c.code}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { label: "CURRENT YoY", value: selected.cpi, sub: "LAST UPDATE: APR" },
          { label: "FORECAST", value: selected.forecast, sub: "END OF 12-MONTHS" },
          { label: "Δ CHANGE", value: selected.change, sub: "PERCENTAGE POINTS", color: selected.change.startsWith("-") ? "#48bb78" : "#f56565" },
          { label: "RISK SCORE", value: selected.risk, sub: "VOLATILITY 0.8σ", color: "#ffd700" },
        ].map((m, i) => (
          <div key={i} className="glass rounded-lg p-3">
            <div className="text-[9px] text-[#94a3b8] tracking-[1px] uppercase mb-1.5">{m.label}</div>
            <div className="text-xl font-light font-mono" style={{ color: m.color || "#ffd700" }}>{m.value}</div>
            <div className="text-[9px] text-[#94a3b8] mt-1">{m.sub}</div>
          </div>
        ))}
      </div>

      <div className="flex-1 glass rounded-lg p-4 flex flex-col min-h-[180px]">
        <div className="flex justify-between items-center mb-3">
          <div className="text-[11px] text-[#e2e8f0]">YoY % · Historical + Forecast</div>
          <div className="flex gap-3 text-[9px] text-[#94a3b8]">
            <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 bg-[#00d4ff]" /> ACTUAL</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 bg-[#ffd700] border border-dashed" /> FORECAST</span>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Sparkline data={selected.spark} width={400} height={120} color="#00d4ff" />
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ───────────────────────────────────────────────── */
export default function Home() {
  const [activeTab, setActiveTab] = useState<"home" | "inflation" | "news">("home");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "bot",
      text: "Hey! I'm EcoAgent — your global economic intelligence system. How can I help you today? Ask me about inflation forecasts, market news, or any economic indicator. Give me a minute to check the data if you need something specific.",
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [centerMode, setCenterMode] = useState<"idle" | "news" | "inflation">("idle");
  const [newsData, setNewsData] = useState<NewsItem[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => { scrollToBottom(); }, [messages]);

  const demoNews: NewsItem[] = [
    { title: "Fed Signals Potential Rate Cuts in Q3 2026", source: "Reuters", time: "2h ago", image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=200" },
    { title: "US CPI Drops to 2.88% as Energy Prices Stabilize", source: "Bloomberg", time: "4h ago", image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=200" },
    { title: "ECB Holds Rates Steady Amid Inflation Concerns", source: "FT", time: "6h ago", image: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=200" },
    { title: "China Manufacturing PMI Shows Recovery Signs", source: "WSJ", time: "8h ago" },
    { title: "Oil Prices Surge on Middle East Tensions", source: "CNBC", time: "10h ago" },
    { title: "Bitcoin Crosses $85K as Crypto Market Rallies", source: "CoinDesk", time: "12h ago" },
  ];

  const handleSend = useCallback(async () => {
    if (!inputText.trim() || isTyping) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      text: inputText.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsTyping(true);

    const text = userMsg.text.toLowerCase();

    if (text.includes("news") || text.includes("america") || text.includes("usa") || text.includes("headlines") || text.includes("world")) {
      setCenterMode("news");
      setNewsData(demoNews);
      setActiveTab("news");
    } else if (text.includes("inflation") || text.includes("cpi") || text.includes("rate") || text.includes("forecast")) {
      setCenterMode("inflation");
      setActiveTab("inflation");
    } else {
      setCenterMode("idle");
      setActiveTab("home");
    }

    // Call your actual API
    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: userMsg.text }),
      });

      if (!response.ok) throw new Error('API error');
      const data = await response.json();

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "bot",
        text: data.response || data.text || "I've processed your request. The data is now available on the dashboard.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      // Smart fallback responses
      let fallback = "";
      if (text.includes("news") || text.includes("america")) {
        fallback = "Wait a minute, let me check the latest headlines for you... Alright, here's what I found: The Federal Reserve is signaling potential rate cuts in Q3 2026 as CPI drops to 2.88%. Energy price stabilization is the primary driver. I've marked the key stories on the globe for you — check the cards above.";
      } else if (text.includes("inflation") || text.includes("cpi")) {
        fallback = "Give me a second to pull the latest inflation data... Okay, here's the picture: Current US Headline CPI stands at 2.88% YoY, with a 12-month forecast of 2.61%. The trend shows disinflation continuing, though core services remain sticky. Risk score is 14/100 indicating low volatility. I've opened the inflation dashboard for you — click through the country tabs for more detail.";
      } else if (text.includes("hello") || text.includes("hi") || text.includes("hey")) {
        fallback = "Hey there! EcoAgent v2.4 here. I'm ready to help with inflation forecasts, global market news, economic indicators, or anything finance-related. What would you like to dive into today?";
      } else {
        fallback = `Let me check on that for you... "${userMsg.text}" — interesting query. Based on current global economic indicators, I'd recommend checking our inflation dashboard for detailed metrics or asking for region-specific news. What area are you most interested in?`;
      }

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "bot",
        text: fallback,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } finally {
      setIsTyping(false);
    }
  }, [inputText, isTyping]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const tabClick = (tab: "home" | "inflation" | "news") => {
    setActiveTab(tab);
    if (tab === "inflation") setCenterMode("inflation");
    if (tab === "news") { setCenterMode("news"); setNewsData(demoNews); }
    if (tab === "home") setCenterMode("idle");
  };

  return (
    <div className="h-screen w-screen bg-[#080d1a] text-[#e2e8f0] font-mono overflow-hidden flex flex-col">

      {/* ─── TOP BAR ─── */}
      <div className="h-12 border-b border-[rgba(0,212,255,0.1)] flex items-center px-4 shrink-0 bg-[rgba(8,13,26,0.95)]">
        <div className="text-sm font-semibold text-[#00d4ff] tracking-[2px]">ECOAGENT</div>
        <div className="text-[10px] text-[#94a3b8] ml-2">v2.4 · GLOBAL INTELLIGENCE</div>
        <div className="ml-auto flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#48bb78] shadow-[0_0_6px_#48bb78]" />
          <div className="text-[10px] text-[#94a3b8]">ONLINE</div>
        </div>
      </div>

      {/* ─── MAIN CONTENT ─── */}
      <div className="flex-1 flex overflow-hidden">

        {/* LEFT SIDEBAR */}
        <div className="w-[220px] border-r border-[rgba(0,212,255,0.1)] flex flex-col p-3 gap-1 shrink-0 bg-[rgba(18,24,45,0.6)]">
          <div className="flex flex-col gap-0.5">
            {[
              { id: "home" as const, label: "Home", icon: "⌂" },
              { id: "inflation" as const, label: "Inflation", icon: "◈" },
              { id: "news" as const, label: "News", icon: "◉" },
            ].map((tab) => (
              <button key={tab.id} onClick={() => tabClick(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-[11px] text-left transition-all duration-200 ${
                  activeTab === tab.id
                    ? "bg-[rgba(0,212,255,0.1)] text-[#00d4ff] border border-[rgba(0,212,255,0.15)]"
                    : "text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-[rgba(0,212,255,0.04)] border border-transparent"
                }`}>
                <span className="text-xs">{tab.icon}</span>{tab.label}
              </button>
            ))}
          </div>

          <div className="mt-3 pt-3 border-t border-[rgba(0,212,255,0.1)] flex-1 flex flex-col overflow-hidden">
            <div className="text-[9px] text-[#94a3b8] tracking-[1px] uppercase mb-2">Chat History</div>
            <div className="flex-1 overflow-auto flex flex-col gap-1 pr-1">
              {messages.filter(m => m.role === "user").map((msg) => (
                <button key={msg.id} onClick={() => setInputText(msg.text)}
                  className="text-left p-2 rounded bg-[rgba(0,212,255,0.03)] border border-[rgba(0,212,255,0.06)] text-[10px] text-[#94a3b8] hover:border-[rgba(0,212,255,0.15)] transition-all line-clamp-2">
                  <div className="text-[#00d4ff] text-[9px] mb-0.5">You</div>
                  {msg.text.slice(0, 40)}{msg.text.length > 40 ? "..." : ""}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* CENTER + RIGHT CHAT */}
        <div className="flex-1 flex overflow-hidden">

          {/* CENTER AREA */}
          <div className="flex-1 relative bg-[#080d1a] overflow-hidden">
            {centerMode === "inflation" ? (
              <InflationDashboard />
            ) : centerMode === "news" ? (
              <RevolvingGlobe mode="news" newsItems={newsData} />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="w-[200px] h-[200px] relative">
                  <RevolvingGlobe mode="idle" />
                </div>
                <div className="mt-4 text-center">
                  <div className="text-xs text-[#00d4ff] opacity-40 tracking-widest uppercase">
                    {isTyping ? 'Processing...' : 'Standby'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT CHAT PANEL */}
          <div className="w-[320px] border-l border-[rgba(0,212,255,0.1)] flex flex-col overflow-hidden bg-[rgba(18,24,45,0.4)]">
            <div className="px-3 py-2 border-b border-[rgba(0,212,255,0.1)] flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#48bb78] shadow-[0_0_6px_#48bb78]" />
              <div className="text-[11px] text-[#e2e8f0]">EcoAgent</div>
            </div>

            <div className="flex-1 overflow-auto p-3 flex flex-col gap-2.5">
              {messages.map((msg) => (
                <div key={msg.id} className={`max-w-[95%] ${msg.role === "user" ? "self-end" : "self-start"}`}>
                  <div className={`rounded-lg p-2.5 text-[11px] leading-relaxed border ${
                    msg.role === "user"
                      ? "bg-[rgba(0,170,255,0.08)] border-[rgba(0,170,255,0.15)] rounded-br-sm"
                      : "bg-[rgba(0,212,255,0.04)] border-[rgba(0,212,255,0.1)] rounded-bl-sm"
                  }`}>
                    <div className={`text-[9px] font-semibold mb-1 ${msg.role === "user" ? "text-[#00aaff]" : "text-[#00d4ff]"}`}>
                      {msg.role === "user" ? "YOU" : "ECOAGENT"}
                    </div>
                    <div className="text-[#e2e8f0] whitespace-pre-wrap">{msg.text}</div>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="self-start">
                  <div className="bg-[rgba(0,212,255,0.04)] border border-[rgba(0,212,255,0.1)] rounded-lg rounded-bl-sm p-2.5">
                    <div className="text-[9px] text-[#00d4ff] mb-1">ECOAGENT</div>
                    <div className="flex gap-1 items-center h-3">
                      {[0, 1, 2].map(i => (
                        <span key={i} className="w-1 h-1 rounded-full bg-[#00d4ff] animate-wave" style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input inside chat panel */}
            <div className="p-2.5 border-t border-[rgba(0,212,255,0.1)]">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask EcoAgent..."
                  disabled={isTyping}
                  className="flex-1 bg-[rgba(14,20,38,0.8)] border border-[rgba(0,212,255,0.12)] rounded-md px-3 py-2 text-[11px] text-[#e2e8f0] placeholder-[#475569] focus:outline-none focus:border-[rgba(0,212,255,0.3)] transition-colors"
                />
                <button
                  onClick={handleSend}
                  disabled={isTyping || !inputText.trim()}
                  className="px-3 py-2 bg-[#00aaff] rounded-md text-[#080d1a] text-[11px] font-bold hover:bg-[#33bbff] disabled:opacity-40 transition-all"
                >
                  SEND
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── BOTTOM NEWS STRIP ─── */}
      <div className="h-9 border-t border-[rgba(0,212,255,0.1)] flex items-center px-4 gap-4 overflow-hidden bg-[rgba(18,24,45,0.8)] shrink-0">
        <div className="text-[10px] text-[#00d4ff] font-semibold whitespace-nowrap shrink-0">
          {today}
        </div>
        <div className="flex-1 overflow-hidden relative">
          <div className="flex gap-6 animate-[scrollNews_40s_linear_infinite] whitespace-nowrap text-[10px]">
            {[...demoNews, ...demoNews].map((news, i) => (
              <span key={i} className="flex items-center gap-1.5 shrink-0">
                <span className="text-[7px] text-[#00d4ff]">●</span>
                <span className="text-[#e2e8f0]">{news.title}</span>
                <span className="text-[#475569]">|</span>
                <span className="text-[#94a3b8]">{news.source}</span>
              </span>
            ))}
          </div>
        </div>
        <div className="text-[9px] text-[#94a3b8] whitespace-nowrap shrink-0 border-l border-[rgba(0,212,255,0.1)] pl-3">
          FREE TIER · 3/5 LEFT
        </div>
      </div>

      {/* Inline keyframes */}
      <style jsx>{`
        @keyframes scrollNews {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
