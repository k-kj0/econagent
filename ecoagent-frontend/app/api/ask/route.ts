import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  const { text } = await req.json();

  let newsCards: any[] = [];
  let newsText = "No live news available.";
  try {
    const r = await fetch(
      `https://newsapi.org/v2/top-headlines?language=en&pageSize=5&apiKey=${process.env.NEWS_API_KEY}`
    );
    const d = await r.json();
    newsCards = (d.articles || []).slice(0, 5).map((a: any) => ({
      headline: a.title,
      source: a.source?.name || "Unknown",
      url: a.url,
      image: a.urlToImage || "",
    }));
    newsText = newsCards.map((c: any) => `- ${c.headline} (${c.source})`).join("\n");
  } catch {}

  let ytLinks: any[] = [];
  try {
    const r = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(text)}&type=video&maxResults=3&key=${process.env.YOUTUBE_API_KEY}`
    );
    const d = await r.json();
    ytLinks = (d.items || []).map((i: any) => ({
      title: i.snippet.title,
      url: `https://youtube.com/watch?v=${i.id.videoId}`,
      thumbnail: i.snippet.thumbnails.default.url,
    }));
  } catch {}

  let speech = "Boss, systems initializing. Stand by.";
  let countries: string[] = [];
  let prediction = "";
  let sources: string[] = ["NewsAPI", "Gemini"];

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text:
            `You are EcoAgent, elite global intelligence AI. Always call user Boss. Be confident like a Bloomberg anchor.
User asked: ${text}
Live news: ${newsText}
Return ONLY valid JSON, no markdown, no code blocks:
{"speech":"Boss, [2-3 sentences]","countries":["US","GB"],"prediction":"one sentence","sources":["NewsAPI","Gemini"]}`
          }]}]
        }),
      }
    );
    const d = await r.json();
    let raw = d.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    raw = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(raw);
    speech = parsed.speech || speech;
    countries = parsed.countries || [];
    prediction = parsed.prediction || "";
    sources = parsed.sources || sources;
  } catch (e: any) {
    speech = `Boss, processing your request. Error: ${e?.message}`;
  }

  let audioUrl = "";
  try {
    const elevenRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": process.env.ELEVENLABS_API_KEY!,
        },
        body: JSON.stringify({
          text: speech,
          model_id: "eleven_monolingual_v1",
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      }
    );
    if (elevenRes.ok) {
      const buf = await elevenRes.arrayBuffer();
      audioUrl = `data:audio/mpeg;base64,${Buffer.from(buf).toString("base64")}`;
    }
  } catch {}

  try {
    await supabase.from("conversations").insert({
      user_query: text, eco_speech: speech, countries, sources,
    });
  } catch {}

  return NextResponse.json({ speech, countries, prediction, sources, newsCards, ytLinks, audioUrl });
}
