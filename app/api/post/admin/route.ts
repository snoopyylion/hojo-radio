// /pages/api/posts/admin.ts
import { NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity/server";
import { auth } from "@clerk/nextjs/server";

// This function is for fetching posts based on their status
export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Optional: You can also check if the user is an admin here (via Supabase or Clerk roles)

  // Define the status filter (can be "approved", "rejected", etc.)
  const status = req.url.split('?status=')[1] || 'approved'; // Default to 'approved' if no status is provided

  // Use the POSTS_BY_STATUS_QUERY to fetch posts by status
  const query = `
    *[_type == "post" && status == $status] | order(_createdAt desc) {
      _id, 
      title, 
      content, 
      status, 
      _createdAt,
      "authorName": author->name,
      "likes": likes,
      "commentsCount": count(comments)
    }
  `;

  try {
    const posts = await sanityClient.fetch(query, { status });
    return NextResponse.json({ posts });
  } catch (error) {
    console.error("Error fetching posts:", error);
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
  }
}
