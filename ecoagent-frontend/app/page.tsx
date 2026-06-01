'use client';
 
import { useState, useRef, useEffect, useCallback } from 'react';
 
// ────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────
interface Message {
  role: 'user' | 'assistant';
  content: string;
}
 
interface NewsCard {
  id: string;
  category: string;
  headline: string;
  source: string;
  lat: number;
  lon: number;
}
 
interface InflationPoint {
  year: string;
  value: number;
  forecast?: boolean;
}
 
// ────────────────────────────────────────────────
// Arc Reactor Component (Iron Man style)
// ────────────────────────────────────────────────
function ArcReactor({ isThinking }: { isThinking: boolean }) {
  return (
    <div className="flex items-center justify-center w-full h-full">
      <svg
        viewBox="0 0 300 300"
        className={`w-72 h-72 ${isThinking ? 'thinking' : ''}`}
        style={{ filter: 'drop-shadow(0 0 18px rgba(0,212,255,0.4))' }}
      >
        <defs>
          <filter id="glow-filter">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="inner-glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="core-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#00eeff" stopOpacity="1" />
            <stop offset="60%"  stopColor="#0080cc" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#003366" stopOpacity="0.6" />
          </radialGradient>
          <radialGradient id="center-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="50%"  stopColor="#00ddff" stopOpacity="1" />
            <stop offset="100%" stopColor="#0055aa" stopOpacity="0.8" />
          </radialGradient>
        </defs>
 
        {/* Outermost decorative ring – breathes slowly */}
        <circle
          cx="150" cy="150" r="145"
          fill="none"
          stroke="#00ffff"
          strokeWidth="0.5"
          opacity="0.2"
          className="outer-breathe"
        />
 
        {/* Outer ring with tick marks – rotates clockwise */}
        <g className="rotate-slow">
          {Array.from({ length: 60 }).map((_, i) => {
            const isMajor = i % 5 === 0;
            const isMed   = i % 5 === 2;
            const y2 = isMajor ? '32' : isMed ? '26' : '22';
            return (
              <line
                key={i}
                x1="150" y1="16"
                x2="150" y2={y2}
                stroke="#00ffff"
                strokeWidth={isMajor ? '2' : '1'}
                opacity={isMajor ? '0.9' : '0.4'}
                transform={`rotate(${i * 6} 150 150)`}
              />
            );
          })}
          {/* Outer solid ring */}
          <circle cx="150" cy="150" r="134" fill="none" stroke="#00ccee" strokeWidth="1" opacity="0.3" />
        </g>
 
        {/* Second ring – outer data display ring */}
        <circle
          cx="150" cy="150" r="118"
          fill="none"
          stroke="#00aacc"
          strokeWidth="1"
          strokeDasharray="8 4"
          opacity="0.4"
        />
 
        {/* Third ring – middle ring, pulses when thinking */}
        <circle
          cx="150" cy="150" r="100"
          fill="none"
          stroke="#00ffff"
          strokeWidth="2"
          className="pulse-ring"
          opacity="0.7"
          style={{ filter: isThinking ? 'drop-shadow(0 0 8px #00ffff)' : 'none' }}
        />
 
        {/* Segmented arc ring */}
        {Array.from({ length: 12 }).map((_, i) => {
          const startAngle = i * 30 - 86;
          const endAngle   = startAngle + 24;
          const r = 88;
          const s = (a: number) => [
            150 + r * Math.cos((a * Math.PI) / 180),
            150 + r * Math.sin((a * Math.PI) / 180),
          ];
          const [x1, y1] = s(startAngle);
          const [x2, y2] = s(endAngle);
          return (
            <path
              key={i}
              d={`M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`}
              fill="none"
              stroke="#00ddff"
              strokeWidth="4"
              strokeLinecap="round"
              opacity={i % 3 === 0 ? '0.8' : '0.3'}
            />
          );
        })}
 
        {/* Inner energy ring – counter-rotates fast */}
        <g className="rotate-fast-reverse">
          <circle
            cx="150" cy="150" r="68"
            fill="none"
            stroke="#0088ff"
            strokeWidth="8"
            strokeDasharray="18 6"
            opacity="0.85"
            filter="url(#glow-filter)"
          />
          {/* Small accent dots on the ring */}
          {[0, 90, 180, 270].map((angle, i) => {
            const rad = (angle * Math.PI) / 180;
            const x = 150 + 68 * Math.cos(rad);
            const y = 150 + 68 * Math.sin(rad);
            return <circle key={i} cx={x} cy={y} r="4" fill="#00ccff" opacity="0.9" />;
          })}
        </g>
 
        {/* Center housing ring */}
        <circle cx="150" cy="150" r="48" fill="#001a2e" stroke="#00ffff" strokeWidth="2" opacity="0.9" />
        <circle cx="150" cy="150" r="44" fill="none" stroke="#0044aa" strokeWidth="1" opacity="0.6" />
 
        {/* Inner core gradient fill */}
        <circle cx="150" cy="150" r="38" fill="url(#core-grad)" />
 
        {/* Triangular spokes (Iron Man style) */}
        {[0, 120, 240].map((angle, i) => {
          const rad = (angle * Math.PI) / 180;
          const x1_ = 150 + 12 * Math.cos(rad);
          const y1_ = 150 + 12 * Math.sin(rad);
          const x2_ = 150 + 36 * Math.cos(rad - 0.5);
          const y2_ = 150 + 36 * Math.sin(rad - 0.5);
          const x3_ = 150 + 36 * Math.cos(rad + 0.5);
          const y3_ = 150 + 36 * Math.sin(rad + 0.5);
          return (
            <polygon
              key={i}
              points={`${x1_},${y1_} ${x2_},${y2_} ${x3_},${y3_}`}
              fill="#00aaff"
              opacity="0.6"
            />
          );
        })}
 
        {/* Center bright dot – pulses when thinking */}
        <circle
          cx="150" cy="150" r="10"
          fill="url(#center-grad)"
          className="core-dot"
          filter="url(#inner-glow)"
        />
        <circle cx="150" cy="150" r="4" fill="white" opacity="0.95" />
      </svg>
    </div>
  );
}
 
// ────────────────────────────────────────────────
// Inflation Chart Component (InflationIQ-style)
// ────────────────────────────────────────────────
function InflationChart({ country, data }: { country: string; data: InflationPoint[] }) {
  if (!data.length) return null;
 
  const W = 600, H = 180, PAD = { top: 20, right: 20, bottom: 36, left: 44 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
 
  const vals  = data.map(d => d.value);
  const minV  = Math.min(...vals) - 0.5;
  const maxV  = Math.max(...vals) + 0.5;
  const range = maxV - minV || 1;
 
  const xPos = (i: number) => PAD.left + (i / (data.length - 1)) * innerW;
  const yPos = (v: number) => PAD.top + innerH - ((v - minV) / range) * innerH;
 
  const actualPoints  = data.filter(d => !d.forecast);
  const forecastPoints = data.filter(d => d.forecast);
  const splitIdx      = data.findIndex(d => d.forecast);
 
  const toPath = (pts: InflationPoint[], startIdx: number) =>
    pts
      .map((d, i) => {
        const gi = startIdx + i;
        return `${i === 0 ? 'M' : 'L'} ${xPos(gi)} ${yPos(d.value)}`;
      })
      .join(' ');
 
  const actualPath   = toPath(actualPoints, 0);
  const forecastPath = splitIdx >= 0
    ? `M ${xPos(splitIdx - 1)} ${yPos(data[splitIdx - 1].value)} ` + toPath(forecastPoints, splitIdx)
    : '';
 
  // area fill under actual line
  const areaPath =
    actualPath +
    ` L ${xPos(actualPoints.length - 1)} ${PAD.top + innerH}` +
    ` L ${PAD.left} ${PAD.top + innerH} Z`;
 
  // y-axis grid
  const gridLines = 4;
 
  return (
    <div className="slide-up glass rounded-xl p-4 mx-4 mb-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-[10px] text-cyan-500 tracking-widest uppercase">Inflation Curve</span>
          <div className="text-sm font-bold text-white mt-0.5">
            {country.toUpperCase()} · CPI YoY %
          </div>
        </div>
        <div className="flex gap-4 text-[10px]">
          <span className="flex items-center gap-1 text-gray-400">
            <span className="inline-block w-5 h-0.5 bg-cyan-400" /> Actual
          </span>
          <span className="flex items-center gap-1 text-gray-400">
            <span className="inline-block w-5 h-0.5 bg-yellow-400 border-dashed" style={{ borderTop: '2px dashed #facc15', height: 0, background: 'none' }} /> Forecast
          </span>
        </div>
      </div>
 
      {/* SVG Chart */}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 160 }}>
        {/* Grid */}
        {Array.from({ length: gridLines + 1 }).map((_, i) => {
          const y = PAD.top + (i / gridLines) * innerH;
          const v = maxV - (i / gridLines) * range;
          return (
            <g key={i}>
              <line x1={PAD.left} y1={y} x2={PAD.left + innerW} y2={y} className="chart-grid-line" />
              <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize="9" fill="rgba(0,212,255,0.5)" fontFamily="monospace">
                {v.toFixed(1)}%
              </text>
            </g>
          );
        })}
 
        {/* Area fill under actual */}
        <path d={areaPath} fill="rgba(0,212,255,0.06)" />
 
        {/* Actual line */}
        <path d={actualPath} fill="none" stroke="#00d4ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
 
        {/* Forecast line (dashed yellow) */}
        {forecastPath && (
          <path d={forecastPath} fill="none" stroke="#facc15" strokeWidth="1.5" strokeDasharray="5 3" strokeLinecap="round" strokeLinejoin="round" />
        )}
 
        {/* Data dots */}
        {data.map((d, i) => (
          <circle
            key={i}
            cx={xPos(i)}
            cy={yPos(d.value)}
            r={d.forecast ? 2.5 : 3.5}
            fill={d.forecast ? '#facc15' : '#00d4ff'}
            opacity={d.forecast ? 0.7 : 1}
          />
        ))}
 
        {/* Split line */}
        {splitIdx > 0 && (
          <line
            x1={xPos(splitIdx)} y1={PAD.top}
            x2={xPos(splitIdx)} y2={PAD.top + innerH}
            stroke="rgba(250,204,21,0.3)"
            strokeDasharray="3 3"
            strokeWidth="1"
          />
        )}
 
        {/* X-axis labels */}
        {data
          .filter((_, i) => i % Math.ceil(data.length / 8) === 0 || i === data.length - 1)
          .map((d, _i) => {
            const gi = data.findIndex(x => x.year === d.year);
            return (
              <text
                key={d.year}
                x={xPos(gi)}
                y={H - 6}
                textAnchor="middle"
                fontSize="8"
                fill="rgba(0,212,255,0.45)"
                fontFamily="monospace"
              >
                {d.year}
              </text>
            );
          })}
      </svg>
    </div>
  );
}
 
// ────────────────────────────────────────────────
// Globe SVG (Jarvis-style, minimal – just the globe + date)
// ────────────────────────────────────────────────
function GlobeDisplay({ highlightCountry, newsCards }: { highlightCountry?: string; newsCards: NewsCard[] }) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase();
 
  // Country approximate center coordinates → SVG position mapping (very simplified Mercator-ish)
  const countryDots: Record<string, { x: number; y: number; label: string }> = {
    india:   { x: 370, y: 195, label: 'INDIA' },
    usa:     { x: 195, y: 165, label: 'USA' },
    china:   { x: 400, y: 175, label: 'CHINA' },
    uk:      { x: 285, y: 135, label: 'UK' },
    europe:  { x: 300, y: 140, label: 'EUROPE' },
    japan:   { x: 430, y: 168, label: 'JAPAN' },
    brazil:  { x: 245, y: 245, label: 'BRAZIL' },
    germany: { x: 300, y: 138, label: 'GERMANY' },
    france:  { x: 292, y: 145, label: 'FRANCE' },
    russia:  { x: 370, y: 120, label: 'RUSSIA' },
    australia:{ x: 430, y: 265, label: 'AUSTRALIA' },
    canada:  { x: 190, y: 120, label: 'CANADA' },
    mexico:  { x: 185, y: 190, label: 'MEXICO' },
  };
 
  const highlight = highlightCountry ? countryDots[highlightCountry.toLowerCase()] : null;
 
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <svg viewBox="0 0 580 400" className="w-full h-full" style={{ maxHeight: 340 }}>
        <defs>
          <radialGradient id="globe-grad" cx="40%" cy="35%" r="60%">
            <stop offset="0%"   stopColor="#0a2a4a" />
            <stop offset="50%"  stopColor="#051525" />
            <stop offset="100%" stopColor="#020d18" />
          </radialGradient>
          <radialGradient id="globe-glow" cx="50%" cy="50%" r="50%">
            <stop offset="60%"  stopColor="transparent" />
            <stop offset="100%" stopColor="rgba(0,200,255,0.12)" />
          </radialGradient>
          <clipPath id="globe-clip">
            <circle cx="290" cy="200" r="175" />
          </clipPath>
        </defs>
 
        {/* Outer glow ring */}
        <circle cx="290" cy="200" r="178" fill="url(#globe-glow)" />
        <circle cx="290" cy="200" r="176" fill="none" stroke="#00ccff" strokeWidth="1.5" opacity="0.4" />
        <circle cx="290" cy="200" r="180" fill="none" stroke="#004466" strokeWidth="1" opacity="0.3" />
 
        {/* Globe base */}
        <circle cx="290" cy="200" r="175" fill="url(#globe-grad)" />
 
        {/* Latitude lines */}
        {[-60, -30, 0, 30, 60].map((lat, i) => {
          const y = 200 + (lat / 90) * 175;
          const halfW = Math.sqrt(Math.max(0, 175 * 175 - (y - 200) ** 2));
          return halfW > 5 ? (
            <ellipse
              key={i}
              cx="290" cy={y}
              rx={halfW} ry={halfW * 0.15}
              fill="none"
              stroke="#004466"
              strokeWidth="0.5"
              opacity="0.5"
            />
          ) : null;
        })}
 
        {/* Longitude lines */}
        {[0, 30, 60, 90, 120, 150].map((lon, i) => (
          <ellipse
            key={i}
            cx="290" cy="200"
            rx={Math.abs(Math.cos((lon * Math.PI) / 180)) * 175}
            ry="175"
            fill="none"
            stroke="#004466"
            strokeWidth="0.5"
            opacity="0.4"
          />
        ))}
 
        {/* Continent blobs (simplified) */}
        <g clipPath="url(#globe-clip)" opacity="0.7">
          {/* North America */}
          <path d="M150 130 Q170 120 200 130 Q220 140 225 160 Q220 185 205 195 Q185 200 170 190 Q150 175 145 155 Z"
            fill="#0a3a5a" stroke="#00aacc" strokeWidth="0.8" />
          {/* South America */}
          <path d="M200 215 Q225 210 240 230 Q248 255 240 280 Q228 300 210 295 Q195 280 190 255 Q185 230 200 215 Z"
            fill="#0a3a5a" stroke="#00aacc" strokeWidth="0.8" />
          {/* Europe */}
          <path d="M275 120 Q295 115 310 125 Q318 135 315 148 Q305 155 290 152 Q275 145 272 132 Z"
            fill="#0a3a5a" stroke="#00aacc" strokeWidth="0.8" />
          {/* Africa */}
          <path d="M285 155 Q310 150 322 168 Q328 190 325 220 Q318 245 305 252 Q290 250 280 232 Q272 210 272 188 Q272 165 285 155 Z"
            fill="#0a3a5a" stroke="#00aacc" strokeWidth="0.8" />
          {/* Asia */}
          <path d="M320 115 Q360 108 400 118 Q430 128 440 148 Q445 168 435 180 Q415 188 385 185 Q355 182 332 168 Q315 155 318 135 Z"
            fill="#0a3a5a" stroke="#00aacc" strokeWidth="0.8" />
          {/* Australia */}
          <path d="M400 245 Q430 240 445 255 Q455 268 450 282 Q438 290 420 288 Q405 282 398 268 Q394 255 400 245 Z"
            fill="#0a3a5a" stroke="#00aacc" strokeWidth="0.8" />
        </g>
 
        {/* Highlight ring for selected country */}
        {highlight && (
          <>
            <circle cx={highlight.x} cy={highlight.y} r="12" fill="none" stroke="#00ffff" strokeWidth="1.5" opacity="0.6">
              <animate attributeName="r" from="12" to="22" dur="1.5s" repeatCount="indefinite" />
              <animate attributeName="opacity" from="0.6" to="0" dur="1.5s" repeatCount="indefinite" />
            </circle>
            <circle cx={highlight.x} cy={highlight.y} r="5" fill="#00ffff" opacity="0.9" />
            <text x={highlight.x + 10} y={highlight.y - 8} fontSize="9" fill="#00ffff" fontFamily="monospace" fontWeight="bold" opacity="0.9">
              {highlight.label}
            </text>
          </>
        )}
 
        {/* News card pins */}
        {newsCards.slice(0, 3).map((card, i) => {
          const dot = countryDots[card.id] || { x: 290, y: 200 };
          return (
            <g key={card.id}>
              <circle cx={dot.x} cy={dot.y} r="4" fill="#facc15" opacity="0.9" />
              <line x1={dot.x} y1={dot.y} x2={dot.x + (i % 2 === 0 ? 30 : -30)} y2={dot.y - 20} stroke="rgba(250,204,21,0.4)" strokeWidth="0.8" />
            </g>
          );
        })}
      </svg>
 
      {/* Date label below globe */}
      <div
        className="absolute bottom-2 left-0 right-0 text-center text-[9px] tracking-widest"
        style={{ color: 'rgba(0,200,255,0.5)', fontFamily: 'monospace' }}
      >
        {dateStr}
      </div>
    </div>
  );
}
 
// ────────────────────────────────────────────────
// Inflation historical data (static fallback)
// ────────────────────────────────────────────────
const INFLATION_DATA: Record<string, InflationPoint[]> = {
  india: [
    { year: '2018', value: 3.4 }, { year: '2019', value: 3.7 }, { year: '2020', value: 6.2 },
    { year: '2021', value: 5.5 }, { year: '2022', value: 6.7 }, { year: '2023', value: 5.4 },
    { year: '2024', value: 4.8 }, { year: '2025', value: 4.2, forecast: true }, { year: '2026', value: 3.9, forecast: true },
  ],
  usa: [
    { year: '2018', value: 2.4 }, { year: '2019', value: 1.8 }, { year: '2020', value: 1.2 },
    { year: '2021', value: 4.7 }, { year: '2022', value: 8.0 }, { year: '2023', value: 4.1 },
    { year: '2024', value: 2.9 }, { year: '2025', value: 2.4, forecast: true }, { year: '2026', value: 2.1, forecast: true },
  ],
  china: [
    { year: '2018', value: 2.1 }, { year: '2019', value: 2.9 }, { year: '2020', value: 2.5 },
    { year: '2021', value: 0.9 }, { year: '2022', value: 2.0 }, { year: '2023', value: 0.2 },
    { year: '2024', value: 0.5 }, { year: '2025', value: 1.2, forecast: true }, { year: '2026', value: 1.8, forecast: true },
  ],
  uk: [
    { year: '2018', value: 2.5 }, { year: '2019', value: 1.8 }, { year: '2020', value: 0.9 },
    { year: '2021', value: 2.5 }, { year: '2022', value: 9.1 }, { year: '2023', value: 7.3 },
    { year: '2024', value: 3.2 }, { year: '2025', value: 2.5, forecast: true }, { year: '2026', value: 2.1, forecast: true },
  ],
  europe: [
    { year: '2018', value: 1.8 }, { year: '2019', value: 1.2 }, { year: '2020', value: 0.3 },
    { year: '2021', value: 2.6 }, { year: '2022', value: 8.4 }, { year: '2023', value: 5.4 },
    { year: '2024', value: 2.6 }, { year: '2025', value: 2.2, forecast: true }, { year: '2026', value: 1.9, forecast: true },
  ],
  japan: [
    { year: '2018', value: 1.0 }, { year: '2019', value: 0.5 }, { year: '2020', value: 0.0 },
    { year: '2021', value: -0.2 }, { year: '2022', value: 2.5 }, { year: '2023', value: 3.3 },
    { year: '2024', value: 2.7 }, { year: '2025', value: 2.1, forecast: true }, { year: '2026', value: 1.8, forecast: true },
  ],
  brazil: [
    { year: '2018', value: 3.7 }, { year: '2019', value: 3.7 }, { year: '2020', value: 4.5 },
    { year: '2021', value: 8.3 }, { year: '2022', value: 9.3 }, { year: '2023', value: 4.6 },
    { year: '2024', value: 4.8 }, { year: '2025', value: 4.0, forecast: true }, { year: '2026', value: 3.5, forecast: true },
  ],
};
 
// ────────────────────────────────────────────────
// Location detection
// ────────────────────────────────────────────────
const LOCATION_KEYWORDS: Record<string, string> = {
  india: 'india', 'indian': 'india',
  usa: 'usa', 'america': 'usa', 'us': 'usa', 'united states': 'usa',
  china: 'china', 'chinese': 'china',
  uk: 'uk', 'britain': 'uk', 'england': 'uk', 'united kingdom': 'uk',
  europe: 'europe', 'european': 'europe', 'eu': 'europe',
  japan: 'japan', 'japanese': 'japan',
  brazil: 'brazil', 'brazilian': 'brazil',
  germany: 'europe', 'france': 'europe',
  australia: 'australia',
  canada: 'usa', // fallback
  russia: 'russia',
  mexico: 'mexico',
};
 
function detectLocation(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [kw, country] of Object.entries(LOCATION_KEYWORDS)) {
    if (lower.includes(kw)) return country;
  }
  return null;
}
 
function detectInflationQuery(text: string): boolean {
  const lower = text.toLowerCase();
  return lower.includes('inflation') || lower.includes('cpi') || lower.includes('price') || lower.includes('cost of living');
}
 
// ────────────────────────────────────────────────
// Sidebar conversations
// ────────────────────────────────────────────────
const SIDEBAR_ITEMS = [
  'World markets today',
  'US inflation update',
  'Tech sector news',
  'Climate crisis latest',
  'Geopolitical tensions',
];
 
// ────────────────────────────────────────────────
// Main Page Component
// ────────────────────────────────────────────────
export default function Home() {
  const [input, setInput]                       = useState('');
  const [messages, setMessages]                 = useState<Message[]>([]);
  const [currentResponse, setCurrentResponse]   = useState('Boss, systems initializing. Stand by.');
  const [citations, setCitations]               = useState<string[]>(['NewsAPI', 'Gemini']);
  const [isThinking, setIsThinking]             = useState(false);
  const [isNarrating, setIsNarrating]           = useState(false);
  const [showMap, setShowMap]                   = useState(false);
  const [mapRegion, setMapRegion]               = useState('');
  const [showChart, setShowChart]               = useState(false);
  const [chartCountry, setChartCountry]         = useState('');
  const [newsCards, setNewsCards]               = useState<NewsCard[]>([]);
  const [sessionTime, setSessionTime]           = useState(0);
  const [activeConv, setActiveConv]             = useState('World markets today');
 
  const inputRef     = useRef<HTMLInputElement>(null);
  const responseRef  = useRef<HTMLDivElement>(null);
  const abortRef     = useRef<AbortController | null>(null);
 
  // Session timer
  useEffect(() => {
    const t = setInterval(() => setSessionTime(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
 
  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600).toString().padStart(2, '0');
    const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${h}:${m}:${sec}`;
  };
 
  // Typewriter effect
  const typewriterNarrate = useCallback(async (text: string) => {
    setIsNarrating(true);
    let displayed = '';
    for (const char of text) {
      displayed += char;
      setCurrentResponse(displayed);
      await new Promise(r => setTimeout(r, 16));
    }
    setIsNarrating(false);
  }, []);
 
  // Send message to backend
  const sendMessage = useCallback(async (userText: string) => {
    if (!userText.trim() || isThinking) return;
 
    // Abort any previous in-flight request
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
 
    const newMessages: Message[] = [...messages, { role: 'user', content: userText }];
    setMessages(newMessages);
    setInput('');
    setIsThinking(true);
    setCurrentResponse('');
    setShowChart(false);
 
    // Detect location + query type
    const loc = detectLocation(userText);
    const isInflation = detectInflationQuery(userText);
 
    if (loc) {
      setShowMap(true);
      setMapRegion(loc);
      if (isInflation && INFLATION_DATA[loc]) {
        setShowChart(true);
        setChartCountry(loc);
      }
    } else {
      setShowMap(false);
      setShowChart(false);
      setMapRegion('');
    }
 
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
        signal: abortRef.current.signal,
      });
 
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
 
      const data = await res.json();
      const reply = data.response || data.content || data.message || 'No response received.';
 
      const updatedMessages: Message[] = [...newMessages, { role: 'assistant', content: reply }];
      setMessages(updatedMessages);
 
      // Update citations if provided
      if (data.citations) setCitations(data.citations);
 
      setIsThinking(false);
      await typewriterNarrate(reply);
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') return;
      setIsThinking(false);
      const errMsg = 'Connection interrupted. Retrying on next query, Boss.';
      setMessages(prev => [...prev, { role: 'assistant', content: errMsg }]);
      await typewriterNarrate(errMsg);
    }
  }, [messages, isThinking, typewriterNarrate]);
 
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };
 
  // Boss Mode: send a quick summary prompt
  const handleBossMode = () => {
    sendMessage('Give me a rapid intelligence briefing: top 3 global economic threats right now, in bullet points.');
  };
 
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#080d1a', fontFamily: "'JetBrains Mono', monospace" }}>
 
      {/* ── Sidebar ── */}
      <aside className="w-52 flex-shrink-0 flex flex-col py-4 px-3" style={{ borderRight: '1px solid rgba(0,212,255,0.1)' }}>
        {/* Logo */}
        <div className="flex items-center gap-2 mb-6 px-1">
          <div
            className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold"
            style={{ background: 'rgba(0,212,255,0.15)', border: '1px solid rgba(0,212,255,0.4)', color: '#00d4ff' }}
          >
            ECO
          </div>
          <div>
            <div className="text-xs font-bold text-cyan-400 leading-none">ECO</div>
            <div className="text-[9px] text-gray-500 leading-none mt-0.5">AGENT V2.4</div>
          </div>
        </div>
 
        <div className="text-[9px] text-gray-600 tracking-widest mb-2 px-1">CONVERSATIONS</div>
        {SIDEBAR_ITEMS.map(item => (
          <button
            key={item}
            onClick={() => { setActiveConv(item); sendMessage(item); }}
            className="text-left text-xs px-3 py-2 rounded mb-1 transition-all"
            style={{
              background: activeConv === item ? 'rgba(0,212,255,0.12)' : 'transparent',
              border: activeConv === item ? '1px solid rgba(0,212,255,0.25)' : '1px solid transparent',
              color: activeConv === item ? '#00d4ff' : '#6b7280',
            }}
          >
            {item}
          </button>
        ))}
 
        {/* User badge at bottom */}
        <div className="mt-auto flex items-center gap-2 px-1">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold"
            style={{ background: 'rgba(0,212,255,0.2)', color: '#00d4ff', border: '1px solid rgba(0,212,255,0.3)' }}>
            C
          </div>
          <div>
            <div className="text-xs text-gray-300">Commander</div>
            <div className="text-[9px] text-gray-600">clearance · L4</div>
          </div>
        </div>
      </aside>
 
      {/* ── Main Center ── */}
      <main className="flex-1 flex flex-col overflow-hidden">
 
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(0,212,255,0.1)' }}>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs text-red-400 tracking-widest">LIVE</span>
            </div>
            <div className="text-[10px] text-gray-500 tracking-widest">SESSION</div>
            <div className="text-xs text-cyan-400 font-mono">{formatTime(sessionTime)}</div>
          </div>
          <button
            onClick={handleBossMode}
            className="flex items-center gap-2 px-4 py-1.5 text-xs font-bold rounded transition-all"
            style={{
              background: 'rgba(0,212,255,0.1)',
              border: '1px solid rgba(0,212,255,0.3)',
              color: '#00d4ff',
            }}
          >
            ✦ BOSS MODE
          </button>
        </div>
 
        {/* Center display: Globe OR Arc Reactor, with overlay content */}
        <div className="flex-1 overflow-hidden relative" style={{ minHeight: 0 }}>
 
          {/* Global Feed header */}
          <div className="absolute top-3 left-4 z-10">
            <div className="text-[9px] text-cyan-600 tracking-widest">// GLOBAL FEED</div>
            <div className="text-[9px] text-gray-600 mt-0.5">
              lat {mapRegion ? '—' : '0.000'} · lon {mapRegion ? '—' : '0.000'}
            </div>
          </div>
 
          {/* Main visual: globe when location detected, Arc Reactor otherwise */}
          <div className="w-full h-full flex flex-col items-center justify-start pt-2 pb-2">
            <div className="flex-1 flex items-center justify-center w-full" style={{ minHeight: 0, maxHeight: showChart ? 220 : '100%' }}>
              {showMap ? (
                <div className="map-fade-in w-full h-full px-6" style={{ maxWidth: 520 }}>
                  <GlobeDisplay highlightCountry={mapRegion} newsCards={newsCards} />
                </div>
              ) : (
                <ArcReactor isThinking={isThinking} />
              )}
            </div>
 
            {/* Inflation chart */}
            {showChart && INFLATION_DATA[chartCountry] && (
              <div className="w-full px-2 flex-shrink-0">
                <InflationChart country={chartCountry} data={INFLATION_DATA[chartCountry]} />
              </div>
            )}
          </div>
 
          {/* Intel Feed (news cards strip) */}
          {!showChart && (
            <div className="absolute bottom-0 left-0 right-0 px-4 pb-2">
              <div className="text-[9px] text-cyan-600 tracking-widest mb-2">// INTEL FEED</div>
              <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                {[
                  { src: 'CNBC',    headline: 'Markets rally on Fed pivot signals', cat: 'MARKETS' },
                  { src: 'Reuters', headline: 'Oil prices surge amid supply concerns', cat: 'COMMODITIES' },
                  { src: 'BBC',     headline: 'Trade talks resume between major economies', cat: 'TRADE' },
                  { src: 'FT',      headline: 'Central banks coordinate on digital currencies', cat: 'CRYPTO' },
                ].map((card, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(card.headline)}
                    className="flex-shrink-0 w-52 text-left rounded-lg p-2.5 transition-all hover:border-cyan-500"
                    style={{
                      background: 'rgba(0,212,255,0.04)',
                      border: '1px solid rgba(0,212,255,0.12)',
                    }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded"
                        style={{ background: 'rgba(0,212,255,0.15)', color: '#00aacc' }}>
                        {card.src}
                      </span>
                      <span className="text-[8px] text-gray-600">{card.cat}</span>
                    </div>
                    <p className="text-[10px] text-gray-300 leading-relaxed line-clamp-2">{card.headline}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
 
        {/* Input bar */}
        <div
          className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
          style={{ borderTop: '1px solid rgba(0,212,255,0.1)' }}
        >
          {/* Mic button */}
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 cursor-pointer transition-all hover:scale-105"
            style={{ background: 'rgba(0,212,255,0.15)', border: '1px solid rgba(0,212,255,0.3)' }}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="#00d4ff" strokeWidth="2">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" strokeLinecap="round" />
            </svg>
          </div>
 
          {/* Waveform / thinking indicator */}
          {isThinking ? (
            <div className="flex items-center gap-0.5 px-2">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="w-0.5 rounded-full animate-wave"
                  style={{
                    height: 16,
                    background: 'rgba(0,212,255,0.6)',
                    animationDelay: `${i * 0.08}s`,
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="flex-1">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder='Type here or say "Hey Eco"...'
                className="w-full bg-transparent text-xs text-gray-300 outline-none placeholder-gray-600"
              />
            </div>
          )}
 
          {/* Send button */}
          <button
            onClick={() => sendMessage(input)}
            disabled={isThinking || !input.trim()}
            className="px-4 py-2 text-xs font-bold tracking-widest rounded transition-all disabled:opacity-30"
            style={{
              background: 'rgba(0,212,255,0.15)',
              border: '1px solid rgba(0,212,255,0.3)',
              color: '#00d4ff',
            }}
          >
            SEND
          </button>
        </div>
      </main>
 
      {/* ── Right Panel: Live Readout ── */}
      <aside
        className="w-64 flex-shrink-0 flex flex-col py-4 px-4"
        style={{ borderLeft: '1px solid rgba(0,212,255,0.1)' }}
      >
        <div className="text-[9px] text-cyan-600 tracking-widest mb-3">// LIVE READOUT</div>
 
        {/* ECO Response */}
        <div
          className="rounded-lg p-3 mb-4 flex-1 overflow-y-auto"
          ref={responseRef}
          style={{
            background: 'rgba(0,212,255,0.04)',
            border: '1px solid rgba(0,212,255,0.1)',
            maxHeight: 320,
          }}
        >
          <div className="text-[9px] text-gray-600 tracking-widest mb-2">ECO RESPONSE</div>
          <p className="text-xs text-gray-200 leading-relaxed">
            {currentResponse}
            {isNarrating && <span className="typewriter-cursor" />}
          </p>
        </div>
 
        {/* Citations */}
        <div>
          <div className="text-[9px] text-gray-600 tracking-widest mb-2">CITATIONS</div>
          {citations.map((cite, i) => (
            <div key={i} className="text-xs text-cyan-500 mb-1">[{i + 1}] {cite}</div>
          ))}
        </div>
 
        {/* Context panel when map is shown */}
        {showMap && mapRegion && (
          <div className="mt-4 rounded-lg p-3" style={{ background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.1)' }}>
            <div className="text-[9px] text-gray-600 tracking-widest mb-2">REGION INTEL</div>
            <div className="text-xs text-cyan-400 font-bold mb-1">{mapRegion.toUpperCase()}</div>
            {INFLATION_DATA[mapRegion] && (
              <>
                <div className="text-[10px] text-gray-400 mb-1">
                  CPI YoY: <span className="text-cyan-300 font-bold">
                    {INFLATION_DATA[mapRegion].filter(d => !d.forecast).slice(-1)[0]?.value.toFixed(1)}%
                  </span>
                </div>
                <div className="text-[10px] text-gray-400">
                  Forecast: <span className="text-yellow-300 font-bold">
                    {INFLATION_DATA[mapRegion].filter(d => d.forecast)[0]?.value.toFixed(1)}%
                  </span>
                </div>
              </>
            )}
            <button
              onClick={() => sendMessage(`Tell me more about inflation in ${mapRegion}`)}
              className="mt-2 text-[9px] text-cyan-600 hover:text-cyan-400 transition-colors"
            >
              → Tell me more
            </button>
          </div>
        )}
 
        {/* Conversation history (last 3) */}
        {messages.length > 0 && (
          <div className="mt-4">
            <div className="text-[9px] text-gray-600 tracking-widest mb-2">HISTORY</div>
            <div className="space-y-1 overflow-y-auto" style={{ maxHeight: 120 }}>
              {messages.slice(-6).map((m, i) => (
                <div key={i} className="text-[9px] leading-relaxed"
                  style={{ color: m.role === 'user' ? '#00d4ff' : '#9ca3af' }}>
                  <span className="opacity-50">{m.role === 'user' ? 'YOU' : 'ECO'}: </span>
                  {m.content.substring(0, 60)}{m.content.length > 60 ? '…' : ''}
                </div>
              ))}
            </div>
          </div>
        )}
      </aside>
 
    </div>
  );
}
