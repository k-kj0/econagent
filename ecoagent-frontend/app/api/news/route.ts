import { NextResponse } from "next/server";

const GNEWS_KEY = process.env.GNEWS_API_KEY;

export async function GET() {
  if (!GNEWS_KEY) {
    return NextResponse.json({ headlines: [] });
  }

  try {
    const res = await fetch(
      `https://gnews.io/api/v4/top-headlines?category=business&lang=en&max=10&apikey=${GNEWS_KEY}`,
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return NextResponse.json({ headlines: [] });

    const data = await res.json();
    const headlines = (data.articles || [])
      .filter((a: Record<string, unknown>) => a.title)
      .map((a: Record<string, unknown>) =>
        `${a.title} · ${(a.source as Record<string, string>)?.name ?? "News"}`
      );

    return NextResponse.json({ headlines });
  } catch {
    return NextResponse.json({ headlines: [] });
  }
}
