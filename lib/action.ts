"use server";

import { auth } from "@clerk/nextjs/server";
import { parseServerActionResponse } from "./utils";
import slugify from "slugify";
import { writeClient } from "@/sanity/lib/write-client";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export const createPostItem = async (state: any, form: FormData) => {
    const { userId } = await auth();
    console.log("Starting post creation for user:", userId);

    if (!userId) {
        console.log("Unauthorized attempt - no userId");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: user, error: fetchUserError } = await supabaseAdmin
        .from("users")
        .select("role")
        .eq("id", userId)
        .single();

    if (fetchUserError || !user || user.role !== "author") {
        return parseServerActionResponse({ error: "User is not an author or role not found", status: "ERROR" });
    }

    const title = form.get("title") as string;
    const description = form.get("description") as string;
    const body = form.get("body") as string;
    const rawImageUrl = form.get("imageUrl");
    const categoryIds = form.getAll("categoryIds").filter((id): id is string => typeof id === "string");

    const slug = slugify(title, { lower: true, strict: true });

    try {
        console.log("Form data received:");
        const authorDoc = await writeClient.fetch(
            `*[_type == "author" && userId == $userId][0]{ _id }`,
            { userId }
        );

        if (!authorDoc?._id) {
            return parseServerActionResponse({ error: "Author not found in Sanity", status: "ERROR" });
        }

        // Fix the mainImage handling in your action.ts
        let mainImage: { _type: "image"; asset: { _type: "reference"; _ref: string } } | null = null;

        if (rawImageUrl instanceof File && rawImageUrl.size > 0) {
            // Your existing File handling code...
        } else if (typeof rawImageUrl === "string" && rawImageUrl.length > 0) {
            const imageAsset = await uploadImageToSanity(rawImageUrl, slug);
            if (imageAsset) {
                mainImage = {
                    _type: "image",
                    asset: {
                        _type: "reference",
                        _ref: imageAsset._id,
                    },
                };
            } else {
                // If uploadImageToSanity fails, don't set mainImage at all
                // rather than setting it to a plain string
                console.error("Failed to upload image, setting mainImage to null");
                mainImage = null;
            }
        }

        // Only include mainImage in the document if it's properly formatted
        const postItem = {
            _type: "post",
            title,
            slug: {
                _type: "slug",
                current: slug,
            },
            author: {
                _type: "reference",
                _ref: authorDoc._id,
            },
            categories: categoryIds.map(id => ({ _type: "reference", _ref: id })),
            ...(mainImage ? { mainImage } : {}), // Only include if properly formatted
            body,
            publishedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            status: "pending",
            likes: [],
            comments: [],
        };

        const result = await writeClient.create(postItem);

        return parseServerActionResponse({
            ...result,
            error: "",
            status: "SUCCESS",
        });
    } catch (error) {
        console.error("Sanity Error:", error);
        return parseServerActionResponse({ error: JSON.stringify(error), status: "ERROR" });
    }
};

async function uploadImageToSanity(imageUrl: string, slug: string) {
    try {
        if (imageUrl.startsWith("data:")) {
            const base64Data = imageUrl.split(",")[1];
            const buffer = Buffer.from(base64Data, "base64");
            return await writeClient.assets.upload("image", buffer, {
                filename: `${slug}-main-image.jpg`,
            });
        } else if (imageUrl.startsWith("http")) {
            const imageResponse = await fetch(imageUrl);

            if (!imageResponse.ok) {
                console.error(`Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`);
                return null;
            }

            const imageArrayBuffer = await imageResponse.arrayBuffer();
            const imageBlob = new Blob([imageArrayBuffer], {
                type: imageResponse.headers.get("content-type") || "image/jpeg",
            });

            return await writeClient.assets.upload("image", imageBlob, {
                filename: `${slug}-main-image-from-url.jpg`,
            });
        }
    } catch (error) {
        console.error("Error in uploadImageToSanity:", error);
    }
    return null;
}
