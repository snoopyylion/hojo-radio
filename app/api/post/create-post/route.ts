import { NextRequest, NextResponse } from 'next/server';
import { sanityClient } from '@/lib/sanity/server';

export async function POST(req: NextRequest) {
  try {
    // Handle FormData instead of JSON
    const formData = await req.formData();
    
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const body = formData.get('body') as string;
    const slug = formData.get('slug') as string || title.toLowerCase().replace(/\s+/g, '-');
    const authorId = formData.get('authorId') as string;
    const imageRef = formData.get('imageRef') as string;
    
    // Get categoryIds as an array
    const categoryIds = formData.getAll('categoryIds') as string[];

    // Step 1: Fetch the correct Sanity Author _id using userId
    const authorDoc = await sanityClient.fetch(
      `*[_type == "author" && userId == $userId][0]{ _id }`,
      { userId: authorId }
    );

    if (!authorDoc?._id) {
      return NextResponse.json({ error: "Author not found in Sanity" }, { status: 404 });
    }

    // Parse the imageRef if it's a JSON string
    let mainImage = null;
    if (imageRef) {
      try {
        mainImage = typeof imageRef === 'string' ? JSON.parse(imageRef) : imageRef;
      } catch (err) {
        console.error('Error parsing image reference:', err);
      }
    }

    const result = await sanityClient.create({
      _type: 'post',
      title,
      description,
      slug: { _type: 'slug', current: slug },
      author: { _type: 'reference', _ref: authorDoc._id },
      categories: categoryIds.map((id: string) => ({ _type: 'reference', _ref: id })),
      mainImage, // Use the pre-uploaded image reference
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