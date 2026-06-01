// Add this component in page.tsx
function ArcReactor({ isThinking }: { isThinking: boolean }) {
  return (
    <div className="arc-reactor-wrapper">
      <svg viewBox="0 0 300 300" className={`arc-reactor ${isThinking ? 'thinking' : ''}`}>
        {/* Outer ring */}
        <circle cx="150" cy="150" r="140" fill="none" stroke="#00ffff" strokeWidth="2" opacity="0.4"/>
        
        {/* Rotating tick marks ring */}
        <g className="rotate-slow">
          {Array.from({length: 48}).map((_, i) => (
            <line
              key={i}
              x1="150" y1="15"
              x2="150" y2={i % 4 === 0 ? "28" : "22"}
              stroke="#00ffff"
              strokeWidth={i % 4 === 0 ? "2" : "1"}
              opacity="0.8"
              transform={`rotate(${i * 7.5} 150 150)`}
            />
          ))}
        </g>
        
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
        
        {/* Center reactor core */}
        <circle cx="150" cy="150" r="35" fill="#001a2e" stroke="#00ffff" strokeWidth="2"/>
        <circle cx="150" cy="150" r="20" fill="#003366" opacity="0.8"/>
        <circle cx="150" cy="150" r="10" fill="#00aaff" className={isThinking ? "core-pulse" : ""}/>
        
        {/* Glow filter */}
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
