// Test script to verify YouTube API configuration
// Run this with: node scripts/test-youtube-api.js

const { google } = require('googleapis');
require('dotenv').config({ path: '.env.local' });

async function testYouTubeAPI() {
  console.log('🧪 Testing YouTube API Configuration...\n');

  // Check environment variables
  console.log('📋 Environment Variables Check:');
  console.log('YOUTUBE_CLIENT_ID:', process.env.YOUTUBE_CLIENT_ID ? '✅ Set' : '❌ Missing');
  console.log('YOUTUBE_CLIENT_SECRET:', process.env.YOUTUBE_CLIENT_SECRET ? '✅ Set' : '❌ Missing');
  
  // Get the base URL from environment or construct it
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                 process.env.VERCEL_URL || 
                 'http://localhost:3000';
  console.log('NEXT_PUBLIC_APP_URL:', baseUrl);
  console.log('');

  if (!process.env.YOUTUBE_CLIENT_ID || !process.env.YOUTUBE_CLIENT_SECRET) {
    console.log('❌ Missing required YouTube API credentials');
    console.log('Please set YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET in your .env.local file');
    return;
  }

  try {
    // Test OAuth2 client creation
    console.log('🔐 Testing OAuth2 Client Creation...');
    const oauth2Client = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET,
      `${baseUrl}/api/auth/youtube/callback`
    );

    // Generate auth URL
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/youtube',
        'https://www.googleapis.com/auth/youtube.force-ssl'
      ]
    });

    console.log('✅ OAuth2 Client created successfully');
    console.log('✅ Auth URL generated successfully');
    console.log('');
    console.log('🔗 Auth URL Preview (first 100 chars):');
    console.log(authUrl.substring(0, 100) + '...');
    console.log('');
    console.log('🔗 Redirect URI being used:');
    console.log(`${baseUrl}/api/auth/youtube/callback`);
    console.log('');

    // Test YouTube API client creation
    console.log('📺 Testing YouTube API Client Creation...');
    const youtube = google.youtube({
      version: 'v3',
      auth: oauth2Client
    });

    console.log('✅ YouTube API client created successfully');
    console.log('');

    // Test basic API call (without auth - just to check client creation)
    console.log('🧪 Testing API Client Structure...');
    if (youtube.liveBroadcasts && youtube.liveStreams) {
      console.log('✅ Live Broadcasts API available');
      console.log('✅ Live Streams API available');
    } else {
      console.log('❌ Some YouTube APIs not available');
    }

    console.log('');
    console.log('🎉 YouTube API configuration test completed successfully!');
    console.log('');
    console.log('📝 Next steps:');
    console.log('1. Make sure you\'ve added your email as a test user in OAuth consent screen');
    console.log('2. Verify the redirect URI above matches your Google Cloud Console settings');
    console.log('3. Test the OAuth flow in your browser');

  } catch (error) {
    console.log('❌ Error testing YouTube API:');
    console.log(error.message);
    console.log('');
    console.log('🔧 Common fixes:');
    console.log('- Check your Client ID and Secret');
    console.log('- Verify OAuth consent screen is configured');
    console.log('- Ensure YouTube Data API v3 is enabled');
    console.log('- Make sure redirect URI matches exactly in Google Cloud Console');
  }
}

// Run the test
testYouTubeAPI();
