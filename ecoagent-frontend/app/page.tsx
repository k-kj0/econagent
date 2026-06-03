
raw
Page · TSX
"use client";
import { useState, useEffect, useRef } from "react";
 
/* ── Palette ── */
const C = {
  bg: "#080d1a",
  sidebar: "rgba(14,20,38,0.95)",
  panel: "rgba(14,20,38,0.80)",
  border: "rgba(99,179,237,0.14)",
  primary: "#63b3ed",
  accent: "#76e4f7",
  danger: "#fc8181",
  warn: "#f6ad55",
  success: "#68d391",
  muted: "rgba(180,200,230,0.45)",
  fg: "#e2eaf7",
  fgDim: "rgba(226,234,247,0.65)",
};
 
/* ── Inflation data (historical + forecast) ── */
const INFLATION_DATA: Record<string, { years: number[]; actual: (number|null)[]; forecast: (number|null)[] }> = {
  india: { years:[2018,2019,2020,2021,2022,2023,2024,2025,2026], actual:[3.4,3.7,6.2,5.1,6.7,5.4,4.8,null,null], forecast:[null,null,null,null,null,null,null,4.2,3.9] },
  usa:   { years:[2018,2019,2020,2021,2022,2023,2024,2025,2026], actual:[2.4,1.8,1.2,4.7,8.0,3.4,2.9,null,null], forecast:[null,null,null,null,null,null,null,2.6,2.3] },
  china: { years:[2018,2019,2020,2021,2022,2023,2024,2025,2026], actual:[2.1,2.9,2.5,0.9,2.0,0.2,0.3,null,null], forecast:[null,null,null,null,null,null,null,0.8,1.2] },
  uk:    { years:[2018,2019,2020,2021,2022,2023,2024,2025,2026], actual:[2.5,1.8,0.9,2.5,9.1,6.8,2.5,null,null], forecast:[null,null,null,null,null,null,null,2.8,2.4] },
  europe:{ years:[2018,2019,2020,2021,2022,2023,2024,2025,2026], actual:[1.8,1.2,0.3,2.6,8.4,5.4,2.4,null,null], forecast:[null,null,null,null,null,null,null,2.2,1.9] },
  japan: { years:[2018,2019,2020,2021,2022,2023,2024,2025,2026], actual:[1.0,0.5,0.0,0.0,2.5,3.3,2.7,null,null], forecast:[null,null,null,null,null,null,null,2.1,1.8] },
  brazil:{ years:[2018,2019,2020,2021,2022,2023,2024,2025,2026], actual:[3.7,3.7,3.2,8.3,9.3,4.6,4.1,null,null], forecast:[null,null,null,null,null,null,null,4.5,4.0] },
};
 
/* ── Globe locations ── */
const COUNTRY_COORDS: Record<string, { lat: number; lon: number; label: string }> = {
  india:  { lat: 20.5937, lon: 78.9629, label: "INDIA" },
  usa:    { lat: 37.0902, lon: -95.7129, label: "USA" },
  china:  { lat: 35.8617, lon: 104.1954, label: "CHINA" },
  uk:     { lat: 55.3781, lon: -3.4360, label: "UK" },
  europe: { lat: 54.5260, lon: 15.2551, label: "EUROPE" },
  japan:  { lat: 36.2048, lon: 138.2529, label: "JAPAN" },
  brazil: { lat: -14.2350, lon: -51.9253, label: "BRAZIL" },
};
 
/* ── Inflation chart ── */
function InflationChart({ country }: { country: string }) {
  const data = INFLATION_DATA[country];
  if (!data) return null;
  const name = COUNTRY_COORDS[country]?.label || country.toUpperCase();
  const W = 500, H = 160, padL = 40, padR = 20, padT = 20, padB = 30;
  const allVals = [...(data.actual.filter(v => v !== null) as number[]), ...(data.forecast.filter(v => v !== null) as number[])];
  const maxV = Math.max(...allVals) + 1, minV = 0;
  const range = maxV - minV || 1;
  const xStep = (W - padL - padR) / (data.years.length - 1);
  const toX = (i: number) => padL + i * xStep;
  const toY = (v: number) => padT + (H - padT - padB) * (1 - (v - minV) / range);
 
  const actualPts = data.actual.map((v, i) => v !== null ? `${toX(i)},${toY(v)}` : null).filter(Boolean);
  const forecastStart = data.actual.findIndex((v, i) => v !== null && data.actual[i+1] === null);
  const bridgePts: string[] = [];
  if (forecastStart >= 0 && data.actual[forecastStart] !== null) {
    bridgePts.push(`${toX(forecastStart)},${toY(data.actual[forecastStart]!)}`);
  }
  const forecastPts = data.forecast.map((v, i) => v !== null ? `${toX(i)},${toY(v)}` : null).filter(Boolean);
  const allForecast = [...bridgePts, ...forecastPts];
 
  const currentActual = data.actual.filter(v => v !== null).slice(-1)[0] as number;
  const forecastEnd = data.forecast.filter(v => v !== null).slice(-1)[0] as number;
  const delta = forecastEnd - currentActual;
  const riskScore = Math.min(100, Math.round(Math.abs(delta) * 12 + currentActual * 6));
 
  return (
    <div style={{ background: "rgba(10,16,30,0.95)", border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginTop: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div>
          <div style={{ fontFamily: "monospace", fontSize: 9, color: C.accent, letterSpacing: "0.25em", marginBottom: 3 }}>PREDICTOR · V1 · HEADLINE CPI</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.fg }}>{name} · <em style={{ fontStyle: "italic", color: C.primary }}>Inflation Curve</em></div>
          <div style={{ fontFamily: "monospace", fontSize: 9, color: C.muted, marginTop: 2 }}>12-MONTH FORECAST · YOY %</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {[
            { label: "CURRENT YOY", val: `${currentActual.toFixed(2)}%`, color: C.fg },
            { label: "FORECAST", val: `${forecastEnd.toFixed(2)}%`, color: "#c3f53c" },
            { label: "Δ CHANGE", val: `${delta >= 0 ? "+" : ""}${delta.toFixed(2)}pp`, color: delta < 0 ? C.success : C.danger },
            { label: "RISK SCORE", val: `${riskScore}/100`, color: riskScore < 30 ? C.success : riskScore < 60 ? C.warn : C.danger },
          ].map(m => (
            <div key={m.label} style={{ textAlign: "center", background: "rgba(99,179,237,0.05)", border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", minWidth: 70 }}>
              <div style={{ fontFamily: "monospace", fontSize: 8, color: C.muted, letterSpacing: "0.15em" }}>{m.label}</div>
              <div style={{ fontFamily: "monospace", fontSize: 15, fontWeight: 700, color: m.color, marginTop: 4 }}>{m.val}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 16, marginBottom: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: "monospace", fontSize: 9, color: C.muted }}>
          <div style={{ width: 20, height: 2, background: C.primary }} /> ACTUAL
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: "monospace", fontSize: 9, color: C.muted }}>
          <div style={{ width: 20, height: 2, background: "#c3f53c", borderTop: "2px dashed #c3f53c" }} /> FORECAST
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 140, display: "block" }}>
        {/* Grid */}
        {[0, 2, 4, 6, 8, 10].map(v => (
          <g key={v}>
            <line x1={padL} y1={toY(v)} x2={W - padR} y2={toY(v)} stroke="rgba(99,179,237,0.08)" strokeWidth="1" />
            <text x={padL - 4} y={toY(v) + 4} textAnchor="end" fill="rgba(180,200,230,0.4)" fontSize="8" fontFamily="monospace">{v}%</text>
          </g>
        ))}
        {/* Year labels */}
        {data.years.map((yr, i) => (
          <text key={yr} x={toX(i)} y={H - 4} textAnchor="middle" fill="rgba(180,200,230,0.4)" fontSize="8" fontFamily="monospace">{yr}</text>
        ))}
        {/* Forecast zone */}
        {allForecast.length > 1 && (
          <path d={`M ${allForecast.join(" L ")} L ${W - padR},${H - padB} L ${toX(forecastStart)},${H - padB} Z`} fill="rgba(195,245,60,0.05)" />
        )}
        {/* Actual line */}
        {actualPts.length > 1 && (
          <polyline points={actualPts.join(" ")} fill="none" stroke={C.primary} strokeWidth="2" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 4px ${C.primary})` }} />
        )}
        {/* Forecast line */}
        {allForecast.length > 1 && (
          <polyline points={allForecast.join(" ")} fill="none" stroke="#c3f53c" strokeWidth="2" strokeDasharray="6 3" strokeLinecap="round" style={{ filter: "drop-shadow(0 0 4px #c3f53c)" }} />
        )}
        {/* Data dots */}
        {data.actual.map((v, i) => v !== null ? (
          <circle key={i} cx={toX(i)} cy={toY(v)} r="3" fill={C.primary} style={{ filter: `drop-shadow(0 0 4px ${C.primary})` }} />
        ) : null)}
        {data.forecast.map((v, i) => v !== null ? (
          <circle key={i} cx={toX(i)} cy={toY(v)} r="3" fill="#c3f53c" style={{ filter: "drop-shadow(0 0 4px #c3f53c)" }} />
        ) : null)}
      </svg>
    </div>
  );
}
 
/* ── Arc Reactor ── */
function ArcReactor({ isThinking }: { isThinking: boolean }) {
  const ticks = Array.from({ length: 60 }, (_, i) => i);
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
      {/* Outer ambient glow */}
      <div style={{ position: "absolute", width: "70%", height: "70%", borderRadius: "50%", background: "radial-gradient(circle, rgba(0,200,255,0.15) 0%, transparent 70%)", filter: "blur(20px)" }} />
      <svg viewBox="0 0 400 400" style={{ width: "min(90%, 380px)", height: "min(90%, 380px)", maxWidth: "100%", maxHeight: "100%", display: "block" }}>
        <defs>
          <filter id="ar-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="ar-glow-strong" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <radialGradient id="core-grad" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#00aaff" stopOpacity="0.9" />
            <stop offset="60%" stopColor="#0044aa" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#001a3a" stopOpacity="1" />
          </radialGradient>
          <radialGradient id="inner-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#003366" />
            <stop offset="100%" stopColor="#000d1a" />
          </radialGradient>
        </defs>
 
        {/* Outermost ring */}
        <circle cx="200" cy="200" r="192" fill="none" stroke="rgba(0,200,255,0.2)" strokeWidth="1" />
        <circle cx="200" cy="200" r="185" fill="none" stroke="rgba(0,200,255,0.12)" strokeWidth="0.5" />
 
        {/* Tick marks ring - rotates */}
        <g style={{ transformOrigin: "200px 200px", animation: "rotate-slow 12s linear infinite" }}>
          {ticks.map(i => {
            const isMajor = i % 5 === 0;
            const angle = (i * 360) / 60;
            const rad = angle * Math.PI / 180;
            const r1 = 178, r2 = isMajor ? 165 : 170;
            const x1 = 200 + r1 * Math.sin(rad), y1 = 200 - r1 * Math.cos(rad);
            const x2 = 200 + r2 * Math.sin(rad), y2 = 200 - r2 * Math.cos(rad);
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={isMajor ? "#00ccff" : "#006699"} strokeWidth={isMajor ? "2" : "1"} opacity={isMajor ? "0.9" : "0.5"} />;
          })}
        </g>
 
        {/* Outer dash ring */}
        <circle cx="200" cy="200" r="158" fill="none" stroke="rgba(0,180,255,0.35)" strokeWidth="1.5" strokeDasharray="4 6" style={{ transformOrigin: "200px 200px", animation: "rotate-fast-reverse 6s linear infinite" }} />
 
        {/* Segment arcs - the cyan arc segments */}
        {Array.from({ length: 8 }, (_, i) => {
          const startAngle = i * 45 - 90;
          const endAngle = startAngle + 38;
          const toRad = (d: number) => d * Math.PI / 180;
          const r = 148;
          const x1 = 200 + r * Math.cos(toRad(startAngle));
          const y1 = 200 + r * Math.sin(toRad(startAngle));
          const x2 = 200 + r * Math.cos(toRad(endAngle));
          const y2 = 200 + r * Math.sin(toRad(endAngle));
          return (
            <path key={i}
              d={`M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`}
              fill="none" stroke={isThinking ? "#00ffff" : "#00aacc"}
              strokeWidth={isThinking ? "8" : "6"} strokeLinecap="round"
              filter="url(#ar-glow)"
              style={{
                transformOrigin: "200px 200px",
                animation: `rotate-slow ${isThinking ? "3s" : "8s"} linear infinite`,
                opacity: isThinking ? 1 : 0.8,
              }}
            />
          );
        })}
 
        {/* Middle ring - pulses when thinking */}
        <circle cx="200" cy="200" r="118" fill="none"
          stroke={isThinking ? "#00ffff" : "rgba(0,200,255,0.5)"}
          strokeWidth={isThinking ? "3" : "1.5"}
          filter={isThinking ? "url(#ar-glow)" : undefined}
          style={isThinking ? { animation: "pulse-ring 0.9s ease-in-out infinite" } : {}}
        />
 
        {/* Inner counter-rotating dashed energy ring */}
        <g style={{ transformOrigin: "200px 200px", animation: `rotate-fast-reverse ${isThinking ? "1.5s" : "3s"} linear infinite` }}>
          <circle cx="200" cy="200" r="100" fill="none"
            stroke={isThinking ? "#00aaff" : "#0066cc"}
            strokeWidth="10" strokeDasharray="22 10" opacity="0.95"
            filter="url(#ar-glow)"
          />
        </g>
 
        {/* Inner triangle spokes (Jarvis look) */}
        {[0, 60, 120, 180, 240, 300].map(angle => {
          const rad = angle * Math.PI / 180;
          const r1 = 80, r2 = 50;
          return (
            <line key={angle}
              x1={200 + r1 * Math.sin(rad)} y1={200 - r1 * Math.cos(rad)}
              x2={200 + r2 * Math.sin(rad)} y2={200 - r2 * Math.cos(rad)}
              stroke="rgba(0,200,255,0.4)" strokeWidth="2"
              style={{ transformOrigin: "200px 200px", animation: "rotate-fast-reverse 4s linear infinite" }}
            />
          );
        })}
 
        {/* Inner hex ring */}
        <circle cx="200" cy="200" r="72" fill="none" stroke="rgba(0,150,200,0.4)" strokeWidth="1" strokeDasharray="2 4" />
 
        {/* Core background */}
        <circle cx="200" cy="200" r="58" fill="url(#inner-grad)" />
        <circle cx="200" cy="200" r="58" fill="none" stroke="rgba(0,200,255,0.6)" strokeWidth="2" filter="url(#ar-glow)" />
 
        {/* Core gradient fill */}
        <circle cx="200" cy="200" r="46" fill="url(#core-grad)" />
 
        {/* Center glowing dot */}
        <circle cx="200" cy="200" r={isThinking ? "16" : "12"} fill="#00aaff" filter="url(#ar-glow-strong)"
          style={isThinking ? { animation: "core-pulse 0.7s ease-in-out infinite" } : {}}
        />
        <circle cx="200" cy="200" r="6" fill="#aaeeff" />
      </svg>
    </div>
  );
}
 
/* ── Jarvis Globe (shows on country query) ── */
function JarvisGlobe({ country }: { country: string }) {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }).toUpperCase();
  const coords = COUNTRY_COORDS[country];
 
  const lonToX = (lon: number) => 200 + (lon / 180) * 160;
  const latToY = (lat: number) => 200 - (lat / 90) * 150;
  const pingX = coords ? lonToX(coords.lon) : 200;
  const pingY = coords ? latToY(coords.lat) : 200;
 
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", position: "relative" }}>
      <div style={{ fontFamily: "monospace", fontSize: 9, color: C.primary, letterSpacing: "0.25em", marginBottom: 4 }}>{dateStr}</div>
      <svg viewBox="0 0 400 400" style={{ width: "min(85%,350px)", height: "min(85%,350px)", maxWidth: "100%", maxHeight: "100%" }}>
        <defs>
          <radialGradient id="globe-bg" cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor="#1a4a7a" />
            <stop offset="50%" stopColor="#0a2245" />
            <stop offset="100%" stopColor="#040d1e" />
          </radialGradient>
          <radialGradient id="globe-atmo" cx="50%" cy="50%" r="50%">
            <stop offset="82%" stopColor="transparent" />
            <stop offset="100%" stopColor="rgba(0,180,255,0.35)" />
          </radialGradient>
          <filter id="globe-glow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <clipPath id="globe-clip"><circle cx="200" cy="200" r="158" /></clipPath>
        </defs>
 
        {/* Planet base */}
        <circle cx="200" cy="200" r="158" fill="url(#globe-bg)" />
 
        {/* Continent blobs */}
        <g fill="rgba(0,180,255,0.28)" clipPath="url(#globe-clip)">
          <path d="M105 130 Q128 112 150 125 T190 140 Q200 162 182 172 L155 165 Q130 158 105 130Z" />
          <path d="M220 155 Q252 147 268 170 T262 210 L240 204 Q222 188 220 155Z" />
          <path d="M130 198 Q158 190 172 212 T152 238 L138 232 Q118 220 130 198Z" />
          <path d="M245 108 Q268 101 274 120 L260 128 Q242 120 245 108Z" />
          <path d="M60 175 Q88 168 95 188 L80 198 Q58 194 60 175Z" />
          <path d="M170 250 Q195 245 205 262 L192 270 Q172 268 170 250Z" />
        </g>
 
        {/* Lat/lon grid */}
        {[30, 60, 90, 120, 150].map(r => (
          <ellipse key={`v${r}`} cx="200" cy="200" rx={r} ry="158" fill="none" stroke="rgba(0,180,255,0.12)" strokeWidth="0.6" />
        ))}
        {[30, 60, 90, 120, 150].map(r => (
          <ellipse key={`h${r}`} cx="200" cy="200" rx="158" ry={r} fill="none" stroke="rgba(0,180,255,0.09)" strokeWidth="0.6" />
        ))}
 
        {/* Atmosphere */}
        <circle cx="200" cy="200" r="158" fill="url(#globe-atmo)" />
        <circle cx="200" cy="200" r="158" fill="none" stroke="rgba(0,180,255,0.7)" strokeWidth="2" filter="url(#globe-glow)" />
 
        {/* Outer rings */}
        <circle cx="200" cy="200" r="170" fill="none" stroke="rgba(0,180,255,0.2)" strokeWidth="1" strokeDasharray="4 6" />
        <circle cx="200" cy="200" r="182" fill="none" stroke="rgba(0,180,255,0.1)" strokeWidth="0.5" />
 
        {/* Country ping */}
        {coords && (
          <g>
            <circle cx={pingX} cy={pingY} r="12" fill="rgba(0,255,255,0.08)" stroke="#00ffff" strokeWidth="1" style={{ animation: "ping 1.5s ease-out infinite" }} />
            <circle cx={pingX} cy={pingY} r="5" fill="#00ffff" filter="url(#globe-glow)" />
            <circle cx={pingX} cy={pingY} r="2.5" fill="white" />
            <text x={pingX + 8} y={pingY - 8} fill="#00ffff" fontSize="10" fontFamily="monospace" fontWeight="bold">{coords.label}</text>
          </g>
        )}
      </svg>
      <div style={{ fontFamily: "monospace", fontSize: 8, color: C.muted, letterSpacing: "0.2em", marginTop: 4 }}>
        {coords ? `LAT ${coords.lat.toFixed(2)}° · LON ${coords.lon.toFixed(2)}°` : "lat 0.000 · lon 0.000"}
      </div>
    </div>
  );
}
 
/* ── News card (full image) ── */
function NewsCard({ card, onClick }: { card: { headline: string; source: string; url: string; image: string; publishedAt?: string }; onClick?: () => void }) {
  const [imgErr, setImgErr] = useState(false);
  const ago = card.publishedAt ? new Date(card.publishedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "live";
  return (
    <article onClick={onClick} style={{ width: 240, flexShrink: 0, borderRadius: 10, overflow: "hidden", border: `1px solid ${C.border}`, background: "#0a1020", display: "flex", flexDirection: "column", cursor: "pointer", transition: "border-color 0.2s" }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(99,179,237,0.5)")}
      onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}>
      <div style={{ height: 110, overflow: "hidden", position: "relative", background: "#0d1a2e" }}>
        {card.image && !imgErr
          ? <img src={card.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.85 }} onError={() => setImgErr(true)} />
          : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, opacity: 0.3 }}>🌍</div>
        }
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(8,13,26,0.95) 0%, transparent 55%)" }} />
        <span style={{ position: "absolute", top: 7, left: 7, padding: "2px 6px", background: "rgba(8,13,26,0.85)", border: `1px solid rgba(99,179,237,0.4)`, borderRadius: 4, fontFamily: "monospace", fontSize: 8, textTransform: "uppercase" as const, letterSpacing: "0.2em", color: C.primary }}>{card.source}</span>
        <span style={{ position: "absolute", top: 7, right: 7, padding: "2px 6px", background: "rgba(252,129,129,0.15)", border: `1px solid rgba(252,129,129,0.4)`, borderRadius: 4, fontFamily: "monospace", fontSize: 8, textTransform: "uppercase" as const, color: C.danger }}>LIVE</span>
      </div>
      <div style={{ padding: "9px 11px", flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        <h3 style={{ fontSize: 12, lineHeight: 1.4, color: C.fg, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}>{card.headline}</h3>
        <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "monospace", fontSize: 9, color: C.muted }}>{ago}</span>
          <a href={card.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: 3, padding: "3px 7px", border: `1px solid rgba(99,179,237,0.4)`, borderRadius: 4, background: "rgba(99,179,237,0.08)", color: C.primary, fontFamily: "monospace", fontSize: 9, textTransform: "uppercase" as const, letterSpacing: "0.15em", cursor: "pointer", textDecoration: "none" }}>▶ Read</a>
        </div>
      </div>
    </article>
  );
}
 
/* ── WaveBar ── */
function WaveBar({ i, active }: { i: number; active: boolean }) {
  const h = active ? 12 + Math.abs(Math.sin(i * 0.8)) * 26 : 3;
  const col = i < 35 ? C.primary : C.accent;
  return <span style={{ display: "inline-block", width: 3, borderRadius: 2, background: col, boxShadow: active ? `0 0 4px ${col}` : "none", height: h, animation: active ? `wave ${0.8 + (i % 5) * 0.14}s ease-in-out ${(i * 0.05) % 1.2}s infinite alternate` : "none", verticalAlign: "middle", transition: "height 0.2s" }} />;
}
 
/* ── MAIN ── */
const LOCATION_KEYWORDS = ["india", "usa", "united states", "china", "uk", "united kingdom", "europe", "japan", "brazil"];
const INFLATION_KEYWORDS = ["inflation", "cpi", "price", "cost", "living", "economic", "economy", "gdp", "rate"];
 
interface EcoResponse {
  speech: string;
  countries: string[];
  prediction: string;
  sources: string[];
  newsCards: { headline: string; source: string; url: string; image: string; publishedAt?: string }[];
  ytLinks: { title: string; url: string; thumbnail: string }[];
  audioUrl: string;
}
 
interface ConvoItem { title: string; sources: number; time: string }
 
export default function EcoAgent() {
  const [sessionTime, setSessionTime] = useState(0);
  const [activeConvo, setActiveConvo] = useState(0);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [ecoData, setEcoData] = useState<EcoResponse | null>(null);
  const [ecoSpeech, setEcoSpeech] = useState("Say 'Hey Eco' or type below, Boss. Systems are online.");
  const [displayedSpeech, setDisplayedSpeech] = useState("Say 'Hey Eco' or type below, Boss. Systems are online.");
  const [detectedCountry, setDetectedCountry] = useState<string | null>(null);
  const [showInflation, setShowInflation] = useState(false);
  const [convos, setConvos] = useState<ConvoItem[]>([
    { title: "World markets today", sources: 5, time: "just now" },
    { title: "US inflation update", sources: 3, time: "5m ago" },
    { title: "Tech sector news", sources: 7, time: "12m ago" },
    { title: "Climate crisis latest", sources: 4, time: "25m ago" },
    { title: "Geopolitical tensions", sources: 9, time: "1h ago" },
  ]);
  const [history, setHistory] = useState<{ role: string; content: string }[]>([]);
  const typewriterRef = useRef<ReturnType<typeof setTimeout> | null>(null);
 
  useEffect(() => {
    const t = setInterval(() => setSessionTime(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
 
  const fmt = (s: number) => {
    const h = String(Math.floor(s / 3600)).padStart(2, "0");
    const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
    const sec = String(s % 60).padStart(2, "0");
    return `${h}:${m}:${sec}`;
  };
 
  async function typewrite(text: string) {
    if (typewriterRef.current) clearTimeout(typewriterRef.current);
    setDisplayedSpeech("");
    let i = 0;
    const step = () => {
      if (i <= text.length) {
        setDisplayedSpeech(text.slice(0, i));
        i++;
        typewriterRef.current = setTimeout(step, 18);
      }
    };
    step();
  }
 
  function detectContext(text: string) {
    const lower = text.toLowerCase();
    const country = LOCATION_KEYWORDS.find(k => lower.includes(k));
    const normalizedCountry = country === "united states" ? "usa" : country === "united kingdom" ? "uk" : country;
    const isInflation = INFLATION_KEYWORDS.some(k => lower.includes(k));
    return { country: normalizedCountry || null, isInflation };
  }
 
  async function askEco(text: string) {
    if (!text.trim()) return;
    setLoading(true);
    const { country, isInflation } = detectContext(text);
    setDetectedCountry(country);
    setShowInflation(!!(country && isInflation));
    const newHistory = [...history, { role: "user", content: text }];
    setHistory(newHistory);
    setConvos(prev => [{ title: text.length > 38 ? text.slice(0, 38) + "…" : text, sources: 0, time: "just now" }, ...prev.slice(0, 6)]);
    setActiveConvo(0);
 
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, history: newHistory.slice(-6) }),
        signal: AbortSignal.timeout(30000),
      });
      const data: EcoResponse = await res.json();
      setEcoData(data);
      setEcoSpeech(data.speech || "Boss, data received.");
      typewrite(data.speech || "Boss, data received.");
      setHistory(prev => [...prev, { role: "assistant", content: data.speech }]);
      setConvos(prev => { const updated = [...prev]; updated[0] = { ...updated[0], sources: data.sources?.length || 0 }; return updated; });
 
      if (data.audioUrl) {
        new Audio(data.audioUrl).play().catch(() => {});
      } else if (data.speech && typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(data.speech);
        u.rate = 0.9; u.pitch = 0.82;
        const voices = window.speechSynthesis.getVoices();
        const deep = voices.find(v => v.name.includes("Google UK English Male") || v.name.includes("Daniel"));
        if (deep) u.voice = deep;
        window.speechSynthesis.speak(u);
      }
    } catch {
      const errMsg = "Boss, connection timed out. Please try again.";
      setEcoSpeech(errMsg);
      typewrite(errMsg);
    } finally {
      setLoading(false);
    }
  }
 
  function tellMeMore() {
    const morePrompt = "Tell me more details about this topic, Boss needs the full picture.";
    askEco(morePrompt);
  }
 
  function startListening() {
    const SR = (window as { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition
      || (window as { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition;
    if (!SR) { alert("Use Chrome for voice features"); return; }
    const rec = new SR();
    rec.lang = "en-US"; rec.interimResults = false;
    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onresult = (e: SpeechRecognitionEvent) => {
      const t = e.results[0][0].transcript;
      setQuery(t);
      askEco(t);
    };
    rec.onerror = () => setListening(false);
    rec.start();
  }
 
  const showGlobe = !!detectedCountry;
  const showArcReactor = !showGlobe;
 
  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw", overflow: "hidden", background: C.bg, color: C.fg, fontFamily: "system-ui, sans-serif" }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(1.8)} }
        @keyframes ping { 0%{transform:scale(1);opacity:0.8} 100%{transform:scale(2.8);opacity:0} }
        @keyframes wave { from{transform:scaleY(0.3)} to{transform:scaleY(1)} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.2} }
        @keyframes rotate-slow { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes rotate-fast-reverse { from{transform:rotate(360deg)} to{transform:rotate(0deg)} }
        @keyframes pulse-ring { 0%,100%{opacity:0.6;stroke-width:1.5} 50%{opacity:1;stroke-width:4;filter:drop-shadow(0 0 10px #00ffff)} }
        @keyframes core-pulse { 0%,100%{r:12;opacity:0.9} 50%{r:18;opacity:0.5} }
        ::-webkit-scrollbar{width:3px;height:3px}
        ::-webkit-scrollbar-thumb{background:rgba(99,179,237,0.2);border-radius:2px}
        ::-webkit-scrollbar-track{background:transparent}
      `}</style>
 
      {/* SIDEBAR */}
      <aside style={{ width: 240, flexShrink: 0, display: "flex", flexDirection: "column", borderRight: `1px solid ${C.border}`, background: C.sidebar, height: "100vh", overflow: "hidden" }}>
        <div style={{ padding: "16px 18px 12px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, display: "grid", placeItems: "center", background: `linear-gradient(135deg, ${C.primary}, ${C.accent})`, boxShadow: `0 0 16px rgba(99,179,237,0.4)` }}>
              <span style={{ fontSize: 15 }}>✦</span>
            </div>
            <div>
              <div style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 17, letterSpacing: "0.3em", color: C.primary, textShadow: `0 0 10px ${C.primary}` }}>ECO</div>
              <div style={{ fontFamily: "monospace", fontSize: 8, letterSpacing: "0.25em", color: C.muted, textTransform: "uppercase" }}>agent v2.4</div>
            </div>
          </div>
        </div>
        <div style={{ padding: "10px 16px 6px", fontFamily: "monospace", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.25em", color: C.muted }}>Conversations</div>
        <div style={{ flex: 1, overflowY: "auto", padding: "0 8px 10px" }}>
          {convos.map((c, i) => (
            <button key={i} onClick={() => setActiveConvo(i)} style={{ display: "flex", width: "100%", alignItems: "flex-start", gap: 7, padding: "8px 10px", borderRadius: 7, border: i === activeConvo ? `1px solid rgba(99,179,237,0.4)` : "1px solid transparent", background: i === activeConvo ? "rgba(99,179,237,0.1)" : "transparent", cursor: "pointer", textAlign: "left", marginBottom: 2, transition: "all 0.15s" }}>
              <span style={{ color: i === activeConvo ? C.primary : C.muted, marginTop: 2, flexShrink: 0, fontSize: 11 }}>◻</span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 12, color: i === activeConvo ? C.fg : C.fgDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</div>
                <div style={{ fontFamily: "monospace", fontSize: 9, color: C.muted }}>{c.sources > 0 ? `${c.sources} sources · ` : ""}{c.time}</div>
              </div>
              {i === activeConvo && <div style={{ width: 5, height: 5, borderRadius: "50%", background: C.primary, boxShadow: `0 0 7px ${C.primary}`, marginTop: 7, flexShrink: 0, animation: "blink 1.5s ease-in-out infinite" }} />}
            </button>
          ))}
        </div>
        <div style={{ padding: "11px 14px", borderTop: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ width: 30, height: 30, borderRadius: "50%", background: `linear-gradient(135deg, ${C.accent}, ${C.primary})`, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Commander</div>
            <div style={{ fontFamily: "monospace", fontSize: 9, color: C.muted }}>clearance · L4</div>
          </div>
          <span style={{ color: C.muted, fontSize: 13, cursor: "pointer" }}>⚙</span>
        </div>
      </aside>
 
      {/* MAIN */}
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, overflow: "hidden" }}>
 
        {/* TOP BAR */}
        <header style={{ height: 52, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 18px", borderBottom: `1px solid ${C.border}`, background: "rgba(8,12,24,0.9)", backdropFilter: "blur(20px)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ position: "relative", width: 7, height: 7 }}>
                <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: C.danger, animation: "ping 1.4s ease-out infinite", opacity: 0.5 }} />
                <div style={{ position: "relative", width: 7, height: 7, borderRadius: "50%", background: C.danger, boxShadow: `0 0 7px ${C.danger}` }} />
              </div>
              <span style={{ fontFamily: "monospace", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.3em", color: C.danger }}>LIVE</span>
            </div>
            <div style={{ width: 1, height: 18, background: C.border }} />
            <div style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
              <span style={{ fontFamily: "monospace", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.2em", color: C.muted }}>SESSION</span>
              <span style={{ fontFamily: "monospace", fontSize: 13, color: C.fg }}>{fmt(sessionTime)}</span>
            </div>
            <div style={{ width: 1, height: 18, background: C.border }} />
            <span style={{ fontFamily: "monospace", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.15em", color: C.muted }}>⬡ eco-orion · 0.42ms</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {loading && <span style={{ fontFamily: "monospace", fontSize: 9, color: C.accent, letterSpacing: "0.2em", animation: "blink 0.7s ease-in-out infinite" }}>PROCESSING...</span>}
            <button style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 7, border: `1px solid rgba(118,228,247,0.4)`, background: "rgba(118,228,247,0.08)", color: C.accent, cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "monospace" }}>♛ BOSS MODE</button>
          </div>
        </header>
 
        {/* CONTENT */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden", paddingBottom: 76 }}>
 
          {/* CENTER */}
          <main style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, padding: 14, minWidth: 0, overflow: "hidden" }}>
 
            {/* CENTER VISUAL */}
            <section style={{ flex: "0 0 auto", height: "clamp(220px, 45vh, 340px)", position: "relative", borderRadius: 14, overflow: "hidden", background: C.panel, border: `1px solid ${C.border}` }}>
              {showArcReactor && <ArcReactor isThinking={loading} />}
              {showGlobe && <JarvisGlobe country={detectedCountry!} />}
              <div style={{ position: "absolute", top: 12, left: 12, fontFamily: "monospace", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.2em", color: "rgba(99,179,237,0.6)", pointerEvents: "none" }}>
                <div>{showGlobe ? `// ${(COUNTRY_COORDS[detectedCountry!]?.label || "")} INTEL` : "// GLOBAL FEED"}</div>
              </div>
              {showGlobe && (
                <div style={{ position: "absolute", top: 12, right: 12, fontFamily: "monospace", fontSize: 9, color: C.muted }}>
                  {ecoData?.countries?.length ? ecoData.countries.join(" · ") : ""}
                </div>
              )}
            </section>
 
            {/* INFLATION CHART */}
            {showInflation && detectedCountry && INFLATION_DATA[detectedCountry] && (
              <InflationChart country={detectedCountry} />
            )}
 
            {/* NEWS FEED */}
            <section style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 3px 7px" }}>
                <span style={{ fontFamily: "monospace", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.28em", color: C.primary }}>// Intel feed</span>
                <span style={{ fontFamily: "monospace", fontSize: 9, color: C.muted, letterSpacing: "0.15em" }}>scroll →</span>
              </div>
              <div style={{ display: "flex", gap: 10, overflowX: "auto", flex: 1, paddingBottom: 6 }}>
                {(ecoData?.newsCards?.length ? ecoData.newsCards : []).map((card, i) => (
                  <NewsCard key={i} card={card} />
                ))}
                {(!ecoData?.newsCards?.length) && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", color: C.muted, fontFamily: "monospace", fontSize: 11, letterSpacing: "0.2em" }}>
                    AWAITING INTEL... TYPE A QUERY TO FETCH LIVE NEWS
                  </div>
                )}
              </div>
            </section>
          </main>
 
          {/* RIGHT PANEL */}
          <aside style={{ width: 290, flexShrink: 0, display: "flex", flexDirection: "column", borderLeft: `1px solid ${C.border}`, background: C.sidebar, padding: 14, overflowY: "auto", gap: 10 }}>
            <div style={{ fontFamily: "monospace", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.3em", color: C.primary }}>// Live readout</div>
 
            {/* ECO SPEECH */}
            <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 13px" }}>
              <div style={{ fontFamily: "monospace", fontSize: 8, textTransform: "uppercase", letterSpacing: "0.2em", color: C.muted, marginBottom: 6 }}>ECO SAYS</div>
              <div style={{ fontSize: 12, lineHeight: 1.75, color: C.fg, minHeight: 48 }}>
                {displayedSpeech}
                {loading && <span style={{ animation: "blink 0.6s ease-in-out infinite", color: C.accent }}>▌</span>}
              </div>
            </div>
 
            {/* TELL ME MORE */}
            <button onClick={tellMeMore} disabled={loading || !ecoData} style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid rgba(118,228,247,0.35)`, background: "rgba(118,228,247,0.07)", color: C.accent, cursor: loading ? "not-allowed" : "pointer", fontFamily: "monospace", fontSize: 10, letterSpacing: "0.2em", opacity: (!ecoData || loading) ? 0.4 : 1, transition: "all 0.2s" }}>
              ▶ TELL ME MORE
            </button>
 
            {/* PREDICTION */}
            {ecoData?.prediction && (
              <div style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.25)", borderRadius: 10, padding: "11px 13px" }}>
                <div style={{ fontFamily: "monospace", fontSize: 8, textTransform: "uppercase", letterSpacing: "0.2em", color: "rgba(167,139,250,0.7)", marginBottom: 6 }}>ECO PREDICTION</div>
                <div style={{ fontSize: 11, lineHeight: 1.65, color: "rgba(196,181,253,0.85)" }}>{ecoData.prediction}</div>
              </div>
            )}
 
            {/* COUNTRIES */}
            {ecoData?.countries && ecoData.countries.length > 0 && (
              <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: "11px 13px" }}>
                <div style={{ fontFamily: "monospace", fontSize: 8, textTransform: "uppercase", letterSpacing: "0.2em", color: C.muted, marginBottom: 8 }}>REGIONS ACTIVE</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {ecoData.countries.map((c, i) => (
                    <span key={i} style={{ fontSize: 9, padding: "3px 7px", borderRadius: 4, border: `1px solid rgba(99,179,237,0.4)`, color: C.primary, letterSpacing: "0.15em", fontFamily: "monospace" }}>{c}</span>
                  ))}
                </div>
              </div>
            )}
 
            {/* SOURCES */}
            <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: "11px 13px" }}>
              <div style={{ fontFamily: "monospace", fontSize: 8, textTransform: "uppercase", letterSpacing: "0.2em", color: C.muted, marginBottom: 7 }}>Citations</div>
              {(ecoData?.sources?.length ? ecoData.sources : ["Awaiting query..."]).map((c, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                  <span style={{ fontFamily: "monospace", fontSize: 10, color: "rgba(99,179,237,0.75)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>[{i + 1}] {c}</span>
                  <span style={{ color: C.muted, marginLeft: 4, flexShrink: 0, fontSize: 10 }}>↗</span>
                </div>
              ))}
            </div>
 
            {/* YT LINKS */}
            {ecoData?.ytLinks && ecoData.ytLinks.length > 0 && (
              <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: "11px 13px" }}>
                <div style={{ fontFamily: "monospace", fontSize: 8, textTransform: "uppercase", letterSpacing: "0.2em", color: C.muted, marginBottom: 7 }}>Video Intel</div>
                {ecoData.ytLinks.slice(0, 3).map((yt, i) => (
                  <a key={i} href={yt.url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", gap: 8, marginBottom: 8, textDecoration: "none", color: C.fgDim, alignItems: "center" }}>
                    <img src={yt.thumbnail} alt="" style={{ width: 50, height: 36, objectFit: "cover", borderRadius: 4, flexShrink: 0 }} />
                    <div style={{ fontSize: 10, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}>{yt.title}</div>
                  </a>
                ))}
              </div>
            )}
          </aside>
        </div>
      </div>
 
      {/* VOICE BAR */}
      <div style={{ position: "fixed", bottom: 0, left: 240, right: 0, zIndex: 30, borderTop: `1px solid ${C.border}`, background: "rgba(5,9,20,0.97)", backdropFilter: "blur(20px)", height: 72, display: "flex", alignItems: "center", gap: 14, padding: "0 18px" }}>
        <button onClick={startListening} style={{ width: 46, height: 46, borderRadius: "50%", flexShrink: 0, background: listening ? `linear-gradient(135deg, ${C.danger}, ${C.warn})` : `linear-gradient(135deg, ${C.primary}, ${C.accent})`, border: "none", cursor: "pointer", display: "grid", placeItems: "center", boxShadow: `0 0 18px ${listening ? "rgba(252,129,129,0.5)" : "rgba(99,179,237,0.4)"}`, fontSize: 18, transition: "all 0.2s" }}>🎙</button>
        <div style={{ display: "flex", flex: 1, alignItems: "center", gap: "2px", height: 36, overflow: "hidden" }}>
          {Array.from({ length: 55 }, (_, i) => <WaveBar key={i} i={i} active={listening || loading} />)}
        </div>
        <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && query.trim()) { askEco(query); setQuery(""); } }} placeholder='Type or say "Hey Eco, tell me about India inflation"...' style={{ width: 320, padding: "9px 14px", borderRadius: 8, border: `1px solid rgba(99,179,237,0.28)`, background: "rgba(99,179,237,0.05)", color: C.fg, fontSize: 12, outline: "none", fontFamily: "monospace" }} />
        <button onClick={() => { if (query.trim()) { askEco(query); setQuery(""); } }} style={{ padding: "9px 18px", borderRadius: 8, border: `1px solid rgba(99,179,237,0.4)`, background: "rgba(99,179,237,0.1)", color: C.primary, fontSize: 10, letterSpacing: "0.2em", cursor: "pointer", fontFamily: "monospace", flexShrink: 0 }}>SEND</button>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontFamily: "monospace", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.22em", color: listening ? C.danger : C.primary }}>
            {listening ? "LISTENING..." : <><span style={{ color: C.fg }}>Hey Eco...</span> listening</>}
          </div>
          <div style={{ fontFamily: "monospace", fontSize: 9, color: C.muted }}>press Enter or click mic</div>
        </div>
      </div>
    </div>
  );
}
 
