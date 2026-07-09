// app/api/news-verification/verify/route.ts
// Proxies a news item to the external AI verifier so the mobile client can
// verify without needing the verifier URL / CORS. Server-side it uses the
// already-configured NEXT_PUBLIC_VERIFICATION_API.
import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

const VERIFIER = process.env.NEXT_PUBLIC_VERIFICATION_API;

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const { headline, content, source_url } = await request.json();
    if (!headline?.trim() || !content?.trim()) {
      return NextResponse.json({ error: 'headline and content are required' }, { status: 400 });
    }

    if (!VERIFIER) {
      // No verifier configured — return a manual-entry-style stub so the UI works.
      return NextResponse.json({
        verdict: 'Manual Entry',
        verification_data: { source_confidence: 50, ai_confidence_level: 'Manual', matched_sources: [] },
        llm_response: 'The AI verifier is not configured. This entry was recorded without automated analysis.',
        status_message: 'Verifier unavailable.',
      });
    }

    const res = await fetch(`${VERIFIER}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ headline, content, source_url: source_url ?? '' }),
      signal: AbortSignal.timeout(45_000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Verifier error', status: res.status }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      return NextResponse.json({ error: 'Verification timed out' }, { status: 504 });
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
