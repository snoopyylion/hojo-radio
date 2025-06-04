// app/api/user/created-at/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET() {
  try {
    // Get the authenticated user from Clerk
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized - No user ID found" },
        { status: 401 }
      );
    }

    // Query Supabase to get the user's created_at timestamp
    const { data: userData, error } = await supabase
      .from("users")
      .select("created_at, first_name, last_name, email")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("❌ Error fetching user created_at:", error);
      return NextResponse.json(
        { error: "Failed to fetch user data" },
        { status: 500 }
      );
    }

    if (!userData) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Return the created_at timestamp and basic user info
    return NextResponse.json({
      success: true,
      data: {
        created_at: userData.created_at,
        first_name: userData.first_name,
        last_name: userData.last_name,
        email: userData.email,
        member_since: new Date(userData.created_at).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      }
    });

  } catch (error) {
    console.error("❌ API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Optional: Add a POST method to update the created_at if needed
export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { created_at } = body;

    if (!created_at) {
      return NextResponse.json(
        { error: "created_at is required" },
        { status: 400 }
      );
    }

    // Update the user's created_at timestamp
    const { data: updatedUser, error } = await supabase
      .from("users")
      .update({ 
        created_at: new Date(created_at).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", userId)
      .select()
      .single();

    if (error) {
      console.error("❌ Error updating user created_at:", error);
      return NextResponse.json(
        { error: "Failed to update user data" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "User created_at updated successfully",
      data: updatedUser
    });

  } catch (error) {
    console.error("❌ API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}