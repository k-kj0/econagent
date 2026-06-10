"use client";

import { useState } from "react";

type NewsCard = {
  headline: string;
  source: string;
  url: string;
  image: string;
};

type EcoResponse = {
  speech: string;
  countries: string[];
  prediction: string;
  sources: string[];
  newsCards?: NewsCard[];
};

export default function Page() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<EcoResponse | null>(null);

  async function askEcoAgent() {
    if (!query.trim()) return;

    setLoading(true);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: query,
          session_id: "boss-session",
        }),
      });

      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
      alert("Failed to contact EcoAgent");
    }

    setLoading(false);
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#050b18",
        color: "white",
        padding: "40px",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <h1
        style={{
          fontSize: "48px",
          marginBottom: "10px",
        }}
      >
        EcoAgent
      </h1>

      <p
        style={{
          color: "#8fb7ff",
          marginBottom: "30px",
        }}
      >
        Economic Intelligence Dashboard
      </p>

      <div
        style={{
          display: "flex",
          gap: "12px",
          marginBottom: "30px",
        }}
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask about inflation, recession, markets..."
          style={{
            flex: 1,
            padding: "14px",
            borderRadius: "10px",
            border: "1px solid #1f3d6d",
            background: "#0d1528",
            color: "white",
          }}
        />

        <button
          onClick={askEcoAgent}
          disabled={loading}
          style={{
            padding: "14px 24px",
            borderRadius: "10px",
            border: "none",
            cursor: "pointer",
            background: "#2563eb",
            color: "white",
            fontWeight: 700,
          }}
        >
          {loading ? "Analyzing..." : "Analyze"}
        </button>
      </div>

      {data && (
        <>
          <div
            style={{
              background: "#0d1528",
              border: "1px solid #1f3d6d",
              borderRadius: "12px",
              padding: "20px",
              marginBottom: "20px",
            }}
          >
            <h2>Analysis</h2>

            <p>{data.speech}</p>

            <br />

            <h3>Prediction</h3>
            <p>{data.prediction}</p>

            <br />

            <h3>Countries</h3>
            <p>{data.countries.join(", ")}</p>

            <br />

            <h3>Sources</h3>
            <p>{data.sources.join(", ")}</p>
          </div>

          {data.newsCards && data.newsCards.length > 0 && (
            <>
              <h2 style={{ marginBottom: "20px" }}>Latest News</h2>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fill,minmax(300px,1fr))",
                  gap: "20px",
                }}
              >
                {data.newsCards.map((news, index) => (
                  <a
                    key={index}
                    href={news.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      textDecoration: "none",
                      color: "white",
                    }}
                  >
                    <div
                      style={{
                        background: "#0d1528",
                        border: "1px solid #1f3d6d",
                        borderRadius: "12px",
                        overflow: "hidden",
                      }}
                    >
                      {news.image && (
                        <img
                          src={news.image}
                          alt=""
                          style={{
                            width: "100%",
                            height: "180px",
                            objectFit: "cover",
                          }}
                        />
                      )}

                      <div style={{ padding: "16px" }}>
                        <h3>{news.headline}</h3>

                        <p
                          style={{
                            color: "#8fb7ff",
                            marginTop: "10px",
                          }}
                        >
                          {news.source}
                        </p>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </main>
  );
}
