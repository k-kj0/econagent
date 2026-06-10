import { NextRequest, NextResponse } from "next/server";

const GROQ_KEY   = process.env.GROQ_API_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const NEWS_KEY   = process.env.NEWS_API_KEY;
const GNEWS_KEY  = process.env.GNEWS_API_KEY;

const SYSTEM_PROMPT = `You are EcoAgent, an elite economic intelligence AI.
Your personality: confident, concise, like a Bloomberg anchor. Address the user as Boss.
Rules:
- Always start with "Boss,"
- Be specific with data when available
- Return ONLY valid JSON, no markdown fences, no extra text

JSON schema (return exactly this structure):
{
  "speech": "Boss, [2-4 sentences analysis]",
  "countries": ["US", "UK"],
  "prediction": "One forward-looking sentence.",
  "sources": ["Bloomberg", "Reuters"]
}`;

function cleanJson(raw: string): Record<string, unknown> {
  const cleaned = raw
    .replace(/```json\s*/g, "")
    .replace(/```\s*/g, "")
    .trim();
  return JSON.parse(cleaned);
}

async function callGroq(userPrompt: string): Promise<Record<string, unknown>> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GROQ_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama3-8b-8192",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user",   content: userPrompt },
      ],
      max_tokens: 600,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq ${res.status}: ${err}`);
  }

  const data = await res.json();
  const raw = data.choices[0].message.content as string;
  return cleanJson(raw);
}

async function callGemini(userPrompt: string): Promise<Record<string, unknown>> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${SYSTEM_PROMPT}\n\n${userPrompt}` }] }],
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini ${res.status}: ${err}`);
  }

  const data = await res.json();
  const raw = data.candidates[0].content.parts[0].text as string;
  return cleanJson(raw);
}

async function getAiResponse(userPrompt: string): Promise<Record<string, unknown>> {
  // 1. Try Groq first
  if (GROQ_KEY) {
    try {
      return await callGroq(userPrompt);
    } catch (e) {
      console.error("Groq failed:", e);
    }
  }

  // 2. Try Gemini as fallback
  if (GEMINI_KEY) {
    try {
      return await callGemini(userPrompt);
    } catch (e) {
      console.error("Gemini failed:", e);
    }
  }

  // 3. Both failed
  return {
    speech: "Boss, all AI providers are unavailable. Check your API keys in Vercel environment variables.",
    countries: [],
    prediction: "Add GROQ_API_KEY to Vercel env vars — free at console.groq.com.",
    sources: ["EcoAgent"],
  };
}

async function fetchNews(query: string): Promise<{ headline: string; source: string; url: string; image: string }[]> {
  const q = encodeURIComponent(query.slice(0, 50));

  if (NEWS_KEY) {
    try {
      let res = await fetch(
        `https://newsapi.org/v2/top-headlines?language=en&pageSize=6&apiKey=${NEWS_KEY}&q=${q}`
      );
      let data = await res.json();
      let articles = data.articles || [];

      if (!articles.length) {
        res = await fetch(
          `https://newsapi.org/v2/top-headlines?language=en&pageSize=6&apiKey=${NEWS_KEY}&category=business`
        );
        data = await res.json();
        articles = data.articles || [];
      }

      const cards = articles
        .filter((a: Record<string, unknown>) => a.title && !(a.title as string).includes("[Removed]"))
        .slice(0, 6)
        .map((a: Record<string, unknown>) => ({
          headline: a.title as string,
          source: (a.source as Record<string, string>)?.name ?? "News",
          url: (a.url as string) ?? "",
          image: (a.urlToImage as string) ?? "",
        }));

      if (cards.length) return cards;
    } catch (e) {
      console.error("NewsAPI failed:", e);
    }
  }

  if (GNEWS_KEY) {
    try {
      const res = await fetch(
        `https://gnews.io/api/v4/top-headlines?lang=en&max=6&apikey=${GNEWS_KEY}&q=${q}`
      );
      const data = await res.json();
      return (data.articles || []).slice(0, 6).map((a: Record<string, unknown>) => ({
        headline: a.title as string,
        source: (a.source as Record<string, string>)?.name ?? "News",
        url: (a.url as string) ?? "",
        image: (a.image as string) ?? "",
      }));
    } catch (e) {
      console.error("GNews failed:", e);
    }
  }

  return [];
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const text: string = body.text ?? "";
  const sessionId: string = body.session_id ?? "default";

  if (!text.trim()) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  // Fetch news in parallel with nothing (could parallelise with AI later)
  const newsCards = await fetchNews(text);
  const newsText = newsCards.length
    ? newsCards.map((c) => `- ${c.headline} (${c.source})`).join("\n")
    : "No live news available.";

  const userPrompt = `User query: ${text}\n\nLive news:\n${newsText}\n\nRespond as EcoAgent.`;
  const aiData = await getAiResponse(userPrompt);

  return NextResponse.json({
    ...aiData,
    newsCards,
    session_id: sessionId,
  });
}

export async function GET() {
  return NextResponse.json({
    status: "EcoAgent online",
    groq: Boolean(GROQ_KEY),
    gemini: Boolean(GEMINI_KEY),
    news: Boolean(NEWS_KEY || GNEWS_KEY),
  });
}
