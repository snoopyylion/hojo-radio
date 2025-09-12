// app/api/podcasts/stream/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { spawn, ChildProcess } from 'child_process';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Define types for stream information
type StreamInfo = {
  process: ChildProcess;
  startTime: Date;
  userId: string;
};

// Store active streaming processes with proper typing
const streamingProcesses = new Map<string, StreamInfo>();

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { sessionId, action, rtmpUrl, streamKey } = body;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'start':
        return await startAudioStream(sessionId, rtmpUrl, streamKey, userId);
      case 'stop':
        return await stopAudioStream(sessionId, userId);
      case 'status':
        return await getStreamStatus(sessionId, userId);
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Audio streaming API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function startAudioStream(sessionId: string, rtmpUrl: string, streamKey: string, userId: string) {
  try {
    // Verify session ownership
    const { data: session, error } = await supabase
      .from('podcasts')
      .select('id, user_id, status')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (error || !session) {
      return NextResponse.json(
        { success: false, error: 'Session not found or access denied' },
        { status: 404 }
      );
    }

    // Stop existing stream if running
    if (streamingProcesses.has(sessionId)) {
      await stopAudioStream(sessionId, userId);
    }

    // Start FFmpeg process for audio streaming
    const fullRtmpUrl = `${rtmpUrl}/${streamKey}`;
    
    // Create a named pipe or use stdin for audio input
    const ffmpegArgs = [
      '-f', 'webm',              // Input format
      '-i', 'pipe:0',            // Read from stdin
      '-c:a', 'aac',             // Audio codec
      '-b:a', '128k',            // Audio bitrate
      '-ar', '44100',            // Sample rate
      '-f', 'flv',               // Output format for RTMP
      fullRtmpUrl                // RTMP URL
    ];

    const ffmpeg = spawn('ffmpeg', ffmpegArgs, {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Store process reference
    streamingProcesses.set(sessionId, {
      process: ffmpeg,
      startTime: new Date(),
      userId
    });

    // Handle process events
    ffmpeg.stdout.on('data', (data) => {
      console.log(`FFmpeg stdout: ${data}`);
    });

    ffmpeg.stderr.on('data', (data) => {
      console.log(`FFmpeg stderr: ${data}`);
    });

    ffmpeg.on('close', (code) => {
      console.log(`FFmpeg process closed with code ${code}`);
      streamingProcesses.delete(sessionId);
    });

    ffmpeg.on('error', (err) => {
      console.error('FFmpeg error:', err);
      streamingProcesses.delete(sessionId);
    });

    // Update session status
    await supabase
      .from('podcasts')
      .update({ status: 'streaming' })
      .eq('id', sessionId);

    return NextResponse.json({
      success: true,
      message: 'Audio streaming started',
      sessionId
    });

  } catch (error) {
    console.error('Failed to start audio stream:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to start streaming' },
      { status: 500 }
    );
  }
}

async function stopAudioStream(sessionId: string, userId: string) {
  try {
    const streamInfo = streamingProcesses.get(sessionId);
    
    if (!streamInfo) {
      return NextResponse.json({
        success: true,
        message: 'No active stream found'
      });
    }

    // Verify ownership
    if (streamInfo.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Kill FFmpeg process
    streamInfo.process.kill('SIGTERM');
    streamingProcesses.delete(sessionId);

    // Update session status
    await supabase
      .from('podcasts')
      .update({ 
        status: 'ended',
        ended_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    return NextResponse.json({
      success: true,
      message: 'Audio streaming stopped'
    });

  } catch (error) {
    console.error('Failed to stop audio stream:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to stop streaming' },
      { status: 500 }
    );
  }
}

async function getStreamStatus(sessionId: string, userId: string) {
  try {
    const streamInfo = streamingProcesses.get(sessionId);
    const isActive = streamInfo && streamInfo.userId === userId;

    return NextResponse.json({
      success: true,
      isActive,
      startTime: isActive ? streamInfo.startTime : null
    });

  } catch (error) {
    console.error('Failed to get stream status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get status' },
      { status: 500 }
    );
  }
}

// Handle audio chunk upload for streaming
export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const sessionId = request.headers.get('x-session-id') || '';
    const audioData = await request.arrayBuffer();

    if (!sessionId || audioData.byteLength === 0) {
      return NextResponse.json(
        { success: false, error: 'Session ID and audio data required' },
        { status: 400 }
      );
    }

    const streamInfo = streamingProcesses.get(sessionId);
    
    if (!streamInfo || streamInfo.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'No active stream found' },
        { status: 404 }
      );
    }

    // Check if process is still alive before writing
    if (streamInfo.process.killed || streamInfo.process.exitCode !== null) {
      streamingProcesses.delete(sessionId);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Stream ended',
          streamEnded: true 
        },
        { status: 410 }
      );
    }

    // Write audio data to FFmpeg stdin
    try {
      const success = streamInfo.process.stdin?.write(Buffer.from(audioData));
      
      return NextResponse.json({
        success: !!success,
        message: success ? 'Audio chunk processed' : 'Buffer full, try again'
      });
    } catch (writeError) {
      console.error('Error writing to FFmpeg stdin:', writeError);
      streamingProcesses.delete(sessionId);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Stream ended',
          streamEnded: true 
        },
        { status: 410 }
      );
    }

  } catch (error) {
    console.error('Failed to process audio chunk:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process audio' },
      { status: 500 }
    );
  }
}