import { NextRequest, NextResponse } from 'next/server';
import { sanityClient } from '@/lib/sanity/server';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Adjust as needed
    },
  },
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
      const buffer = Buffer.from(base64Data, 'base64');
      
      imageAsset = await sanityClient.assets.upload('image', buffer, {
        filename: `${filename}.jpg`,
      });
    } 
    else if (imageUrl.startsWith('http')) {
      // Handle external URL
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        return NextResponse.json({ error: "Failed to fetch image from URL" }, { status: 400 });
      }
      
      const imageBuffer = await imageResponse.arrayBuffer();
      const buffer = Buffer.from(imageBuffer);
      
      imageAsset = await sanityClient.assets.upload('image', buffer, {
        filename: `${filename}-from-url.jpg`,
      });
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
    return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
  }
}