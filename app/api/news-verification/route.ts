// /app/api/news-verification/route.ts
import { NextResponse } from 'next/server'

// Define the expected request body type
interface NewsVerificationRequest {
  headline: string
  content: string
  source_url?: string
}

// Define the expected response type from the backend (optional, adjust as needed)
interface VerificationResult {
  status: string
  verdict: string
  explanation?: string
}

export async function POST(request: Request) {
  try {
    const body: NewsVerificationRequest = await request.json()
    const { headline, content, source_url = '' } = body

    if (!headline || !content) {
      return NextResponse.json(
        { error: 'Both headline and content are required' },
        { status: 400 }
      )
    }

    const backendUrl = process.env.NEWS_VERIFICATION_API_URL

    if (!backendUrl) {
      return NextResponse.json(
        { error: 'Backend URL not configured' },
        { status: 500 }
      )
    }

    const response = await fetch(`${backendUrl}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ headline, content, source_url }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Backend responded with status: ${response.status}, message: ${errorText}`)
    }

    const result: VerificationResult = await response.json()
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error processing news verification:', error)
    return NextResponse.json(
      {
        error: 'Failed to verify news',
        details: error.message ?? 'Unknown error',
      },
      { status: 500 }
    )
  }
}
