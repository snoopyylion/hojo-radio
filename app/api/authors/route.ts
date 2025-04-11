import { sanityClient } from "@/lib/sanity/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const query = `*[_type == "author"]{
      _id,
      name,
      userId,
      "image": image.asset->url
    }`;

    const authors = await sanityClient.fetch(query);
    return NextResponse.json({ authors });
  } catch (error) {
    console.error("Error fetching authors:", error);
    return NextResponse.json({ error: "Failed to fetch authors" }, { status: 500 });
  }
}
