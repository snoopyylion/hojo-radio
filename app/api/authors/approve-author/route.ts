import { supabaseAdmin } from "@/lib/supabase/admin";
import { sanityClient } from "@/lib/sanity/server"; // use server.ts if it has write access
import { NextResponse } from "next/server";

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
    if (user.image_url) {
      const imageRes = await fetch(user.image_url);
      const imageBuffer = await imageRes.arrayBuffer();
      const file = Buffer.from(imageBuffer);

      sanityImageAsset = await sanityClient.assets.upload("image", file, {
        filename: `${user.first_name || "author"}-${userId}.jpg`,
      });
    }
  } catch (uploadError) {
    console.warn("Image upload failed:", uploadError); // non-fatal
  }

  // 4. Create author document in Sanity
  try {
    await sanityClient.create({
      _type: "author",
      name: `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() || "Unnamed Author",
      userId: user.id, // 👈 Add Clerk/Supabase ID
      slug: {
        current:
          `${user.first_name ?? ""}-${user.last_name ?? ""}`
            .toLowerCase()
            .replace(/\s+/g, "-") || user.id,
      },
      ...(sanityImageAsset && {
        image: {
          _type: "image",
          asset: {
            _type: "reference",
            _ref: sanityImageAsset._id,
          },
        },
      }),
      bio: [], // optional empty bio
    });
  } catch (sanityError) {
    console.error("Error creating author in Sanity:", sanityError);
    return NextResponse.json({ error: "Sanity creation failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
