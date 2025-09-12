// app/api/livekit/token/route.ts
import { NextResponse, NextRequest } from "next/server";
import { AccessToken, VideoGrant } from "livekit-server-sdk";
import { auth } from "@clerk/nextjs/server";

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY!;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET!;

export async function GET(req: NextRequest) {
  try {
    // Verify user is authenticated
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" }, 
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const roomName = url.searchParams.get("room");
    const identity = url.searchParams.get("identity");
    const role = url.searchParams.get("role") || "listener";

    if (!roomName || !identity) {
      return NextResponse.json(
        { error: "Missing room or identity" }, 
        { status: 400 }
      );
    }

    // Verify the identity matches the authenticated user
    if (identity !== userId) {
      return NextResponse.json(
        { error: "Identity mismatch" }, 
        { status: 403 }
      );
    }

    const at = new AccessToken(
      LIVEKIT_API_KEY,
      LIVEKIT_API_SECRET,
      { 
        identity, 
        ttl: 60 * 60, // 1 hour
        name: `User-${identity}`
      }
    );

    const grant: VideoGrant = {
      room: roomName,
      roomJoin: true,
      canPublish: role === "author", // Only authors can publish audio
      canSubscribe: true, // Everyone can listen
      canPublishData: role === "author", // Authors can send metadata
    };

    at.addGrant(grant);
    const token = await at.toJwt();

    return NextResponse.json({ 
      token,
      room: roomName,
      identity,
      canPublish: role === "author"
    });
  } catch (error) {
    console.error("Token generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    );
  }
}