// lib/youtube-live.ts
import { google, youtube_v3 } from 'googleapis';

export class YouTubeLiveService {
  private youtube: youtube_v3.Youtube;

  constructor(accessToken: string) {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    
    this.youtube = google.youtube({
      version: 'v3',
      auth
    });
  }

  // Create YouTube Live broadcast
  async createLiveBroadcast(title: string, description?: string) {
    try {
      // 1. Create broadcast
      const broadcastResponse = await this.youtube.liveBroadcasts.insert({
        part: ['snippet', 'status'],
        requestBody: {
          snippet: {
            title,
            description: description || '',
            scheduledStartTime: new Date().toISOString(),
          },
          status: {
            privacyStatus: 'public', // or 'unlisted', 'private'
          },
        },
      });

      const broadcast = broadcastResponse.data;
      if (!broadcast.id) {
        throw new Error('Failed to create broadcast');
      }

      // 2. Create live stream
      const streamResponse = await this.youtube.liveStreams.insert({
        part: ['snippet', 'cdn'],
        requestBody: {
          snippet: {
            title: `${title} - Stream`,
          },
          cdn: {
            frameRate: '30fps',
            ingestionType: 'rtmp',
            resolution: '720p',
          },
        },
      });

      const stream = streamResponse.data;
      if (!stream.id) {
        throw new Error('Failed to create stream');
      }

      // 3. Bind broadcast to stream
      await this.youtube.liveBroadcasts.bind({
        part: ['id'],
        id: broadcast.id,
        streamId: stream.id,
      });

      return {
        broadcastId: broadcast.id,
        streamId: stream.id,
        rtmpUrl: stream.cdn?.ingestionInfo?.ingestionAddress,
        streamKey: stream.cdn?.ingestionInfo?.streamName,
        watchUrl: `https://youtube.com/watch?v=${broadcast.id}`,
        embedUrl: `https://youtube.com/embed/${broadcast.id}`,
      };
    } catch (error) {
      // Surface detailed YouTube API error information so the API route can respond appropriately
      const err: any = error;
      const reason = err?.response?.data?.error?.errors?.[0]?.reason;
      const message = err?.response?.data?.error?.message || err?.message;
      const status = err?.response?.status || err?.code;
      console.error('YouTube Live creation failed:', {
        status,
        reason,
        message,
      });

      const enrichedError = new Error(reason || message || 'YOUTUBE_API_ERROR');
      (enrichedError as any).status = status;
      (enrichedError as any).reason = reason;
      (enrichedError as any).details = message;
      throw enrichedError;
    }
  }

  // Start the live broadcast
  async startBroadcast(broadcastId: string) {
    try {
      await this.youtube.liveBroadcasts.transition({
        part: ['status'],
        id: broadcastId,
        broadcastStatus: 'live',
      });
      return true;
    } catch (error) {
      console.error('Failed to start broadcast:', error);
      throw error;
    }
  }

  // End the live broadcast
  async endBroadcast(broadcastId: string) {
    try {
      await this.youtube.liveBroadcasts.transition({
        part: ['status'],
        id: broadcastId,
        broadcastStatus: 'complete',
      });
      return true;
    } catch (error) {
      console.error('Failed to end broadcast:', error);
      throw error;
    }
  }

  // Get live chat messages
  async getChatMessages(liveChatId: string, pageToken?: string) {
    try {
      const response = await this.youtube.liveChatMessages.list({
        liveChatId,
        part: ['snippet', 'authorDetails'],
        pageToken,
      });

      return {
        messages: response.data.items || [],
        nextPageToken: response.data.nextPageToken,
        pollingIntervalMillis: response.data.pollingIntervalMillis || 5000,
      };
    } catch (error) {
      console.error('Failed to get chat messages:', error);
      return { messages: [], nextPageToken: undefined, pollingIntervalMillis: 5000 };
    }
  }

  // Send message to YouTube Live chat
  async sendChatMessage(liveChatId: string, message: string) {
    try {
      await this.youtube.liveChatMessages.insert({
        part: ['snippet'],
        requestBody: {
          snippet: {
            liveChatId,
            type: 'textMessageEvent',
            textMessageDetails: {
              messageText: message,
            },
          },
        },
      });
      return true;
    } catch (error) {
      console.error('Failed to send chat message:', error);
      return false;
    }
  }
}

// OAuth helper for YouTube API
import { OAuth2Client } from 'google-auth-library';

export class YouTubeAuth {
  private oauth2Client: OAuth2Client;
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.oauth2Client = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET,
      `${this.baseUrl}/api/auth/youtube/callback`
    );
  }

  getAuthUrl() {
    const scopes = [
      'https://www.googleapis.com/auth/youtube',
      'https://www.googleapis.com/auth/youtube.force-ssl',
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      include_granted_scopes: true as unknown as boolean,
    });
  }

  async getTokenFromCode(code: string) {
    const { tokens } = await this.oauth2Client.getToken(code);
    return tokens;
  }
}