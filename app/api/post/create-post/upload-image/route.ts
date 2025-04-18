import { NextRequest, NextResponse } from 'next/server';
import { sanityClient } from '@/lib/sanity/server';

export const runtime = 'nodejs'; // Use Node.js runtime

// Helper function for fetching with timeout
const fetchWithTimeout = async (url: string, timeout = 10000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, { 
      signal: controller.signal,
      headers: {
        'Accept': 'image/*'
      }
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const imageUrl = formData.get('imageUrl') as string;
    const filename = formData.get('filename') as string || 'uploaded-image';
    
    if (!imageUrl) {
      return NextResponse.json({ error: "No image URL provided" }, { status: 400 });
    }

    // Process image based on type (base64 or external URL)
    let imageAsset;
    
    if (imageUrl.startsWith('data:')) {
      // Handle base64 image
      const base64Data = imageUrl.split(',')[1];
      if (!base64Data) {
        return NextResponse.json({ error: "Invalid base64 format" }, { status: 400 });
      }
      
      const buffer = Buffer.from(base64Data, 'base64');
      // Check size before uploading
      if (buffer.length > 5 * 1024 * 1024) { // 5MB limit
        return NextResponse.json({ error: "Image is too large (max 5MB)" }, { status: 400 });
      }
      
      imageAsset = await sanityClient.assets.upload('image', buffer, {
        filename: `${filename}.jpg`,
      });
    } 
    else if (imageUrl.startsWith('http')) {
      try {
        // Handle external URL with timeout
        const imageResponse = await fetchWithTimeout(imageUrl, 8000);
        if (!imageResponse.ok) {
          return NextResponse.json({ 
            error: `Failed to fetch image from URL: ${imageResponse.status}` 
          }, { status: 400 });
        }
        
        // Validate that it's an image
        const contentType = imageResponse.headers.get('content-type');
        if (!contentType || !contentType.includes('image')) {
          return NextResponse.json({ error: "URL does not point to an image" }, { status: 400 });
        }
        
        // Check file size
        const contentLength = imageResponse.headers.get('content-length');
        if (contentLength && parseInt(contentLength) > 5 * 1024 * 1024) { // 5MB limit
          return NextResponse.json({ error: "Image is too large (max 5MB)" }, { status: 400 });
        }
        
        const imageBuffer = await imageResponse.arrayBuffer();
        const buffer = Buffer.from(imageBuffer);
        
        imageAsset = await sanityClient.assets.upload('image', buffer, {
          filename: `${filename}-from-url.jpg`,
        });
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return NextResponse.json({ error: "Image fetch timed out" }, { status: 408 });
        }
        throw error;
      }
    }
    else {
      return NextResponse.json({ error: "Invalid image format" }, { status: 400 });
    }
    
    // Return the Sanity image reference
    return NextResponse.json({
      imageRef: {
        _type: 'image',
        asset: {
          _type: 'reference',
          _ref: imageAsset._id,
        }
      }
    });
} catch (error) {
    console.error("Error uploading image:", error);
    
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
  
    return NextResponse.json({ 
      error: `Failed to upload image: ${errorMessage}` 
    }, { status: 500 });
  }
}