import { supabaseAdmin } from "@/lib/supabase/admin";
import { sanityClient } from "@/lib/sanity/server"; // use server.ts if it has write access
import { NextResponse } from "next/server";
export const runtime = "nodejs"; // Add this at the top of your file


export async function POST(req: Request) {
  const { userId } = await req.json();

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  // 1. Fetch user from Supabase
  const { data: user, error: fetchError } = await supabaseAdmin
    .from("users")
    .select("id, first_name, last_name, email, image_url")
    .eq("id", userId)
    .single();

  if (fetchError || !user) {
    console.error("Error fetching user:", fetchError);
    return NextResponse.json({ error: "User fetch failed" }, { status: 500 });
  }

  // 2. Update user role
  const { error: updateError } = await supabaseAdmin
    .from("users")
    .update({ role: "author", author_request: false })
    .eq("id", userId);

  if (updateError) {
    console.error("Error updating user role:", updateError);
    return NextResponse.json({ error: "Approval failed" }, { status: 500 });
  }

  let sanityImageAsset = null;

  // 3. Upload image to Sanity if available
  try {
    if (user.image_url && user.image_url.startsWith("http")) {
      const imageRes = await fetch(user.image_url);
      const imageBuffer = await imageRes.arrayBuffer();
      const file = Buffer.from(imageBuffer);

      sanityImageAsset = await sanityClient.assets.upload("image", file, {
        filename: `${user.first_name || "author"}-${userId}.jpg`,
        contentType: "image/jpeg",
      });
    }
  } catch (uploadError) {
    console.warn("Image upload failed:", uploadError); // non-fatal
  }
  

  const fullName = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();
  const fallbackSlug = user.id;
  const slugValue = fullName
  ? fullName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
  : fallbackSlug;
  // 4. Create author document in Sanity
  try {
    const existingAuthor = await sanityClient.fetch(
      `*[_type == "author" && userId == $userId][0]`,
      { userId: user.id }
    );
    if (!existingAuthor) {
      await sanityClient.create({
        _type: "author",
        name: fullName || "Unnamed Author",
        userId: user.id,
        slug: { current: slugValue },
        ...(sanityImageAsset && {
          image: {
            _type: "image",
            asset: {
              _type: "reference",
              _ref: sanityImageAsset._id,
            },
          },
        }),
        bio: [],
      });
    }
  } catch (sanityError) {
    console.error("Error creating author in Sanity:", sanityError);
    return NextResponse.json({ error: "Sanity creation failed" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    userId: user.id,
    sanityAuthor: {
      name: fullName,
      slug: slugValue,
      image: sanityImageAsset?._id ?? null,
    },
  });
}
export async function OPTIONS() {
  return NextResponse.json({}, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*", // or restrict to your domain
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
