// middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

const isProtectedRoute = createRouteMatcher([
  '/blog(.*)',
  '/dashboard(.*)',
  '/profile(.*)',
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

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();
  
  console.log(`🔍 Middleware check - Path: ${req.nextUrl.pathname}, UserId: ${userId || 'none'}`);
  
  // Allow API routes to handle their own authentication
  if (isApiRoute(req)) {
    console.log('🔧 API route detected, allowing through middleware');
    return NextResponse.next();
  }
  
  // Allow OAuth callback route to process without any interference
  if (isOAuthCallbackRoute(req)) {
    console.log('🔄 OAuth callback route accessed, allowing through');
    return NextResponse.next();
  }

  // If user is not signed in and trying to access protected routes
  if (!userId && isProtectedRoute(req)) {
    console.log('🚫 Unauthorized access to protected route, redirecting to sign-in');
    return NextResponse.redirect(new URL('/authentication/sign-in', req.url));
  }

  // If user is signed in and trying to access auth routes (sign-in/sign-up)
  if (userId && isAuthRoute(req)) {
    console.log('👤 Signed-in user accessing auth route, checking profile...');
    
    try {
      const { data: user, error } = await supabaseAdmin
        .from('users')
        .select('profile_completed, first_name, last_name, username')
        .eq('id', userId)
        .single();
            
      if (error) {
        if (error.code === 'PGRST116') {
          // User not found in database - redirect to complete profile
          console.log('📝 User not in database, redirecting to complete-profile');
          return NextResponse.redirect(new URL('/authentication/complete-profile', req.url));
        }
        console.warn('⚠️ Database error, redirecting to blog as fallback:', error);
        return NextResponse.redirect(new URL('/blog', req.url));
      }
            
      // Check if profile is incomplete
      const missingFields = [];
      if (!user.first_name?.trim()) missingFields.push('first_name');
      if (!user.last_name?.trim()) missingFields.push('last_name');
      if (!user.username?.trim()) missingFields.push('username');
      
      const needsCompletion = !user.profile_completed || missingFields.length > 0;
      
      if (needsCompletion) {
        console.log('📝 Profile incomplete, redirecting to complete-profile. Missing:', missingFields);
        return NextResponse.redirect(new URL('/authentication/complete-profile', req.url));
      }
            
      // Profile is complete, redirect to blog
      console.log('✅ Profile complete, redirecting to blog');
      return NextResponse.redirect(new URL('/blog', req.url));
    } catch (error) {
      console.error('❌ Middleware profile check error:', error);
      // On error, redirect to blog as safe fallback
      return NextResponse.redirect(new URL('/blog', req.url));
    }
  }

  // Check profile completion for signed-in users accessing protected routes
  // (excluding the complete-profile page itself to avoid redirect loops)
  if (userId && isProtectedRoute(req) && !isProfileCompletionRoute(req)) {
    console.log('🔍 Checking profile completion for protected route access');
    
    try {
      const { data: user, error } = await supabaseAdmin
        .from('users')
        .select('profile_completed, first_name, last_name, username')
        .eq('id', userId)
        .single();
            
      if (error) {
        if (error.code === 'PGRST116') {
          // User not found in database
          console.log('📝 User not found in database, redirecting to complete-profile');
          return NextResponse.redirect(new URL('/authentication/complete-profile', req.url));
        }
        console.warn('⚠️ Database error during protected route check:', error);
        return NextResponse.next(); // Allow through on database errors
      }
            
      // Check if profile is incomplete
      const missingFields = [];
      if (!user.first_name?.trim()) missingFields.push('first_name');
      if (!user.last_name?.trim()) missingFields.push('last_name');
      if (!user.username?.trim()) missingFields.push('username');
      
      const needsCompletion = !user.profile_completed || missingFields.length > 0;
      
      if (needsCompletion) {
        console.log('📝 Profile incomplete for protected route, redirecting. Missing:', missingFields);
        return NextResponse.redirect(new URL('/authentication/complete-profile', req.url));
      }
      
      console.log('✅ Profile complete, allowing access to protected route');
    } catch (error) {
      console.error('❌ Middleware profile check error for protected route:', error);
      return NextResponse.next(); // Allow through on errors
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};