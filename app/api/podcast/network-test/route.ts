// app/api/podcast/network-test/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ status: "ok" });
}

// Optional: handle HEAD requests too
export async function HEAD() {
  return new Response(null, { status: 200 });
}
