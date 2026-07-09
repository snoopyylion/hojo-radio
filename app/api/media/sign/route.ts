// POST /api/media/sign
// Returns a signed Cloudinary upload signature so the mobile client can upload
// directly to Cloudinary without routing large blobs through this server.
//
// Required env vars:
//   CLOUDINARY_CLOUD_NAME
//   CLOUDINARY_API_KEY
//   CLOUDINARY_API_SECRET
import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Body: { folder?: 'feed' | 'stories' | 'podcasts' | 'avatars' | 'music', transformation?: string }
//
// Cloudinary verifies the signature against EVERY upload parameter except
// file, api_key and resource_type. So whatever the client will send must be
// signed here too, or the upload fails with "Invalid Signature".
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const folder = (['feed', 'stories', 'podcasts', 'avatars', 'music'].includes(body.folder)
      ? `voxra/${body.folder}`
      : 'voxra/feed') as string;

    const transformation = typeof body.transformation === 'string' && body.transformation
      ? body.transformation
      : undefined;

    // Only send a preset if one is actually configured; a non-existent preset
    // name is rejected by Cloudinary.
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || undefined;

    const timestamp = Math.round(Date.now() / 1000);

    const params: Record<string, string | number> = { folder, timestamp };
    if (transformation) params.transformation = transformation;
    if (uploadPreset) params.upload_preset = uploadPreset;

    const signature = cloudinary.utils.api_sign_request(
      params,
      process.env.CLOUDINARY_API_SECRET!,
    );

    return NextResponse.json({
      signature,
      timestamp,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      folder,
      transformation,
      uploadPreset,
    });
  } catch (error) {
    console.error('/api/media/sign error:', error);
    return NextResponse.json({ error: 'Failed to generate upload signature' }, { status: 500 });
  }
}
