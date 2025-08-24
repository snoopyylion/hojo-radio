// app/api/podcasts/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    
    if (!audioFile) {
      return NextResponse.json(
        { success: false, error: 'No audio file provided' },
        { status: 400 }
      );
    }
    
    // In production, you would:
    // 1. Upload to cloud storage (AWS S3, Cloudinary, etc.)
    // 2. Process audio (convert format, generate waveform)
    // 3. Store metadata in Supabase database with userId as text
    // 4. Optionally submit to podcast platforms
    
    const podcast = {
      id: `podcast_${Date.now()}`,
      title,
      description,
      audioUrl: '/api/podcasts/stream/' + Date.now(), // Mock URL
      duration: 0, // Would be calculated from audio
      createdAt: new Date().toISOString(),
      status: 'published',
      userId // Clerk user ID as text
    };
    
    // Store in Supabase
    // await supabase.from('podcasts').insert([podcast]);
    
    return NextResponse.json({ 
      success: true, 
      podcast 
    });
    
  } catch {
    return NextResponse.json(
      { success: false, error: 'Upload failed' },
      { status: 500 }
    );
  }
}