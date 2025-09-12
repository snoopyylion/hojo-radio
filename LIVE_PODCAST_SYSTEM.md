# Live Podcast System

This document describes the comprehensive live podcast system that allows authors to broadcast live and listeners to tune in and interact in real-time.

## Features

### For Authors (Broadcasters)
- **Go Live**: Start a live podcast session that broadcasts audio to all listeners
- **YouTube Integration**: Stream simultaneously to YouTube for wider reach
- **Real-time Audio**: Microphone input is broadcasted live to all listeners
- **Live Chat**: See and respond to listener comments in real-time
- **Analytics**: Track listener count, likes, and engagement

### For Listeners
- **Discover Live Sessions**: Browse all currently active live podcasts
- **Join Live Sessions**: Click to join any active live podcast
- **Real-time Audio**: Listen to the live audio stream
- **Live Chat**: Comment and interact with other listeners and the host
- **Like Streams**: Show appreciation for the content

## System Architecture

### Database Tables
- `podcast_sessions`: Stores live session information
- `chat_messages`: Stores real-time chat messages
- `podcast_likes`: Tracks likes for sessions
- `user_youtube_tokens`: YouTube OAuth tokens for streaming

### WebSocket Server
- Real-time communication for chat, likes, and listener counts
- Audio streaming support (future enhancement)
- Room-based architecture for session isolation

### API Routes
- `/api/podcasts/live`: Create new live sessions
- `/api/podcasts/live/stop`: End live sessions
- `/api/podcasts/live-sessions`: Get all active live sessions
- `/api/podcasts/session/[id]`: Get specific session details
- `/api/podcasts/join-session`: Handle listener join/leave

## Pages

### 1. Podcast Studio (`/home/podcasts`)
- Main page for authors to create and manage live sessions
- YouTube connection management
- Recording interface for offline content

### 2. Discover Live Podcasts (`/home/podcasts/discover`)
- Browse all active live sessions
- Real-time stats and session information
- Quick join functionality

### 3. Live Session Viewer (`/home/podcasts/live/[sessionId]`)
- Real-time audio player (placeholder for future audio streaming)
- Live chat interface
- Session information and controls

## How It Works

### Starting a Live Session
1. Author connects YouTube account (required for live streaming)
2. Author clicks "Go Live" and enters session title
3. System creates YouTube live stream
4. Author's microphone audio is captured and streamed
5. Session appears in discover page for listeners

### Joining a Live Session
1. Listener browses discover page
2. Clicks "Join Live" on desired session
3. System increments listener count
4. Listener can see live chat and interact
5. Audio streaming will be implemented in future

### Real-time Features
- **WebSocket Connection**: Maintains real-time connection
- **Chat Messages**: Instant message delivery to all listeners
- **Listener Count**: Real-time updates when users join/leave
- **Likes**: Instant like counter updates

## Future Enhancements

### Audio Streaming
- WebRTC implementation for real-time audio
- Audio quality optimization
- Bandwidth management

### Advanced Features
- Screen sharing during live sessions
- Multiple hosts per session
- Recording and playback of live sessions
- Advanced analytics and insights

## Setup Requirements

### Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_WS_URL=ws://localhost:3001
YOUTUBE_CLIENT_ID=your_youtube_client_id
YOUTUBE_CLIENT_SECRET=your_youtube_client_secret
```

### Database Setup
Run the SQL scripts in `database/setup-podcast-tables.sql` to create required tables.

### WebSocket Server
Start the WebSocket server:
```bash
cd hojo-ws
npm install
npm start
```

## Usage Flow

### For Authors
1. Navigate to `/home/podcasts`
2. Connect YouTube account if not already connected
3. Click "Go Live" and enter session details
4. Start speaking - your audio will be broadcasted live
5. Monitor chat and engagement in real-time
6. Click "End Stream" when finished

### For Listeners
1. Navigate to `/home/podcasts/discover`
2. Browse available live sessions
3. Click "Join Live" on desired session
4. Participate in live chat
5. Like the stream to show appreciation
6. Leave session when done

## Technical Notes

- WebSocket server handles real-time communication
- YouTube integration provides backup streaming platform
- Database tracks all session data and analytics
- Frontend provides intuitive interface for both authors and listeners
- System is scalable and can handle multiple concurrent sessions

https://ffmpeg.org/download.html#build-windows