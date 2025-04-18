"use server";

import { auth } from "@clerk/nextjs/server";
import { parseServerActionResponse } from "./utils";
import slugify from "slugify";
import { writeClient } from "@/sanity/lib/write-client";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const createPostItem = async (state: any, form: FormData) => {
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

        // Upload the image to Sanity
        let mainImage = null;
        try {
            if (imageUrl) {
                const response = await fetch(imageUrl);
                if (!response.ok) {
                    throw new Error(`Image fetch failed: ${response.status}`);
                }
                
                const contentType = response.headers.get('Content-Type');
                if (!contentType?.startsWith('image/')) {
                    throw new Error('URL does not point to an image');
                }
                
                const imageBlob = await response.blob();
                const imageAsset = await writeClient.assets.upload('image', imageBlob, {
                    filename: `${slug}-main-image.jpg`,
                });
                
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
                error: "Failed to upload image. Please check URL and try again.", 
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