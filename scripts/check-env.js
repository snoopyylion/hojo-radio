// Simple script to check environment variables
// Run this with: node scripts/check-env.js

require('dotenv').config({ path: '.env.local' });

console.log('🔍 Environment Variables Check\n');

// Check required variables
const requiredVars = {
  'NEXT_PUBLIC_SUPABASE_URL': process.env.NEXT_PUBLIC_SUPABASE_URL,
  'NEXT_PUBLIC_SUPABASE_ANON_KEY': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  'SUPABASE_SERVICE_ROLE_KEY': process.env.SUPABASE_SERVICE_ROLE_KEY,
  'YOUTUBE_CLIENT_ID': process.env.YOUTUBE_CLIENT_ID,
  'YOUTUBE_CLIENT_SECRET': process.env.YOUTUBE_CLIENT_SECRET,
  'NEXT_PUBLIC_APP_URL': process.env.NEXT_PUBLIC_APP_URL
};

let allSet = true;

Object.entries(requiredVars).forEach(([key, value]) => {
  if (value) {
    console.log(`✅ ${key}: ${value.substring(0, 20)}...`);
  } else {
    console.log(`❌ ${key}: Missing`);
    allSet = false;
  }
});

console.log('');

if (allSet) {
  console.log('🎉 All required environment variables are set!');
  console.log('');
  console.log('📝 Next steps:');
  console.log('1. Make sure your .env.local file is in the project root');
  console.log('2. Restart your development server');
  console.log('3. Try connecting to YouTube again');
} else {
  console.log('❌ Some environment variables are missing');
  console.log('');
  console.log('🔧 To fix this:');
  console.log('1. Copy env-template.txt to .env.local');
  console.log('2. Fill in your actual values');
  console.log('3. Make sure .env.local is in the project root');
  console.log('4. Restart your development server');
}

console.log('');
console.log('🔗 Current redirect URI will be:');
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
console.log(`${baseUrl}/api/auth/youtube/callback`);
