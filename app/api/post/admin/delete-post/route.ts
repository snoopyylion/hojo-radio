// /pages/api/posts/delete-post.ts
import { NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity/server";
import { auth } from "@clerk/nextjs/server";

export async function DELETE(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { postId } = await req.json();

  if (!postId) return NextResponse.json({ error: "Post ID is required" }, { status: 400 });

  try {
    await sanityClient
  .patch(postId)
  .set({ deleted: true })
  .commit();
    return NextResponse.json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error("Failed to delete post", error);
    return NextResponse.json({ error: "Error deleting post" }, { status: 500 });
  }
}
