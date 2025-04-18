"use server";

import { auth } from "@clerk/nextjs/server";
import { parseServerActionResponse } from "./utils";
import slugify from "slugify";
import { writeClient } from "@/sanity/lib/write-client";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Define response type
interface ActionState {
  error: string;
  status: "INITIAL" | "ERROR" | "SUCCESS";
  _id?: string;
}

export const createPostItem = async (state: ActionState, form: FormData) => {
  const { userId } = await auth();

  if (!userId) {
    return parseServerActionResponse({ error: "Unauthorized", status: "ERROR" });
  }

  try {
    // Check user role
    const { data: user, error: fetchUserError } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("id", userId)
      .single();

    if (fetchUserError || !user || user.role !== "author") {
      return parseServerActionResponse({ error: "User is not an author or role not found", status: "ERROR" });
    }

    // Get form data
    const title = form.get("title") as string;
    const description = form.get("description") as string;
    const rawBody = form.get("body") as string;
    const imageUrl = form.get("imageUrl") as string;
    const categoryIds = Array.from(new Set(
      form.getAll("categoryIds").filter((id): id is string => typeof id === "string")
    ));

    const slug = slugify(title, { lower: true, strict: true });

    // Validate required data
    if (!title || !rawBody || !description || !imageUrl) {
      return parseServerActionResponse({ error: "Missing required fields", status: "ERROR" });
    }

    if (categoryIds.length === 0) {
      return parseServerActionResponse({ error: "At least one category is required", status: "ERROR" });
    }

    // Get author reference
    const authorDoc = await writeClient.fetch(
      `*[_type == "author" && userId == $userId][0]{ _id }`,
      { userId }
    );

    if (!authorDoc?._id) {
      return parseServerActionResponse({ error: "Author not found in Sanity", status: "ERROR" });
    }

    // Convert markdown to portable text blocks (simplified version)
    const bodyBlocks = rawBody.split('\n\n')
      .filter(block => block.trim().length > 0)
      .map((block, index) => {
        // Basic parsing for headings
        let style = 'normal';
        let text = block;

        if (block.startsWith('# ')) {
          style = 'h1';
          text = block.substring(2);
        } else if (block.startsWith('## ')) {
          style = 'h2';
          text = block.substring(3);
        } else if (block.startsWith('### ')) {
          style = 'h3';
          text = block.substring(4);
        }

        return {
          _type: 'block',
          _key: `block_${Date.now()}_${index}`,
          style,
          children: [{
            _type: 'span',
            _key: `span_${Date.now()}_${index}`,
            text
          }]
        };
      });

    // Upload the image to Sanity with optimized fetching and timeout
let mainImage = null;
try {
  if (imageUrl) {
    let imageAsset;
    
    // Check if it's a data URL (base64)
    if (imageUrl.startsWith('data:image/')) {
      // Extract content type and base64 data
      const contentType = imageUrl.split(';')[0].split(':')[1];
      const base64Data = imageUrl.split(',')[1];
      const blobData = Buffer.from(base64Data, 'base64');
      
      // Set upload timeout
      const uploadTimeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Image upload timed out')), 90000); // 90 seconds
      });
      
      // Upload directly to Sanity without fetch
      const uploadPromise = writeClient.assets.upload('image', blobData, {
        filename: `${slug}-main-image.jpg`,
        contentType: contentType || 'image/jpeg'
      });
      
      // Race between upload and timeout
      imageAsset = await Promise.race([uploadPromise, uploadTimeoutPromise]) as any;
    } else {
      // Regular URL handling (not blob: or data:)
      // Add a timeout to the fetch operation
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 seconds timeout
      
      const response = await fetch(imageUrl, {
        signal: controller.signal,
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Image fetch failed: ${response.status}`);
      }
      
      const contentType = response.headers.get('Content-Type');
      if (!contentType?.startsWith('image/')) {
        throw new Error('URL does not point to an image');
      }
      
      const imageBlob = await response.blob();
      
      // Check image size for regular URLs
      if (imageBlob.size > 5 * 1024 * 1024) {
        throw new Error('Image from URL is too large (max 5MB). Please use file upload with compression instead.');
      }
      
      // Upload to Sanity with a timeout
      const uploadTimeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Image upload timed out')), 90000); // 90 seconds
      });
      
      const uploadPromise = writeClient.assets.upload('image', imageBlob, {
        filename: `${slug}-main-image.jpg`,
        contentType: contentType || 'image/jpeg'
      });
      
      // Race between upload and timeout
      imageAsset = await Promise.race([uploadPromise, uploadTimeoutPromise]) as any;
    }
    
    // Create image reference once we have the asset
    if (imageAsset && imageAsset._id) {
      mainImage = {
        _type: "image",
        asset: {
          _type: "reference",
          _ref: imageAsset._id,
        },
      };
    }
  }
    } catch (imageError) {
      console.error("Image upload error:", imageError);
      return parseServerActionResponse({
        error: "Failed to upload image. If using a URL, please use a smaller image or try the file upload option with compression.",
        status: "ERROR"
      });
    }

    if (!mainImage) {
      return parseServerActionResponse({
        error: "Image upload failed. Please try a different image URL.",
        status: "ERROR"
      });
    }

    // Create post document with unique keys for arrays
    const postItem = {
      title,
      description,
      slug: {
        _type: "slug",
        current: slug,
      },
      author: {
        _type: "reference",
        _ref: authorDoc._id,
      },
      categories: categoryIds.map((id, index) => ({
        _type: "reference",
        _ref: id,
        _key: `category_${Date.now()}_${index}`
      })),
      mainImage,
      body: bodyBlocks,
      publishedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      status: "pending",
    };
    const result = await writeClient.create({
      _type: "post",
      ...postItem,
    });

    return parseServerActionResponse({
      ...result,
      error: "",
      status: "SUCCESS",
    });
  } catch (error) {
    console.error("Error creating post:", error);
    return parseServerActionResponse({
      error: error instanceof Error ? error.message : "Unknown error creating post",
      status: "ERROR"
    });
  }
};