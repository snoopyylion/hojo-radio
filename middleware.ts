// middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';


const isProtectedRoute = createRouteMatcher([
  '/blog(.*)',
  '/home(.*)',
  '/post(.*)',
  '/verify-news(.*)',
  '/hashedpage(.*)',
  '/dashboard(.*)',
  '/profile(.*)',
  '/user(.*)',
  '/search(.*)',
  '/authentication/complete-profile',
]);

const isProfileCompletionRoute = createRouteMatcher(['/authentication/complete-profile']);
const isOAuthCallbackRoute = createRouteMatcher(['/authentication/oauth-callback']);
const isAuthRoute = createRouteMatcher([
  '/authentication/sign-in',   
  '/authentication/sign-up',
  '/authentication/forgot-password',
]);

// API routes that should be excluded from middleware auth checks
const isApiRoute = createRouteMatcher(['/api(.*)']);

// ─── CORS ─────────────────────────────────────────────────────────────────────
// Expo web runs on localhost:8081; native iOS/Android has no CORS restriction.
// In production lock ALLOWED_ORIGINS to your real domain.
const ALLOWED_ORIGINS = [
  'http://localhost:8081',
  'http://localhost:3000',
  'http://localhost:19006',
  'exp://localhost:8081',
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : '*';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,PATCH,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

function withCors(response: NextResponse, origin: string | null): NextResponse {
  const headers = getCorsHeaders(origin);
  Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
  return response;
}

// Public API routes that don't require authentication
const isPublicApiRoute = createRouteMatcher([
  '/api/post/trending(.*)',
  '/api/post/public(.*)',
  '/api/post/top-weekly(.*)',
  '/api/categories(.*)',
  '/api/search(.*)',
  '/api/auth/youtube/callback(.*)', // YouTube OAuth callback should be public
  '/api/auth/youtube/complete(.*)', // YouTube OAuth completion should be public during flow
  '/api/podcasts/rtmp-bridge(.*)',
]);

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  username: string;
  profile_completed: boolean;
}

// Helper function to check if profile is complete
function isProfileComplete(userProfile: UserProfile | null): boolean {
  if (!userProfile) return false;
  
// Use explicit boolean conversion to avoid null values

  const hasFirstName = !!(userProfile.first_name && userProfile.first_name.trim().length > 0);
  const hasLastName = !!(userProfile.last_name && userProfile.last_name.trim().length > 0);
  const hasUsername = !!(userProfile.username && userProfile.username.trim().length > 0);
  const isMarkedComplete = userProfile.profile_completed === true;
  
  const isComplete = hasFirstName && hasLastName && hasUsername && isMarkedComplete;
  
  console.log('📋 Profile completion check:', {
    hasFirstName,
    hasLastName,
    hasUsername,
    isMarkedComplete,
    isComplete,
  });
  
  return isComplete;
}

export default clerkMiddleware(async (auth, req) => {
  // Handle CORS preflight before any Clerk auth check.
  // Browsers send OPTIONS before every cross-origin request; it must return
  // immediately with the CORS headers or the actual request will never fire.
  if (req.method === 'OPTIONS' && isApiRoute(req)) {
    return new NextResponse(null, {
      status: 204,
      headers: getCorsHeaders(req.headers.get('origin')),
    });
  }

  const { userId } = await auth();

  console.log(`🔍 Middleware check - Path: ${req.nextUrl.pathname}, UserId: ${userId || 'none'}`);

  // For API routes, we need to ensure authentication context is available
  if (isApiRoute(req)) {
    const origin = req.headers.get('origin');

    console.log('🔧 API route detected, checking if public or protected');

    // Allow public API routes without authentication
    if (isPublicApiRoute(req)) {
      console.log('🌐 Public API route detected, allowing access');
      return withCors(NextResponse.next(), origin);
    }

    // Special handling for YouTube OAuth callback
    if (req.nextUrl.pathname.startsWith('/api/auth/youtube/callback')) {
      console.log('🔄 YouTube OAuth callback detected, allowing access');
      return withCors(NextResponse.next(), origin);
    }

    // Special handling for YouTube OAuth completion
    if (req.nextUrl.pathname.startsWith('/api/auth/youtube/complete')) {
      console.log('🔄 YouTube OAuth completion detected, allowing access');
      return withCors(NextResponse.next(), origin);
    }

    // For protected API routes, let Clerk handle authentication
    // Don't block them here - let the API route's auth() function handle it
    console.log('🔐 Protected API route detected, allowing Clerk to handle auth');
    return withCors(NextResponse.next(), origin);
  }
  
  // Allow OAuth callback route to process without any interference
  if (isOAuthCallbackRoute(req)) {
    console.log('🔄 OAuth callback route accessed, allowing through');
    return NextResponse.next();
  }

  // If user is not signed in and trying to access protected routes
  if (!userId && isProtectedRoute(req)) {
    console.log('🚫 Unauthorized access to protected route, redirecting to sign-in');
    const signInUrl = new URL('/authentication/sign-in', req.url);
    const fullPath = req.nextUrl.pathname + req.nextUrl.search;
    signInUrl.searchParams.set('redirect_url', fullPath);
    return NextResponse.redirect(signInUrl);
  }

  // If user is signed in and trying to access auth routes (sign-in/sign-up)
  if (userId && isAuthRoute(req)) {
  console.log('👤 Signed-in user accessing auth route, checking profile...');
  
  try {
    // Check if user profile exists and is complete in database
    const { data: userProfile, error } = await supabaseAdmin
      .from('users')
      .select('id, first_name, last_name, username, profile_completed')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('❌ Database error checking user profile:', error);
      const redirectUrl = req.nextUrl.searchParams.get('redirect_url') || '/home';
      console.log('🔄 Database error, redirecting to:', redirectUrl);
      return NextResponse.redirect(new URL(redirectUrl, req.url));
    }

    // If user doesn't exist in database or profile is incomplete
    if (!userProfile || !isProfileComplete(userProfile)) {
      console.log('📝 User profile needs completion, redirecting to complete-profile');
      const completeProfileUrl = new URL('/authentication/complete-profile', req.url);
      const redirectUrl = req.nextUrl.searchParams.get('redirect_url');
      if (redirectUrl && redirectUrl !== '/home') {
        completeProfileUrl.searchParams.set('redirect_url', redirectUrl);
      }
      return NextResponse.redirect(completeProfileUrl);
    }

    // Profile is complete, redirect to intended destination
    const redirectUrl = req.nextUrl.searchParams.get('redirect_url') || '/home';
    console.log('✅ Profile complete, redirecting to:', redirectUrl);
    return NextResponse.redirect(new URL(redirectUrl, req.url));
    
  } catch (error) {
    console.error('❌ Error in middleware profile check:', error);
    const redirectUrl = req.nextUrl.searchParams.get('redirect_url') || '/home';
    return NextResponse.redirect(new URL(redirectUrl, req.url));
  }
}


  // If user is signed in and accessing profile completion route
  if (userId && isProfileCompletionRoute(req)) {
    console.log('📝 User accessing profile completion route');
    
    try {
      // Check if profile is already complete
      const { data: userProfile, error } = await supabaseAdmin
        .from('users')
        .select('id, first_name, last_name, username, profile_completed')
        .eq('id', userId)
        .single();

      // If profile is complete, redirect away from completion route
      if (!error && userProfile && isProfileComplete(userProfile)) {
        console.log('✅ Profile already complete, redirecting away from completion route');
        const redirectUrl = req.nextUrl.searchParams.get('redirect_url') || '/home';
        return NextResponse.redirect(new URL(redirectUrl, req.url));
      }

      // Profile needs completion, allow access to completion route
      console.log('📝 Profile needs completion, allowing access to completion route');
      return NextResponse.next();
      
    } catch (error) {
      console.error('❌ Error checking profile completion status:', error);
      // On error, allow access to completion route
      return NextResponse.next();
    }
  }

  if (userId && isAuthRoute(req)) {
  console.log('👤 Signed-in user accessing auth route, checking profile...');
  
  try {
    // Check if user profile exists and is complete in database
    const { data: userProfile, error } = await supabaseAdmin
      .from('users')
      .select('id, first_name, last_name, username, profile_completed')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('❌ Database error checking user profile:', error);
      const redirectUrl = req.nextUrl.searchParams.get('redirect_url') || '/home';
      console.log('🔄 Database error, redirecting to:', redirectUrl);
      return NextResponse.redirect(new URL(redirectUrl, req.url));
    }

    // Determine redirect URL
    const redirectUrl = req.nextUrl.searchParams.get('redirect_url') || '/home';

    // If user doesn't exist in database or profile is incomplete
    if (!userProfile || !isProfileComplete(userProfile)) {
      console.log('📝 User profile needs completion, redirecting to complete-profile');
      const completeProfileUrl = new URL('/authentication/complete-profile', req.url);
      if (redirectUrl && redirectUrl !== '/home') {
        completeProfileUrl.searchParams.set('redirect_url', redirectUrl);
      }
      return NextResponse.redirect(completeProfileUrl);
    }

    // Profile is complete, redirect to intended destination
    console.log('✅ Profile complete, redirecting to:', redirectUrl);
    return NextResponse.redirect(new URL(redirectUrl, req.url));
    
  } catch (error) {
    console.error('❌ Error in middleware profile check:', error);
    const redirectUrl = req.nextUrl.searchParams.get('redirect_url') || '/home';
    return NextResponse.redirect(new URL(redirectUrl, req.url));
  }
}

  // If user is signed in and accessing other protected routes
  if (userId && isProtectedRoute(req) && !isProfileCompletionRoute(req)) {
    console.log('🔒 Signed-in user accessing protected route, checking profile completion...');
    
    try {
      // Check if user profile exists and is complete
      const { data: userProfile, error } = await supabaseAdmin
        .from('users')
        .select('id, first_name, last_name, username, profile_completed')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Database error checking user profile:', error);
        // Allow through on database errors to prevent blocking users
        return NextResponse.next();
      }

      // If user doesn't exist or profile is incomplete, redirect to complete profile
      if (!userProfile || !isProfileComplete(userProfile)) {
        console.log('📝 Incomplete profile detected, redirecting to complete-profile');
        const completeProfileUrl = new URL('/authentication/complete-profile', req.url);
        const currentPath = req.nextUrl.pathname + req.nextUrl.search;
        if (currentPath !== '/home') {
          completeProfileUrl.searchParams.set('redirect_url', currentPath);
        }
        return NextResponse.redirect(completeProfileUrl);
      }

      // Profile is complete, allow access
      console.log('✅ Profile complete, allowing access to protected route');
      return NextResponse.next();
      
    } catch (error) {
      console.error('❌ Error in middleware protected route check:', error);
      // On error, allow through to prevent blocking users
      return NextResponse.next();
    }
  }

  // Default: allow the request to proceed
  console.log('✅ Request allowed through middleware');
  return NextResponse.next();
});


export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};