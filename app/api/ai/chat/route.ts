// POST /api/ai/chat
// Proxies the Voxra AI inbox chat to your Python agent backend.
// Your team implements: POST PYTHON_AI_BACKEND_URL/chat  (see AI_AGENT_CONTRACT.md)
// If PYTHON_AI_BACKEND_URL is unset, returns a stub reply so the UI works immediately.
import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

const PYTHON_BACKEND = process.env.PYTHON_AI_BACKEND_URL;

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const { messages, conversation_id } = await request.json();

    // Stub when Python backend is not yet connected
    if (!PYTHON_BACKEND) {
      return NextResponse.json({
        reply: "Hey! I'm Voxra AI — your personal assistant on Voxra. The AI backend isn't connected yet, but once it is I'll be able to help you discover content, answer questions, and more!",
        conversation_id,
      });
    }

    // Forward to Python backend
    const res = await fetch(`${PYTHON_BACKEND}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, conversation_id, messages }),
      // 30-second timeout for AI responses
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'AI backend error' }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      return NextResponse.json({ error: 'AI response timed out' }, { status: 504 });
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
