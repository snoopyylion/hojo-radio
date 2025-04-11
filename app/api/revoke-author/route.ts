import { supabaseAdmin } from "@/lib/supabase/admin";
import { sanityClient } from "@/lib/sanity/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { userId } = await req.json();

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  // 1. Update user role in Supabase
  const { error: updateError } = await supabaseAdmin
    .from("users")
    .update({ role: "user", author_request: false })
    .eq("id", userId);

  if (updateError) {
    console.error("Error updating user role:", updateError);
    return NextResponse.json({ error: "Revoke failed" }, { status: 500 });
  }

  // 2. Delete the author document from Sanity
  try {
    // Assuming you've stored a reference to `userId` inside the author document as `userId`
    const sanityQuery = `*[_type == "author" && userId == $userId][0]._id`;
    const authorId = await sanityClient.fetch(sanityQuery, { userId });

    if (authorId) {
      await sanityClient.delete(authorId);
    } else {
      console.warn("No matching author found in Sanity.");
    }
  } catch (error) {
    console.error("Error removing author from Sanity:", error);
    return NextResponse.json({ error: "Sanity deletion failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
