// /pages/api/posts/public.ts
import { NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity/server";

export async function GET() {
  const query = `*[_type == "post" && approved == true] | order(_createdAt desc){
    _id, title, content, _createdAt,
    "authorName": author->name,
    "likes": likes,
    "commentsCount": count(comments)
  }`;

  const posts = await sanityClient.fetch(query);
  return NextResponse.json({ posts });
}
