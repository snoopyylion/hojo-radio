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

// Body: { folder?: 'feed' | 'stories' | 'podcasts' | 'avatars' | 'music', eager?: string }
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const folder = (['feed', 'stories', 'podcasts', 'avatars', 'music'].includes(body.folder)
      ? `voxra/${body.folder}`
      : 'voxra/feed') as string;

    const timestamp = Math.round(Date.now() / 1000);

    const params: Record<string, string | number> = {
      folder,
      timestamp,
      upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET ?? 'voxra_uploads',
    };

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
      uploadPreset: params.upload_preset,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to generate upload signature' }, { status: 500 });
  }
}
