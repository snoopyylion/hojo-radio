"use server";

import { auth } from "@clerk/nextjs/server";
import { parseServerActionResponse } from "./utils";
import slugify from "slugify";
import { writeClient } from "@/sanity/lib/write-client";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const createPostItem = async (state: any, form: FormData) => {
    const { userId } = await auth();
    console.log("Starting post creation for user:", userId);
    
    if (!userId) {
        console.log("Unauthorized attempt - no userId");
        return parseServerActionResponse({ error: "Unauthorized", status: "ERROR" });
    }

    try {
        const { data: user, error: fetchUserError } = await supabaseAdmin
            .from("users")
            .select("role")
            .eq("id", userId)
            .single();

        if (fetchUserError || !user || user.role !== "author") {
            return parseServerActionResponse({ error: "User is not an author or role not found", status: "ERROR" });
        }

        const title = form.get("title") as string;
        const rawBody = form.get("body") as string;
        const rawImageUrl = form.get("imageUrl") as string;
        const categoryIds = Array.from(new Set(
            form.getAll("categoryIds").filter((id): id is string => typeof id === "string")
          ));
          

        const slug = slugify(title, { lower: true, strict: true });

        console.log("Form data received:");
        
        // Validate required data
        if (!title || !rawBody) {
            return parseServerActionResponse({ error: "Missing required fields", status: "ERROR" });
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

        // Handle image upload
        let mainImage = null;
        if (rawImageUrl && typeof rawImageUrl === "string" && rawImageUrl.length > 0) {
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
                console.error("Failed to upload image, setting mainImage to null");
            }
        }

        // Create post document with unique keys for arrays
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
            categories: categoryIds.map((id, index) => ({ 
                _type: "reference", 
                _ref: id,
                _key: `category_${id}_${Date.now()}_${index}` // Ensure uniqueness
            })),
            ...(mainImage ? { mainImage } : {}),
            body: bodyBlocks,
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
        console.error("Error creating post:", error);
        return parseServerActionResponse({ 
            error: error instanceof Error ? error.message : "Unknown error creating post", 
            status: "ERROR" 
        });
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
        // Add timeout to fetch request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        try {
          const imageResponse = await fetch(imageUrl, { 
            signal: controller.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
          });
          
          clearTimeout(timeoutId);
          
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
        } catch (fetchError) {
          clearTimeout(timeoutId);
          console.error("Fetch error details:", fetchError);
          
          // If the image fetch fails, you could try a fallback approach
          // For example, use a default image or return null
          return null;
        }
      }
    } catch (error) {
      console.error("Error in uploadImageToSanity:", error);
    }
    return null;
  }
