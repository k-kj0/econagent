import { NextRequest, NextResponse } from "next/server";

/* ── Env vars ─────────────────────────────────────────────────────────── */
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";
const ELEVEN_API_KEY = process.env.ELEVENLABS_API_KEY || "";
const ELEVEN_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "EXAVITQu4vr4xnSDxMaL";
const NEWS_API_KEY = process.env.NEWS_API_KEY || "";
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || "";

/* ── Types ─────────────────────────────────────────────────────────────── */
interface NewsCard {
  headline: string;
  source: string;
  url: string;
  image?: string;
}

/* ── Fetch news from NewsAPI ────────────────────────────────────────────── */
async function fetchNewsCards(query: string): Promise<NewsCard[]> {
  if (!NEWS_API_KEY) return [];
  try {
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&pageSize=3&sortBy=publishedAt&language=en&apiKey=${NEWS_API_KEY}`;
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.articles || []).slice(0, 3).map((a: any) => ({
      headline: a.title || "",
      source: a.source?.name || "",
      url: a.url || "#",
      image: a.urlToImage || undefined,
    }));
  } catch {
    return [];
  }
}

/* ── Fetch YouTube video ID ─────────────────────────────────────────────── */
async function fetchYoutubeId(query: string): Promise<string | null> {
  if (!YOUTUBE_API_KEY) return null;
  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query + " economics")}&type=video&maxResults=1&key=${YOUTUBE_API_KEY}`;
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const data = await res.json();
    return data.items?.[0]?.id?.videoId || null;
  } catch {
    return null;
  }
}

/* ── Build AI response via Claude ───────────────────────────────────────── */
async function getAIResponse(query: string): Promise<string> {
  if (!ANTHROPIC_API_KEY) {
    return `Economic briefing on "${query}": Our intelligence systems are processing your query. Key factors include market dynamics, policy signals, and global macro trends. Please ensure your API keys are configured for full briefings.`;
  }
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 400,
        system: `You are EcoAgent, an elite economic intelligence AI. You brief commanders on global economic developments with precision and authority. Be concise (2-4 sentences), factual, and use a confident intelligence analyst tone. No bullet points — flowing prose only.`,
        messages: [{ role: "user", content: query }],
      }),
    });
    if (!res.ok) throw new Error(`Claude API error: ${res.status}`);
    const data = await res.json();
    return data.content?.[0]?.text || "Unable to generate briefing.";
  } catch (err) {
    console.error("Claude error:", err);
    return "Intelligence systems temporarily offline. Please try again shortly.";
  }
}

/* ── Check if topic warrants YouTube ───────────────────────────────────── */
function shouldFetchYoutube(query: string): boolean {
  const triggers = ["explain", "how", "what is", "show me", "video", "watch", "tutorial", "what are"];
  return triggers.some(t => query.toLowerCase().includes(t));
}

/* ── POST handler ───────────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text: string = body.text || body.query || "";

    if (!text.trim()) {
      return NextResponse.json({ error: "No query provided" }, { status: 400 });
    }

    // Run fetches in parallel
    const [speech, newsCards, youtubeId] = await Promise.all([
      getAIResponse(text),
      fetchNewsCards(text),
      shouldFetchYoutube(text) ? fetchYoutubeId(text) : Promise.resolve(null),
    ]);

    // Extract a short prediction if the query is forward-looking
    const isForward = /will|forecast|predict|outlook|next|future|expect/i.test(text);
    const prediction = isForward
      ? `Based on current trends: monitor central bank signals and energy prices for directional confirmation.`
      : undefined;

    return NextResponse.json({
      speech,
      response: speech,
      sources: newsCards.map(n => n.source).filter(Boolean),
      newsCards,
      youtubeId,
      prediction,
    });
  } catch (err) {
    console.error("/api/ask error:", err);
    return NextResponse.json(
      { error: "Internal server error", speech: "I'm having trouble processing your request. Please try again." },
      { status: 500 }
    );
  }
}

/* ── OPTIONS for CORS (if needed) ──────────────────────────────────────── */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
