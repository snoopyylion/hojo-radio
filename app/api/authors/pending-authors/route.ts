import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Fetch all user information including first_name, last_name, and username
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("id, email, role, author_request, first_name, last_name, username, image_url")
      .eq("author_request", true);

    if (error) {
      console.error("Error fetching pending authors:", error);
      return NextResponse.json({ error: "Failed to fetch pending authors" }, { status: 500 });
    }

    return NextResponse.json({ users: data }, { status: 200 });
  } catch (err) {
    console.error("Server error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}