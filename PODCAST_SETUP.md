# Podcast System Setup Guide

This guide will help you set up the podcast system with YouTube live streaming integration.

## Prerequisites

1. **Supabase Account** - For database and real-time features
2. **YouTube API Access** - For live streaming
3. **Clerk Account** - For authentication (already configured)
4. **Cloudinary Account** - For audio file storage (optional)

## Step 1: Environment Variables

Create a `.env.local` file in your project root with the following variables:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# YouTube API Configuration
YOUTUBE_CLIENT_ID=your_youtube_client_id_here
YOUTUBE_CLIENT_SECRET=your_youtube_client_secret_here

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Cloudinary Configuration (for audio uploads)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

## Step 2: YouTube API Setup (IMPORTANT - Fix OAuth Error)

**If you're getting "Access blocked: authorisation error" follow these exact steps:**

### 2.1 Google Cloud Console Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. **Enable these APIs:**
   - YouTube Data API v3
   - YouTube Live Streaming API

### 2.2 OAuth Consent Screen Setup
1. Go to **APIs & Services** → **OAuth consent screen**
2. Choose **External** user type
3. Fill in required fields:
   - **App name**: "Hojo Podcast"
   - **User support email**: Your email
   - **Developer contact information**: Your email
4. **Add scopes** (click "Add or Remove Scopes"):
   - `https://www.googleapis.com/auth/youtube`
   - `https://www.googleapis.com/auth/youtube.force-ssl`
5. **Add test users** (your email for testing)
6. Click **Save and Continue**

### 2.3 OAuth 2.0 Client ID Setup
1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth 2.0 Client ID**
3. Set **Application type**: "Web application"
4. **Name**: "Hojo Podcast Web Client"
5. **Authorized JavaScript origins**:
   ```
   http://localhost:3000
   https://yourdomain.com (if you have one)
   ```
6. **Authorized redirect URIs**:
   ```
   http://localhost:3000/api/auth/youtube/callback
   https://yourdomain.com/api/auth/youtube/callback (if you have one)
   ```
7. Click **Create**
8. Copy the **Client ID** and **Client Secret** to your `.env.local`

### 2.4 Test the OAuth Flow
1. **For development**: Use your email as a test user
2. **For production**: Submit for verification (takes 6-8 weeks)

## Step 3: Supabase Database Setup

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `database/setup-podcast-tables.sql`
4. Run the SQL script to create all necessary tables and functions

## Step 4: Install Dependencies

Make sure you have the required packages installed:

```bash
npm install @supabase/supabase-js googleapis google-auth-library
```

## Step 5: Test the System

1. Start your development server: `npm run dev`
2. Navigate to `/home/podcasts`
3. Click "Connect YouTube" to authenticate
4. Once connected, you can start a live stream

## How It Works

### Live Streaming Flow

1. **User clicks "Go Live"** → System checks YouTube connection
2. **YouTube OAuth** → User authorizes the app
3. **Create Broadcast** → YouTube Live broadcast is created
4. **Start Stream** → User gets RTMP URL and stream key
5. **Real-time Updates** → Chat, likes, and analytics update in real-time
6. **End Stream** → YouTube broadcast ends, session marked as ended

### Database Tables

- **podcast_sessions**: Main podcast sessions (live and recorded)
- **chat_messages**: Real-time chat during live streams
- **podcast_likes**: User likes for sessions
- **live_analytics**: Real-time analytics data
- **user_youtube_tokens**: YouTube OAuth tokens
- **podcast_episodes**: Recorded podcast episodes

### Real-time Features

- **Live Chat**: Real-time messaging during streams
- **Listener Count**: Updates every 5 seconds
- **Likes**: Real-time like updates
- **Analytics**: Live viewer statistics

## Troubleshooting

### Common Issues

1. **YouTube OAuth Error (Access blocked: authorisation error)**
   - **Solution**: Follow Step 2.2 and 2.3 exactly
   - Make sure you've added your email as a test user
   - Verify all redirect URIs match exactly
   - Ensure YouTube Data API and Live Streaming API are enabled
   - Check that OAuth consent screen is properly configured

2. **Database Connection Error**
   - Verify Supabase credentials
   - Check if tables were created successfully
   - Ensure RLS policies are configured

3. **Live Stream Not Starting**
   - Check YouTube connection status
   - Verify microphone permissions
   - Check browser console for errors

### Debug Mode

Enable debug logging by adding to your `.env.local`:

```bash
DEBUG=podcast:*
```

## Production Deployment

1. **Update Environment Variables**
   - Use production URLs
   - Set secure YouTube redirect URIs
   - Configure production Supabase instance

2. **Security Considerations**
   - Review RLS policies
   - Set up proper CORS configuration
   - Use HTTPS for all API calls

3. **Monitoring**
   - Set up error logging
   - Monitor YouTube API quotas
   - Track database performance

## Support

If you encounter issues:

1. Check the browser console for errors
2. Verify all environment variables are set
3. Ensure database tables are created
4. Check YouTube API quotas and permissions
5. **For OAuth issues**: Follow Step 2 exactly and ensure you're a test user

## Features

- ✅ YouTube Live integration
- ✅ Real-time chat
- ✅ Live analytics
- ✅ User authentication
- ✅ Audio recording
- ✅ Live streaming
- ✅ Chat moderation
- ✅ Analytics tracking
- ✅ Mobile responsive
- ✅ Dark mode support
