"use client";
import { useState, useEffect, useRef } from "react";
import styles from "./page.module.css";

interface NewsCard {
  headline: string;
  source: string;
  url: string;
  image?: string;
}

interface Message {
  role: "user" | "agent";
  text: string;
  sources?: string[];
  newsCards?: NewsCard[];
  prediction?: string;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://econagent-production.up.railway.app";

const TICKER_HEADLINES = [
  "Fed signals potential rate cuts in Q3 2026 · Bloomberg",
  "US CPI falls to 2.88% as energy prices stabilise · Reuters",
  "Bitcoin crosses $105K amid institutional inflows · CoinDesk",
  "ECB holds rates steady, eyes September decision · FT",
  "Crude oil dips below $78 on demand concerns · CNBC",
  "S&P 500 hits record high on strong earnings · WSJ",
  "India GDP growth forecast revised up to 7.2% · Reuters",
  "China manufacturing PMI contracts for 3rd month · Bloomberg",
];

export default function Home() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [tickerIndex, setTickerIndex] = useState(0);
  const [status, setStatus] = useState<"online" | "thinking" | "error">("online");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setTickerIndex((i) => (i + 1) % TICKER_HEADLINES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmed = query.trim();
    if (!trimmed || loading) return;

    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setQuery("");
    setLoading(true);
    setStatus("thinking");

    try {
      const res = await fetch(`${BACKEND_URL}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          text: data.speech || data.response || "No response received.",
          sources: data.sources,
          newsCards: data.newsCards,
          prediction: data.prediction,
        },
      ]);
      setStatus("online");
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          text: "Boss, I'm having trouble reaching the intelligence backend. Please check if the server is running.",
        },
      ]);
      setStatus("error");
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  return (
    <main className={styles.main}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.logo}>◈ ECONAGENT</span>
          <span className={styles.tagline}>Mission Control · Economic Intelligence</span>
        </div>
        <div className={styles.headerRight}>
          <span className={`${styles.statusDot} ${styles[status]}`} />
          <span className={styles.statusLabel}>
            {status === "online" ? "SYSTEMS ONLINE" : status === "thinking" ? "PROCESSING..." : "BACKEND OFFLINE"}
          </span>
        </div>
      </header>

      {/* Ticker */}
      <div className={styles.tickerBar}>
        <span className={styles.tickerLabel}>LIVE</span>
        <div className={styles.tickerText} key={tickerIndex}>
          {TICKER_HEADLINES[tickerIndex]}
        </div>
      </div>

      {/* Chat Area */}
      <div className={styles.chatArea}>
        {messages.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>◈</div>
            <p className={styles.emptyTitle}>READY FOR BRIEFING</p>
            <p className={styles.emptySubtitle}>Ask about inflation, markets, geopolitics, or breaking economic news.</p>
            <div className={styles.suggestions}>
              {["What is happening with US inflation?", "Give me a markets briefing", "Latest Fed rate decision"].map(
                (s) => (
                  <button key={s} className={styles.suggestionBtn} onClick={() => { setQuery(s); inputRef.current?.focus(); }}>
                    {s}
                  </button>
                )
              )}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`${styles.message} ${styles[msg.role]}`}>
            <div className={styles.messageLabel}>{msg.role === "user" ? "YOU" : "ECONAGENT"}</div>
            <div className={styles.messageBubble}>
              <p>{msg.text}</p>

              {msg.prediction && (
                <div className={styles.prediction}>
                  <span className={styles.predLabel}>FORECAST</span>
                  <span>{msg.prediction}</span>
                </div>
              )}

              {msg.sources && msg.sources.length > 0 && (
                <div className={styles.sources}>
                  <span className={styles.sourcesLabel}>SOURCES · </span>
                  {msg.sources.join(" · ")}
                </div>
              )}

              {msg.newsCards && msg.newsCards.length > 0 && (
                <div className={styles.newsCards}>
                  {msg.newsCards.map((card, j) => (
                    <a key={j} href={card.url} target="_blank" rel="noreferrer" className={styles.newsCard}>
                      {card.image && <img src={card.image} alt="" className={styles.newsCardImg} />}
                      <div className={styles.newsCardBody}>
                        <span className={styles.newsCardSource}>{card.source}</span>
                        <span className={styles.newsCardHeadline}>{card.headline}</span>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className={`${styles.message} ${styles.agent}`}>
            <div className={styles.messageLabel}>ECONAGENT</div>
            <div className={styles.messageBubble}>
              <div className={styles.thinkingDots}>
                <span /><span /><span />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form className={styles.inputBar} onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          className={styles.input}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask EcoAgent anything about global economics..."
          disabled={loading}
          autoFocus
        />
        <button className={styles.sendBtn} type="submit" disabled={loading || !query.trim()}>
          {loading ? "..." : "BRIEF ME"}
        </button>
      </form>
    </main>
  );
}
