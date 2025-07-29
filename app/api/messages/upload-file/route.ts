// app/api/messages/upload-file/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';

// Create Supabase client with timeout configuration
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        'Content-Type': 'application/json',
      },
    },
  }
);

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if Supabase URL and key are configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase configuration');
      return NextResponse.json({ error: 'Storage not configured' }, { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size (5MB limit for better reliability)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large. Maximum size is 5MB.' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Only images are allowed.' }, { status: 400 });
    }

    // Generate unique filename with better naming
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${userId}/${timestamp}-${randomId}.${fileExtension}`;

    // Convert file to buffer with error handling
    let buffer: Buffer;
    try {
      const bytes = await file.arrayBuffer();
      buffer = Buffer.from(bytes);
    } catch (bufferError) {
      console.error('Error converting file to buffer:', bufferError);
      return NextResponse.json({ error: 'Failed to process file' }, { status: 500 });
    }

    // Check if bucket exists and create if needed
    try {
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      if (bucketsError) {
        console.error('Error listing buckets:', bucketsError);
        return NextResponse.json({ error: 'Storage service unavailable' }, { status: 500 });
      }

      const bucketExists = buckets?.some(bucket => bucket.name === 'message-files');
      if (!bucketExists) {
        console.error('message-files bucket does not exist');
        return NextResponse.json({ 
          error: 'Storage bucket not configured. Please create a "message-files" bucket in your Supabase project.' 
        }, { status: 500 });
      }
    } catch (bucketCheckError) {
      console.error('Error checking bucket:', bucketCheckError);
      // Continue anyway, the upload will fail with a clear error if bucket doesn't exist
    }

    // Upload to Supabase Storage with timeout
    const uploadPromise = supabase.storage
      .from('message-files')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
        cacheControl: '3600'
      });

    // Add timeout to upload
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Upload timeout')), 30000); // 30 second timeout
    });

    const { data, error } = await Promise.race([uploadPromise, timeoutPromise]) as any;

    if (error) {
      console.error('Supabase upload error:', error);
      
      // Provide specific error messages
      if (error.message?.includes('bucket')) {
        return NextResponse.json({ 
          error: 'Storage bucket not found. Please create a "message-files" bucket in your Supabase project.' 
        }, { status: 500 });
      }
      
      if (error.message?.includes('timeout')) {
        return NextResponse.json({ error: 'Upload timed out. Please try again.' }, { status: 408 });
      }
      
      return NextResponse.json({ 
        error: 'Failed to upload file. Please check your storage configuration.' 
      }, { status: 500 });
    }

    if (!data?.path) {
      return NextResponse.json({ error: 'Upload failed - no path returned' }, { status: 500 });
    }

    // Get public URL
    try {
      const { data: urlData } = supabase.storage
        .from('message-files')
        .getPublicUrl(fileName);

      if (!urlData?.publicUrl) {
        return NextResponse.json({ error: 'Failed to generate public URL' }, { status: 500 });
      }

      return NextResponse.json({ 
        url: urlData.publicUrl,
        filename: fileName,
        size: file.size,
        type: file.type
      });

    } catch (urlError) {
      console.error('Error getting public URL:', urlError);
      return NextResponse.json({ error: 'Failed to generate file URL' }, { status: 500 });
    }

  } catch (error) {
    console.error('File upload error:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('fetch')) {
        return NextResponse.json({ 
          error: 'Network error. Please check your internet connection and try again.' 
        }, { status: 503 });
      }
      
      if (error.message.includes('timeout')) {
        return NextResponse.json({ error: 'Request timed out. Please try again.' }, { status: 408 });
      }
    }
    
    return NextResponse.json({ 
      error: 'Internal server error. Please try again later.' 
    }, { status: 500 });
  }
} 