// app/api/podcast/test-route/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ 
    message: "Route works!",
    timestamp: new Date().toISOString()
  });
}

export async function POST() {
  return NextResponse.json({ 
    message: "POST works!",
    timestamp: new Date().toISOString()
  });
}