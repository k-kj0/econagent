"use client";

import { useState, useRef, useEffect } from "react";

function ArcReactor({ isThinking }: { isThinking: boolean }) {
  return (
    <div className="arc-reactor-wrapper" style={{ 
      width: '280px', 
      height: '280px', 
      position: 'relative',
      margin: '0 auto'
    }}>
      <svg viewBox="0 0 300 300" className={`arc-reactor ${isThinking ? 'thinking' : ''}`} style={{
        width: '100%',
        height: '100%'
      }}>
        {/* Outer ring */}
        <circle cx="150" cy="150" r="140" fill="none" stroke="#00ffff" strokeWidth="2" opacity="0.4"/>
        
        {/* Rotating tick marks ring */}
        <g className="rotate-slow">
          {Array.from({length: 60}).map((_, i) => (
            <line
              key={i}
              x1="150" y1="15"
              x2="150" y2={i % 5 === 0 ? "28" : "22"}
              stroke="#00ffff"
              strokeWidth={i % 5 === 0 ? "2" : "1"}
              opacity="0.8"
              transform={`rotate(${i * 6} 150 150)`}
            />
          ))}
        </g>
        
        {/* Arc segments */}
        {[0, 72, 144, 216, 288].map((start, idx) => (
          <path
            key={idx}
            d="M 150 60 A 90 90 0 0 1 210 110"
            fill="none"
            stroke="#00ffff"
            strokeWidth="3"
            opacity="0.6"
            transform={`rotate(${start} 150 150)`}
            className="arc-segment"
          />
        ))}
        
        {/* Middle glowing ring - pulses when thinking */}
        <circle cx="150" cy="150" r="90" fill="none" 
          stroke="#00ffff" strokeWidth={isThinking ? "3" : "1.5"} 
          className={isThinking ? "pulse-ring" : ""}
          opacity="0.7"/>
        
        {/* Inner blue energy ring - counter-rotates */}
        <g className="rotate-fast-reverse">
          <circle cx="150" cy="150" r="65" fill="none" stroke="#0080ff" strokeWidth="8" 
            strokeDasharray="20 8" opacity="0.9"
            filter="url(#glow)"/>
        </g>
        
        {/* Triangular spokes - Iron Man style */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
          <polygon
            key={angle}
            points="150,85 153,100 147,100"
            fill="#00aaff"
            opacity="0.5"
            transform={`rotate(${angle} 150 150)`}
          />
        ))}
        
        {/* Center reactor core */}
        <circle cx="150" cy="150" r="35" fill="#001a2e" stroke="#00ffff" strokeWidth="2"/>
        <circle cx="150" cy="150" r="20" fill="#003366" opacity="0.8"/>
        <circle cx="150" cy="150" r="10" fill="#00aaff" className={isThinking ? "core-pulse" : ""}/>
        
        {/* Inner glow */}
        <circle cx="150" cy="150" r="8" fill="#ffffff" opacity="0.9"/>
        
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
      </svg>
    </div>
  );
}

function SimpleGlobe({ region, date }: { region: string; date: string }) {
  return (
    <div className="globe-container" style={{ width: '280px', height: '280px', position: 'relative', margin: '0 auto' }}>
      <svg viewBox="0 0 400 400" style={{ width: '100%', height: '100%' }}>
        {/* Globe circle */}
        <circle cx="200" cy="200" r="180" fill="#0a1628" stroke="#00ffff" strokeWidth="2" opacity="0.8"/>
        
        {/* Latitude lines */}
        {[60, 120, 180, 240, 300].map((cy) => (
          <ellipse key={`lat-${cy}`} cx="200" cy={cy} rx="170" ry="15" fill="none" stroke="#00ffff" strokeWidth="0.5" opacity="0.3"/>
        ))}
        
        {/* Longitude lines */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
          const rad = angle * Math.PI / 180;
          const x2 = 200 + 170 * Math.cos(rad);
          const y2 = 200 + 170 * Math.sin(rad);
          return (
            <line key={`lon-${angle}`} x1="200" y1="30" x2={x2} y2={y2} stroke="#00ffff" strokeWidth="0.5" opacity="0.3"/>
          );
        })}
        
        {/* Continent approximations */}
        {/* North America */}
        <path d="M 100 120 Q 120 100 140 110 Q 150 130 130 150 Q 110 160 100 140 Z" fill="#00aaff" opacity="0.4"/>
        {/* South America */}
        <path d="M 130 220 Q 140 210 145 230 Q 150 260 140 280 Q 130 270 130 250 Z" fill="#00aaff" opacity="0.4"/>
        {/* Europe */}
        <path d="M 220 110 Q 240 100 250 120 Q 245 140 230 145 Q 215 140 220 120 Z" fill="#00aaff" opacity="0.4"/>
        {/* Africa */}
        <path d="M 230 160 Q 250 150 260 180 Q 265 220 250 240 Q 230 230 230 200 Z" fill="#00aaff" opacity="0.4"/>
        {/* Asia */}
        <path d="M 270 100 Q 300 90 320 110 Q 310 140 280 150 Q 260 140 270 120 Z" fill="#00aaff" opacity="0.4"/>
        
        {/* Ping effect on detected region */}
        <circle cx="200" cy="200" r="30" fill="none" stroke="#00ffff" strokeWidth="1.5" className="ping-ring"/>
        <circle cx="200" cy="200" r="10" fill="#00ffff" opacity="0.6"/>
        
        {/* Date text */}
        <text x="200" y="380" textAnchor="middle" fill="#00ffff" fontSize="14" fontFamily="monospace" opacity="0.7">
          {date}
        </text>
      </svg>
    </div>
  );
}

function InflationChart({ country }: { country: string }) {
  const data = {
    india: { actual: [4.5, 3.8, 4.2, 5.1, 4.6, 3.9, 4.3], forecast: [4.0, 3.7] },
    usa: { actual: [2.1, 2.3, 2.8, 3.2, 4.7, 3.0, 2.9], forecast: [2.6, 2.4] },
    china: { actual: [2.5, 2.8, 2.2, 2.9, 2.0, 1.8, 2.3], forecast: [2.1, 1.9] },
    uk: { actual: [2.0, 2.5, 2.9, 3.4, 5.1, 4.2, 3.7], forecast: [3.2, 2.9] },
    europe: { actual: [1.8, 2.0, 2.5, 3.0, 4.5, 3.5, 3.1], forecast: [2.8, 2.5] },
    japan: { actual: [0.8, 0.9, 1.2, 1.5, 2.3, 2.0, 1.8], forecast: [1.6, 1.5] },
    brazil: { actual: [3.7, 4.0, 3.5, 4.2, 5.8, 4.5, 4.0], forecast: [3.8, 3.5] }
  };
  
  const countryData = data[country as keyof typeof data] || data.usa;
  const allValues = [...countryData.actual, ...countryData.forecast];
  const maxValue = Math.max(...allValues);
  const minValue = Math.min(...allValues);
  const range = maxValue - minValue;
  const height = 120;
  const width = 280;
  const leftMargin = 35;
  const rightMargin = 10;
  const chartWidth = width - leftMargin - rightMargin;
  const pointSpacing = chartWidth / (countryData.actual.length + countryData.forecast.length - 1);
  
  const getY = (value: number) => height - 10 - ((value - minValue) / range) * (height - 20);
  
  const actualPoints = countryData.actual.map((val, i) => `${leftMargin + i * pointSpacing},${getY(val)}`).join(' ');
  const forecastPoints = countryData.forecast.map((val, i) => {
    const x = leftMargin + (countryData.actual.length - 1 + i) * pointSpacing;
    return `${x},${getY(val)}`;
  }).join(' ');
  
  return (
    <div className="inflation-chart" style={{ marginTop: '20px', width: '100%' }}>
      <div style={{ color: '#00ffff', fontSize: '12px', marginBottom: '8px', fontFamily: 'monospace' }}>
        {country.toUpperCase()} · INFLATION FORECAST
      </div>
      <svg viewBox={`0 0 ${width} ${height + 30}`} style={{ width: '100%', height: '150px' }}>
        {/* Axes */}
        <line x1={leftMargin} y1="0" x2={leftMargin} y2={height - 5} stroke="#00ffff" strokeWidth="1" opacity="0.5"/>
        <line x1={leftMargin} y1={height - 5} x2={width - rightMargin} y2={height - 5} stroke="#00ffff" strokeWidth="1" opacity="0.5"/>
        
        {/* Actual data line */}
        <polyline points={actualPoints} fill="none" stroke="#00ffff" strokeWidth="2"/>
        
        {/* Forecast data line - dashed */}
        <polyline points={forecastPoints} fill="none" stroke="#ffff00" strokeWidth="2" strokeDasharray="4 4"/>
        
        {/* Data points */}
        {countryData.actual.map((val, i) => (
          <circle key={`actual-${i}`} cx={leftMargin + i * pointSpacing} cy={getY(val)} r="3" fill="#00ffff"/>
        ))}
        {countryData.forecast.map((val, i) => (
          <circle key={`forecast-${i}`} cx={leftMargin + (countryData.actual.length - 1 + i) * pointSpacing} cy={getY(val)} r="3" fill="#ffff00"/>
        ))}
        
        {/* Labels */}
        <text x={leftMargin + chartWidth / 2} y={height + 15} textAnchor="middle" fill="#00ffff" fontSize="10" fontFamily="monospace" opacity="0.6">
          2018 → 2026
        </text>
        <text x={leftMargin - 8} y={getY(maxValue)} textAnchor="end" fill="#00ffff" fontSize="8" fontFamily="monospace" opacity="0.5">
          {maxValue.toFixed(1)}%
        </text>
        <text x={leftMargin - 8} y={getY(minValue)} textAnchor="end" fill="#00ffff" fontSize="8" fontFamily="monospace" opacity="0.5">
          {minValue.toFixed(1)}%
        </text>
        
        {/* Legend */}
        <line x1={width - 60} y1="15" x2={width - 45} y2="15" stroke="#00ffff" strokeWidth="2"/>
        <text x={width - 40} y="18" fill="#00ffff" fontSize="8" fontFamily="monospace">ACTUAL</text>
        <line x1={width - 60} y1="28" x2={width - 45} y2="28" stroke="#ffff00" strokeWidth="2" strokeDasharray="2 2"/>
        <text x={width - 40} y="31" fill="#ffff00" fontSize="8" fontFamily="monospace">FORECAST</text>
      </svg>
    </div>
  );
}

export default function Home() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{role: string, content: string}[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const [showGlobe, setShowGlobe] = useState(false);
  const [showInflation, setShowInflation] = useState(false);
  const [currentCountry, setCurrentCountry] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const today = new Date();
  const dateString = `${today.toLocaleString('default', { month: 'long' })} ${today.getDate()}, ${today.getFullYear()}`;
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentResponse]);
  
  async function typewriterNarrate(text: string) {
    let displayed = '';
    for (let i = 0; i < text.length; i++) {
      displayed += text[i];
      setCurrentResponse(displayed);
      await new Promise(r => setTimeout(r, 15));
    }
  }
  
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isThinking) return;
    
    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsThinking(true);
    setCurrentResponse('');
    
    // Check for country mentions
    const countries = ['india', 'usa', 'china', 'uk', 'japan', 'brazil', 'europe'];
    const mentionedCountry = countries.find(c => userMessage.toLowerCase().includes(c));
    
    // Check for inflation query
    const isInflationQuery = userMessage.toLowerCase().includes('inflation') || 
                            userMessage.toLowerCase().includes('cpi') ||
                            userMessage.toLowerCase().includes('price');
    
    if (mentionedCountry) {
      setShowGlobe(true);
      setCurrentCountry(mentionedCountry);
      if (isInflationQuery) {
        setShowInflation(true);
      } else {
        setShowInflation(false);
      }
    } else {
      setShowGlobe(false);
      setShowInflation(false);
    }
    
    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: [...messages, { role: 'user', content: userMessage }]
        }),
      });
      
      const data = await response.json();
      const reply = data.response || "I couldn't process that request, Boss.";
      
      await typewriterNarrate(reply);
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
      setCurrentResponse('');
    } catch (error) {
      console.error('Error:', error);
      await typewriterNarrate("Connection error. Please try again, Boss.");
      setCurrentResponse('');
    } finally {
      setIsThinking(false);
    }
  }
  
  async function handleTellMeMore() {
    if (isThinking) return;
    setIsThinking(true);
    setCurrentResponse('');
    
    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: [...messages, { role: 'user', content: 'Tell me more about your previous response' }]
        }),
      });
      
      const data = await response.json();
      const reply = data.response || "I don't have more information on that yet, Boss.";
      
      await typewriterNarrate(reply);
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
      setCurrentResponse('');
    } catch (error) {
      console.error('Error:', error);
      await typewriterNarrate("Connection error. Please try again.");
      setCurrentResponse('');
    } finally {
      setIsThinking(false);
    }
  }
  
  return (
    <div className="flex h-screen bg-[#080d1a] text-[#e2e8f0] font-mono overflow-hidden">
      {/* Left Panel - Chat */}
      <div className="flex-1 flex flex-col p-6">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-glow">ECO<span className="text-[#00aaff]">Agent</span></h1>
          <div className="text-xs text-[#00ffff] opacity-60 mt-1">v2.4 · ACTIVE</div>
        </div>
        
        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto mb-4 space-y-3">
          {messages.map((msg, idx) => (
            <div key={idx} className={`${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
              <div className={`inline-block max-w-[80%] p-3 rounded-lg ${
                msg.role === 'user' 
                  ? 'bg-[#00aaff20] border border-[#00aaff40]' 
                  : 'bg-[#00ffff10] border border-[#00ffff30]'
              }`}>
                <div className="text-xs opacity-60 mb-1">{msg.role === 'user' ? 'YOU' : 'ECO'}</div>
                <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
              </div>
            </div>
          ))}
          {currentResponse && (
            <div className="text-left">
              <div className="inline-block max-w-[80%] p-3 rounded-lg bg-[#00ffff10] border border-[#00ffff30]">
                <div className="text-xs opacity-60 mb-1">ECO</div>
                <div className="text-sm whitespace-pre-wrap">
                  {currentResponse}
                  <span className="animate-pulse ml-1 text-[#00ffff]">|</span>
                </div>
              </div>
            </div>
          )}
          {isThinking && !currentResponse && (
            <div className="text-left">
              <div className="inline-block p-3 rounded-lg bg-[#00ffff10] border border-[#00ffff30]">
                <div className="text-xs opacity-60 mb-1">ECO</div>
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-[#00ffff] rounded-full animate-wave"></div>
                  <div className="w-2 h-2 bg-[#00ffff] rounded-full animate-wave" style={{animationDelay: '0.2s'}}></div>
                  <div className="w-2 h-2 bg-[#00ffff] rounded-full animate-wave" style={{animationDelay: '0.4s'}}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Input form */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything, Boss..."
            className="flex-1 bg-[#0a1628] border border-[#00ffff40] rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-[#00ffff]"
            disabled={isThinking}
          />
          <button
            type="submit"
            disabled={isThinking || !input.trim()}
            className="px-4 py-2 bg-[#00aaff] rounded-lg text-black font-bold disabled:opacity-50"
          >
            SEND
          </button>
          <button
            type="button"
            onClick={handleTellMeMore}
            disabled={isThinking || messages.length === 0}
            className="px-3 py-2 bg-[#00ffff20] border border-[#00ffff40] rounded-lg text-sm disabled:opacity-50"
          >
            MORE
          </button>
        </form>
      </div>
      
      {/* Right Panel - Visuals */}
      <div className="w-[400px] bg-[#0a0f1a] border-l border-[#00ffff20] p-6 flex flex-col items-center justify-center">
        {showGlobe ? (
          <>
            <SimpleGlobe region={currentCountry} date={dateString} />
            {showInflation && <InflationChart country={currentCountry} />}
          </>
        ) : (
          <ArcReactor isThinking={isThinking} />
        )}
        
        {/* Status text */}
        <div className="mt-6 text-center">
          <div className="text-xs text-[#00ffff] opacity-50">
            {isThinking ? 'PROCESSING...' : 'STANDBY'}
          </div>
          <div className="text-[10px] text-[#00ffff] opacity-30 mt-1">
            {dateString}
          </div>
        </div>
      </div>
    </div>
  );
}
