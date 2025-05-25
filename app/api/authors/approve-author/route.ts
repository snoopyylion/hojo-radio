import { supabaseAdmin } from "@/lib/supabase/admin";
import { sanityClient } from "@/lib/sanity/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { userId } = await req.json();

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  // 1. Fetch user from Supabase (get current user info without modifying it)
  const { data: user, error: fetchError } = await supabaseAdmin
    .from("users")
    .select("id, first_name, last_name, email, image_url, username")
    .eq("id", userId)
    .single();

  if (fetchError || !user) {
    console.error("Error fetching user:", fetchError);
    return NextResponse.json({ error: "User fetch failed" }, { status: 500 });
  }

  // 2. Only update role and author_request status (don't modify other user info)
  const { error: updateError } = await supabaseAdmin
    .from("users")
    .update({ role: "author", author_request: false })
    .eq("id", userId);

  if (updateError) {
    console.error("Error updating user role:", updateError);
    return NextResponse.json({ error: "Approval failed" }, { status: 500 });
  }

  let sanityImageAsset = null;

  // 3. Upload image to Sanity if available (using existing user image)
  try {
    if (user.image_url && user.image_url.startsWith("http")) {
      const imageRes = await fetch(user.image_url);
      const imageBuffer = await imageRes.arrayBuffer();
      const file = Buffer.from(imageBuffer);

      sanityImageAsset = await sanityClient.assets.upload("image", file, {
        filename: `${user.first_name || user.username || "author"}-${userId}.jpg`,
        contentType: "image/jpeg",
      });
    }
  } catch (uploadError) {
    console.warn("Image upload failed:", uploadError); // non-fatal
  }

  // 4. Create author name using existing user data
  const fullName = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();
  const displayName = fullName || user.username || "Unnamed Author";
  
  // Create slug from display name or fallback to user ID
  const fallbackSlug = user.id;
  const slugValue = displayName !== "Unnamed Author"
    ? displayName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
    : fallbackSlug;

  // 5. Create author document in Sanity using existing user information
  try {
    const existingAuthor = await sanityClient.fetch(
      `*[_type == "author" && userId == $userId][0]`,
      { userId: user.id }
    );

    if (!existingAuthor) {
      await sanityClient.create({
        _type: "author",
        name: displayName,
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
        // Store additional user info for reference if needed
        email: user.email,
        ...(user.username && { username: user.username }),
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
      name: displayName,
      slug: slugValue,
      image: sanityImageAsset?._id ?? null,
    },
  });
}

export async function OPTIONS() {
  return NextResponse.json({}, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}