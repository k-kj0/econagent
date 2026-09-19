import { NextRequest, NextResponse } from "next/server";

const GROQ_KEY = process.env.GROQ_API_KEY;
const GNEWS_KEY = process.env.GNEWS_API_KEY;

const SYSTEM_PROMPT = `You are EcoAgent, an elite economic intelligence AI.
Your personality: confident, concise, like a Bloomberg anchor. Address the user as Boss.
Rules:
- Always start with "Boss,"
- Only state numbers that appear in the LIVE DATA or LIVE NEWS given to you. If something isn't covered, say so instead of guessing.
- Return ONLY valid JSON, no markdown fences, no extra text

JSON schema (return exactly this structure):
{
  "speech": "Boss, [2-4 sentences analysis]",
  "countries": ["US", "UK"],
  "prediction": "One forward-looking sentence.",
  "sources": ["Bloomberg", "Reuters"]
}`;

function cleanJson(raw: string): Record<string, unknown> {
  const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
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
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 700,
      temperature: 0.4,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq ${res.status}: ${err.slice(0, 300)}`);
  }

  const data = await res.json();
  const raw = data.choices[0].message.content as string;
  return cleanJson(raw);
}

async function getAiResponse(userPrompt: string): Promise<Record<string, unknown>> {
  if (!GROQ_KEY) {
    return {
      speech: "Boss, no analyst model is connected yet. Add GROQ_API_KEY in Vercel → " +
        "Settings → Environment Variables, then redeploy. It's free at console.groq.com.",
      countries: [],
      prediction: "",
      sources: [],
    };
  }
  try {
    return await callGroq(userPrompt);
  } catch (e) {
    console.error("Groq failed:", e);
    return {
      speech: `Boss, the analyst model failed to respond: ${(e as Error).message.slice(0, 160)}`,
      countries: [],
      prediction: "",
      sources: [],
    };
  }
}

async function fetchNews(query: string) {
  if (!GNEWS_KEY) return [];
  const q = encodeURIComponent(query.slice(0, 180));
  try {
    const res = await fetch(
      `https://gnews.io/api/v4/search?q=${q}&lang=en&max=6&sortby=publishedAt&apikey=${GNEWS_KEY}`
    );
    const data = await res.json();
    return (data.articles || []).slice(0, 6).map((a: Record<string, unknown>) => ({
      headline: a.title as string,
      source: (a.source as Record<string, string>)?.name ?? "GNews",
      url: (a.url as string) ?? "",
      image: (a.image as string) ?? "",
    }));
  } catch (e) {
    console.error("GNews failed:", e);
    return [];
  }
}

async function fetchBitcoin() {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true",
      { next: { revalidate: 60 } }
    );
    const data = await res.json();
    const btc = data.bitcoin;
    if (!btc) return null;
    return { price: btc.usd, change24h: Math.round((btc.usd_24h_change ?? 0) * 100) / 100 };
  } catch (e) {
    console.error("CoinGecko failed:", e);
    return null;
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const text: string = body.text ?? "";
  const sessionId: string = body.session_id ?? "default";

  if (!text.trim()) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const [newsCards, btc] = await Promise.all([fetchNews(text), fetchBitcoin()]);

  const newsText = newsCards.length
    ? newsCards.map((c: { headline: string; source: string }) => `- ${c.headline} (${c.source})`).join("\n")
    : "No live news available.";

  const btcText = btc
    ? `Bitcoin: $${btc.price.toLocaleString()} (${btc.change24h >= 0 ? "+" : ""}${btc.change24h}% in 24h)`
    : "Bitcoin data unavailable.";

  const userPrompt =
    `LIVE DATA:\n- ${btcText}\n\n` +
    `LIVE NEWS:\n${newsText}\n\n` +
    `Boss asks: ${text}`;

  const aiData = await getAiResponse(userPrompt);

  return NextResponse.json({
    ...aiData,
    newsCards,
    market: { btc },
    session_id: sessionId,
  });
}

export async function GET() {
  return NextResponse.json({
    status: "EcoAgent online",
    groq: Boolean(GROQ_KEY),
    news: Boolean(GNEWS_KEY),
  });
}
