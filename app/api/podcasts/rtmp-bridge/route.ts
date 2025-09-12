// app/api/podcasts/rtmp-bridge/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';

type ActiveStream = {
  process: ChildProcessWithoutNullStreams;
  userId: string;
  startedAt: Date;
};

const activeStreams = new Map<string, ActiveStream>();

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { action, sessionId, rtmpUrl, streamKey } = await request.json();

    if (!action || !sessionId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: action, sessionId' },
        { status: 400 }
      );
    }

    if (action === 'start') {
      if (!rtmpUrl || !streamKey) {
        console.error('RTMP bridge POST: Missing RTMP parameters');
        return NextResponse.json(
          { success: false, error: 'Missing RTMP parameters' },
          { status: 400 }
        );
      }

      console.log(`RTMP bridge POST: Starting stream for session ${sessionId}, user ${userId}`);

      // Stop existing stream if running
      const existing = activeStreams.get(sessionId);
      if (existing) {
        console.log(`RTMP bridge POST: Stopping existing stream for session ${sessionId}`);
        try { existing.process.kill('SIGTERM'); } catch { }
        activeStreams.delete(sessionId);
      }

      const fullRtmpUrl = `${rtmpUrl}/${streamKey}`;
      console.log(`RTMP bridge POST: RTMP URL: ${fullRtmpUrl}`);

      // FFmpeg args: add fake black video + real audio
      const ffmpegArgs = [
        '-loglevel', 'debug',
        '-f', 'lavfi', '-i', 'color=size=1280x720:rate=30:color=black', // dummy video
        '-i', 'pipe:0', // real audio from MediaRecorder
        '-map', '0:v:0', // take video from dummy source
        '-map', '1:a:0', // take audio from stdin
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-tune', 'zerolatency',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-ar', '44100',
        '-ac', '2',
        '-f', 'flv',
        fullRtmpUrl,
      ];

      console.log(`RTMP bridge POST: Starting FFmpeg with args:`, ffmpegArgs);

      const ffmpegPaths = [
        'ffmpeg', // PATH
        'C:\\Users\\USER\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.0-full_build\\bin\\ffmpeg.exe',
        'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe',
        'C:\\ffmpeg\\bin\\ffmpeg.exe'
      ];

      let ffmpeg: ChildProcessWithoutNullStreams | null = null;
      let ffmpegError: unknown = null;


      for (const ffmpegPath of ffmpegPaths) {
        try {
          console.log(`RTMP bridge POST: Trying FFmpeg path: ${ffmpegPath}`);
          ffmpeg = spawn(ffmpegPath, ffmpegArgs);
          console.log(`RTMP bridge POST: FFmpeg spawned successfully with path: ${ffmpegPath}`);
          break;
        } catch (error) {
          console.log(`RTMP bridge POST: Failed to spawn FFmpeg with path ${ffmpegPath}:`, error);
          ffmpegError = error;
        }
      }

      if (!ffmpeg) {
        console.error('RTMP bridge POST: Failed to spawn FFmpeg with any path:', ffmpegError);
        return NextResponse.json({ success: false, error: 'Failed to start FFmpeg process' }, { status: 500 });
      }

      ffmpeg.stdout.on('data', (data) => {
        console.log(`[rtmp-bridge ${sessionId}] stdout: ${data}`);
      });
      ffmpeg.stderr.on('data', (data) => {
        console.log(`[rtmp-bridge ${sessionId}] stderr: ${data}`);
      });
      ffmpeg.on('close', (code) => {
        console.log(`[rtmp-bridge ${sessionId}] exited with code ${code}`);
        activeStreams.delete(sessionId);

        if (code === 0) {
          console.log(`[rtmp-bridge ${sessionId}] Stream ended normally`);
        } else {
          console.error(`[rtmp-bridge ${sessionId}] Stream ended with error code ${code}`);
        }
      });
      ffmpeg.on('error', (err) => {
        console.error(`[rtmp-bridge ${sessionId}] error:`, err);
        activeStreams.delete(sessionId);
      });

      activeStreams.set(sessionId, { process: ffmpeg, userId, startedAt: new Date() });
      console.log(`RTMP bridge POST: Stream started successfully for session ${sessionId}`);
      console.log(`RTMP bridge POST: Active streams:`, Array.from(activeStreams.keys()));

      return NextResponse.json({ success: true });
    }

    if (action === 'stop') {
      const stream = activeStreams.get(sessionId);
      if (stream?.process) {
        try { stream.process.kill('SIGTERM'); } catch { }
        activeStreams.delete(sessionId);
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'status') {
      const stream = activeStreams.get(sessionId);
      const isRunning = Boolean(stream && stream.process && !stream.process.killed);

      return NextResponse.json({
        success: true,
        running: isRunning,
        startedAt: stream?.startedAt ?? null,
        ownedByYou: stream ? stream.userId === userId : null,
        activeStreams: Array.from(activeStreams.keys())
      });
    }

    if (action === 'health') {
      const stream = activeStreams.get(sessionId);
      if (!stream) {
        return NextResponse.json({ success: false, healthy: false, reason: 'No stream found' });
      }

      const healthy = stream.process && !stream.process.killed && stream.process.exitCode === null;
      return NextResponse.json({
        success: true,
        healthy,
        reason: healthy ? 'Stream active' : 'Process terminated'
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('RTMP bridge error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      console.error('RTMP bridge PUT: No user ID found');
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const sessionId = request.headers.get('x-session-id') || '';
    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'Missing session id' }, { status: 400 });
    }

    const stream = activeStreams.get(sessionId);
    if (!stream) {
      return NextResponse.json({ success: false, error: 'No active stream found' }, { status: 404 });
    }

    if (stream.userId !== userId) {
      return NextResponse.json({ success: false, error: 'Not authorized for this stream' }, { status: 403 });
    }

    const audioData = await request.arrayBuffer();
    if (!audioData || (audioData as ArrayBuffer).byteLength === 0) {
      return NextResponse.json({ success: false, error: 'Empty audio data' }, { status: 400 });
    }

    if (stream.process.killed || stream.process.exitCode !== null) {
      activeStreams.delete(sessionId);
      return NextResponse.json({
        success: false,
        error: 'Stream ended',
        streamEnded: true
      }, { status: 410 });
    }

    try {
      const ok = stream.process.stdin.write(Buffer.from(audioData));
      if (!ok) {
        await new Promise((resolve) => stream.process.stdin.once('drain', resolve));
      }
      return NextResponse.json({ success: true, accepted: ok });
    } catch (writeError) {
      console.error('RTMP bridge PUT: Error writing to FFmpeg stdin:', writeError);
      activeStreams.delete(sessionId);
      return NextResponse.json({ success: false, error: 'Stream ended', streamEnded: true }, { status: 410 });
    }
  } catch (error) {
    console.error('RTMP bridge PUT error:', error);
    return NextResponse.json({ success: false, error: 'Failed to process audio' }, { status: 500 });
  }
}
