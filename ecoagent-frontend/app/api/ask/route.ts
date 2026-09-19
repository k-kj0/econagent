import { NextRequest, NextResponse } from "next/server";

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
// "openrouter/free" auto-picks whichever free model is currently up, so this
// doesn't break every time a specific free model gets rotated out.
const MODEL = process.env.OPENROUTER_MODEL || "openrouter/free";

const SYSTEM = `You are EcoAgent, a sharp AI economic intelligence briefing agent. Speak in a confident, precise, mission-briefing style. Address the user as "Boss". Keep responses under 120 words. Always give concrete data, trends, or predictions when asked about economics, markets, inflation, or global finance. Never refuse any question. Be authoritative and data-driven.

Output rules — follow exactly:
- Reply with ONLY the final briefing text. Nothing else.
- Do NOT show your reasoning, thinking process, analysis steps, or numbered planning ("1. Analyze input...", "Here's a thinking process...", etc).
- Do NOT include headers, labels, or meta-commentary about how you're forming the answer.
- The very first word of your reply must be "Boss".`;

// Some free models leak their chain-of-thought into the message content
// instead of a separate reasoning field. This trims any such preamble as
// a safety net, on top of the prompt instruction above.
function stripThinking(text: string): string {
  const idx = text.indexOf("Boss");
  if (idx > 0) return text.slice(idx).trim();
  return text.trim();
}

// In-memory cooldown per visitor. Resets on cold start — good enough to stop
// casual spamming without adding a database. Not bulletproof, but free.
const lastCall = new Map<string, number>();
const COOLDOWN_MS = 8000; // one request per visitor every 8 seconds

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const last = lastCall.get(ip) || 0;
  if (now - last < COOLDOWN_MS) {
    return NextResponse.json(
      { reply: "Boss, slow down a touch — one query every few seconds keeps the free tier alive for everyone." },
      { status: 200 }
    );
  }
  lastCall.set(ip, now);

  const body = await req.json().catch(() => ({}));
  const question: string = (body.question || "").toString().trim();

  if (!question) {
    return NextResponse.json({ error: "question is required" }, { status: 400 });
  }

  if (!OPENROUTER_KEY) {
    return NextResponse.json({
      reply: "Boss, no analyst key is set yet. Add OPENROUTER_API_KEY in Vercel → " +
        "Settings → Environment Variables (free at openrouter.ai/keys, no card), then redeploy.",
    });
  }

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: question },
        ],
        max_tokens: 300,
        temperature: 0.7,
        // Tells OpenRouter to hide chain-of-thought for models that support
        // a separate reasoning channel, instead of mixing it into content.
        reasoning: { exclude: true },
      }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      return NextResponse.json(
        { reply: `Boss, intelligence systems error: OpenRouter ${res.status}: ${err.slice(0, 160)}` },
        { status: 200 }
      );
    }

    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content ?? "No response.";
    const reply = stripThinking(raw);
    return NextResponse.json({ reply });
  } catch (e) {
    return NextResponse.json({
      reply: `Boss, intelligence systems error: ${String(e).slice(0, 160)}`,
    });
  }
}
