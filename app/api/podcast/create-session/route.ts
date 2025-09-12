// app/api/podcast/create-session/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
    try {
        // Get authenticated user
        const { userId } = await auth();
        console.log('Create session request from user:', userId);
        
        if (!userId) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = await req.json();
        const { title, description } = body;
        console.log('Session details:', { title, description });

        if (!title) {
            return NextResponse.json(
                { error: "Title is required" },
                { status: 400 }
            );
        }

        // Get user details
        const { data: user, error: userError } = await supabase
            .from("users")
            .select("role, first_name, last_name")
            .eq("id", userId)
            .single();

        console.log('User details:', user, 'Error:', userError);

        if (userError || !user) {
            console.error("User fetch error:", userError);
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
        }

        if (user.role !== 'author') {
            return NextResponse.json(
                { error: "Only authors can create sessions" },
                { status: 403 }
            );
        }

        // Check if user already has an active session
        const { data: existingSession, error: existingError } = await supabase
            .from("live_sessions")
            .select("id, title")
            .eq("author_id", userId)
            .eq("is_active", true)
            .maybeSingle(); // Use maybeSingle instead of single to avoid error when no rows found

        console.log('Existing session check:', existingSession, 'Error:', existingError);

        if (existingSession) {
            return NextResponse.json(
                { error: "You already have an active session", existingSession },
                { status: 400 }
            );
        }

        // Generate unique room name
        const roomName = `room-${userId}-${Date.now()}`;
        console.log('Creating session with room name:', roomName);

        // Create the session
        const sessionData = {
            author_id: userId,
            author_name: `${user.first_name} ${user.last_name}`.trim() || user.first_name || 'Unknown Author',
            title,
            description: description || null,
            room_name: roomName,
            started_at: new Date().toISOString(),
            is_active: true,
            listener_count: 0,
        };

        console.log('Inserting session data:', sessionData);

        const { data: session, error } = await supabase
            .from("live_sessions")
            .insert(sessionData)
            .select()
            .single();

        if (error) {
            console.error("Database insert error:", error);
            return NextResponse.json(
                { error: "Failed to create session", details: error.message },
                { status: 500 }
            );
        }

        console.log('Session created successfully:', session);

        // Transform the response to match frontend expectations
        const transformedSession = {
            id: session.id,
            authorId: session.author_id,
            authorName: session.author_name,
            title: session.title,
            description: session.description,
            roomName: session.room_name,
            startedAt: session.started_at,
            listenerCount: session.listener_count,
            isActive: session.is_active,
        };

        return NextResponse.json({ 
            session: transformedSession, 
            roomName: session.room_name,
            success: true
        });
    } catch (error) {
        console.error("Session creation error:", error);
        return NextResponse.json(
            { error: "Internal server error", details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}