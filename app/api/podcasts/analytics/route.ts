// app/api/podcasts/analytics/route.ts
import {  NextResponse } from 'next/server';

export async function GET() {
  // Mock real-time analytics
  const analytics = {
    listeners: Math.floor(Math.random() * 100) + 10,
    likes: Math.floor(Math.random() * 50),
    comments: Math.floor(Math.random() * 20),
    countries: ['US', 'UK', 'CA', 'AU'],
    peakListeners: Math.floor(Math.random() * 150) + 50
  };
  
  return NextResponse.json({ 
    success: true, 
    analytics 
  });
}