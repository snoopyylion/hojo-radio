import { NextRequest, NextResponse } from 'next/server';
import { sanityClient } from '@/lib/sanity/server';

export async function POST(req: NextRequest) {
  const { title, slug, authorId, body, categoryIds, image } = await req.json();

  // Step 1: Fetch the correct Sanity Author _id using userId
  const authorDoc = await sanityClient.fetch(
    `*[_type == "author" && userId == $userId][0]{ _id }`,
    { userId: authorId }
  );

  if (!authorDoc?._id) {
    return NextResponse.json({ error: "Author not found in Sanity" }, { status: 404 });
  }

  try {
    // For the image, we need to upload it to Sanity first if it's a base64 string or URL
    let mainImage = null;
    
    if (image) {
      // If image is a base64 string or URL from outside Sanity
      if (typeof image === 'string' && (image.startsWith('data:') || image.startsWith('http'))) {
        // For base64 images
        if (image.startsWith('data:')) {
          // Extract base64 data
          const base64Data = image.split(',')[1];
          const buffer = Buffer.from(base64Data, 'base64');
          
          // Upload to Sanity
          const imageAsset = await sanityClient.assets.upload('image', buffer, {
            filename: `${slug}-main-image.jpg`,
          });
          
          // Create the image reference
          mainImage = {
            _type: 'image',
            asset: {
              _type: 'reference',
              _ref: imageAsset._id,
            },
          };
        } 
        // For external URLs
        else if (image.startsWith('http')) {
          // Fetch the image
          const imageResponse = await fetch(image);
          const imageBuffer = await imageResponse.arrayBuffer();
          const buffer = Buffer.from(imageBuffer);
          
          // Upload to Sanity
          const imageAsset = await sanityClient.assets.upload('image', buffer, {
            filename: `${slug}-main-image-from-url.jpg`,
          });
          
          // Create the image reference
          mainImage = {
            _type: 'image',
            asset: {
              _type: 'reference',
              _ref: imageAsset._id,
            },
          };
        }
      } 
      // If it's already a Sanity image object
      else if (typeof image === 'object' && image._type === 'image') {
        mainImage = image;
      }
    }

    const result = await sanityClient.create({
      _type: 'post',
      title,
      slug: { _type: 'slug', current: slug },
      author: { _type: 'reference', _ref: authorDoc._id },
      categories: categoryIds.map((id: string) => ({ _type: 'reference', _ref: id })),
      mainImage: mainImage, // Use the properly processed image
      publishedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      body,
      status: 'pending',
      rejectionReason: '',
      likes: [],
      comments: [],
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error('Error creating post:', err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}