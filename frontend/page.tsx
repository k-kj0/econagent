'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  AlertTriangle, 
  Send, 
  Bot, 
  User, 
  ChevronRight,
  BarChart3,
  Zap,
  Clock,
  Shield,
  Sparkles
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Price {
  symbol: string;
  name: string;
  price: number;
  unit: string;
  change_pct: number;
  timestamp: string;
}

interface Alert {
  type: string;
  message: string;
  severity: string;
  timestamp: string;
}

interface AgentStep {
  step: number;
  action: string;
  result: string;
}

interface AgentResponse {
  steps: AgentStep[];
  conclusion: string;
  confidence: string;
  sources: string[];
  question: string;
}

function TickerStrip({ prices }: { prices: Price[] }) {
  const tickerContent = [...prices, ...prices];

  return (
    <div className="w-full bg-surface border-b border-border overflow-hidden py-2">
      <div className="flex ticker-scroll whitespace-nowrap">
        {tickerContent.map((p, i) => (
          <div key={`${p.symbol}-${i}`} className="flex items-center gap-2 px-6 border-r border-border/50">
            <span className="font-mono text-xs text-text-muted uppercase">{p.symbol}</span>
            <span className="font-mono text-sm font-medium text-text-primary">
              {p.price.toFixed(p.price < 100 ? 2 : 0)}
            </span>
            <span className={`font-mono text-xs flex items-center gap-0.5 ${p.change_pct >= 0 ? 'text-accent' : 'text-danger'}`}>
              {p.change_pct >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
              {p.change_pct >= 0 ? '+' : ''}{p.change_pct.toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PriceCard({ price }: { price: Price }) {
  const isPositive = price.change_pct >= 0;

  return (
    <div className="bg-surface border border-border rounded-lg p-4 hover:border-accent/30 transition-colors group">
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-xs text-text-muted uppercase tracking-wider">{price.symbol}</span>
        <div className={`flex items-center gap-1 text-xs font-mono ${isPositive ? 'text-accent' : 'text-danger'}`}>
          {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {isPositive ? '+' : ''}{price.change_pct.toFixed(2)}%
        </div>
      </div>
      <div className="font-mono text-xl font-semibold text-text-primary group-hover:text-accent transition-colors">
        {price.price.toFixed(price.price < 100 ? 2 : 0)}
      </div>
      <div className="text-xs text-text-muted mt-1">{price.name} · {price.unit}</div>
    </div>
  );
}

function AlertCard({ alert }: { alert: Alert }) {
  const severityColors = {
    high: 'border-danger/30 bg-danger/5',
    medium: 'border-warning/30 bg-warning/5',
    low: 'border-accent/30 bg-accent/5',
  };

  const severityIcon = {
    high: <AlertTriangle size={14} className="text-danger" />,
    medium: <Zap size={14} className="text-warning" />,
    low: <Activity size={14} className="text-accent" />,
  };

  return (
    <div className={`border rounded-lg p-3 ${severityColors[alert.severity as keyof typeof severityColors] || severityColors.low}`}>
      <div className="flex items-start gap-2">
        {severityIcon[alert.severity as keyof typeof severityIcon]}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-text-primary leading-relaxed">{alert.message}</p>
          <div className="flex items-center gap-2 mt-2">
            <Clock size={10} className="text-text-muted" />
            <span className="text-xs text-text-muted font-mono">
              {new Date(alert.timestamp).toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function AgentChat() {
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<AgentResponse | null>(null);
  const [visibleSteps, setVisibleSteps] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (response && visibleSteps < response.steps.length) {
      const timer = setTimeout(() => {
        setVisibleSteps(prev => prev + 1);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [response, visibleSteps]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || isLoading) return;

    setIsLoading(true);
    setResponse(null);
    setVisibleSteps(0);

    try {
      const res = await fetch(`${API_URL}/agent/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      setResponse(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const confidenceColor = {
    high: 'text-accent',
    medium: 'text-warning',
    low: 'text-danger',
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
        <Bot size={18} className="text-accent" />
        <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">Agent Chat</h2>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 mb-4 min-h-[300px]">
        {!response && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-text-muted space-y-3">
            <Sparkles size={32} className="text-accent/30" />
            <p className="text-sm">Ask me anything about commodities or forex...</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {['Is wheat a good hedge right now?', 'How is gold performing vs USD?', 'Should I buy copper?'].map(q => (
                <button
                  key={q}
                  onClick={() => setQuestion(q)}
                  className="text-xs px-3 py-1.5 bg-surface border border-border rounded-full hover:border-accent/50 hover:text-accent transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center gap-3 p-3 bg-surface rounded-lg border border-border">
            <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
            <span className="text-sm text-text-secondary">Analyzing market data...</span>
          </div>
        )}

        {response && (
          <div className="space-y-3 animate-fade-in">
            <div className="flex items-start gap-2 p-3 bg-surface/50 rounded-lg border border-border/50">
              <User size={14} className="text-text-muted mt-0.5 shrink-0" />
              <p className="text-sm text-text-primary">{response.question}</p>
            </div>

            <div className="space-y-2">
              {response.steps.slice(0, visibleSteps).map((step, idx) => (
                <div 
                  key={idx} 
                  className="flex items-start gap-3 p-3 bg-surface rounded-lg border border-border/50 animate-slide-up"
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  <div className="flex items-center justify-center w-5 h-5 rounded-full bg-accent/10 text-accent text-xs font-mono font-bold shrink-0">
                    {step.step}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-accent font-mono mb-1">{step.action}</div>
                    <div className="text-sm text-text-secondary leading-relaxed">{step.result}</div>
                  </div>
                </div>
              ))}
            </div>

            {visibleSteps >= response.steps.length && (
              <div className="p-4 bg-accent-dim border border-accent/20 rounded-lg animate-fade-in">
                            <div className="flex items-center gap-2 mb-2">
                  <Shield size={14} className="text-accent" />
                  <span className="text-xs font-mono text-accent uppercase">Conclusion</span>
                  <span className={`text-xs font-mono font-bold uppercase ${confidenceColor[response.confidence as keyof typeof confidenceColor]}`}>
                    {response.confidence} confidence
                  </span>
                </div>
                <p className="text-sm text-text-primary leading-relaxed">{response.conclusion}</p>
                {response.sources.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3 pt-2 border-t border-accent/10">
                    {response.sources.map((s, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 bg-surface rounded text-text-muted font-mono">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="relative">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask about commodities, forex, hedging strategies..."
          className="w-full bg-surface border border-border rounded-lg pl-4 pr-12 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50 transition-colors"
        />
        <button
          type="submit"
          disabled={isLoading || !question.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-accent/10 text-accent rounded-md hover:bg-accent/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}

export default function Dashboard() {
  const [prices, setPrices] = useState<Price[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'chat' | 'alerts'>('dashboard');

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const res = await fetch(`${API_URL}/prices`);
        const data = await res.json();
        setPrices(data);
      } catch (err) {
        console.error('Failed to fetch prices:', err);
      }
    };

    const fetchAlerts = async () => {
      try {
        const res = await fetch(`${API_URL}/alerts`);
        const data = await res.json();
        setAlerts(data);
      } catch (err) {
        console.error('Failed to fetch alerts:', err);
      }
    };

    fetchPrices();
    fetchAlerts();

    const priceInterval = setInterval(fetchPrices, 5000);
    const alertInterval = setInterval(fetchAlerts, 15000);

    return () => {
      clearInterval(priceInterval);
      clearInterval(alertInterval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-surface/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center border border-accent/20">
              <BarChart3 size={18} className="text-accent" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-text-primary tracking-tight">EconAgent</h1>
              <p className="text-xs text-text-muted">Economic Intelligence</p>
            </div>
          </div>

          <nav className="flex items-center gap-1">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
              { id: 'chat', label: 'Agent', icon: Bot },
              { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                  activeTab === tab.id 
                    ? 'bg-accent/10 text-accent border border-accent/20' 
                    : 'text-text-muted hover:text-text-primary hover:bg-surface'
                }`}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Ticker */}
      {prices.length > 0 && <TickerStrip prices={prices} />}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-text-primary">Market Overview</h2>
                <p className="text-xs text-text-muted mt-0.5">Live commodity and forex data</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <div className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
                Live
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {prices.map((price) => (
                <PriceCard key={price.symbol} price={price} />
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
              <div className="lg:col-span-2 bg-surface border border-border rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Bot size={16} className="text-accent" />
                  <h3 className="text-sm font-semibold text-text-primary">Ask the Agent</h3>
                </div>
                <AgentChat />
              </div>

              <div className="bg-surface border border-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={16} className="text-warning" />
                    <h3 className="text-sm font-semibold text-text-primary">Anomaly Alerts</h3>
                  </div>
                  <span className="text-xs text-text-muted font-mono">{alerts.length} active</span>
                </div>
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {alerts.map((alert, idx) => (
                    <AlertCard key={idx} alert={alert} />
                  ))}
                  {alerts.length === 0 && (
                    <div className="text-center py-8 text-text-muted">
                      <Shield size={24} className="mx-auto mb-2 opacity-30" />
                      <p className="text-xs">No active alerts</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="max-w-3xl mx-auto">
            <div className="bg-surface border border-border rounded-xl p-6 h-[calc(100vh-180px)]">
              <AgentChat />
            </div>
          </div>
        )}

        {activeTab === 'alerts' && (
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-text-primary">Anomaly Detection Feed</h2>
              <span className="text-xs text-text-muted font-mono">{alerts.length} alerts</span>
            </div>
            {alerts.map((alert, idx) => (
              <AlertCard key={idx} alert={alert} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}