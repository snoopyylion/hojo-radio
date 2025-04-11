import { supabaseAdmin } from "@/lib/supabase/admin"; // make sure you're using the admin client
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { userId, email } = await req.json();
    console.log("Incoming request body:", { userId, email });

    if (!userId || !email) {
      return NextResponse.json({ error: "Missing user info" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("users")
      .update({ author_request: true })
      .eq("id", userId);

    if (error) {
      console.error("Error updating author_request:", error);
      return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }

    return NextResponse.json({ message: "Request submitted" }, { status: 200 });
  } catch (err) {
    console.error("Server error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
