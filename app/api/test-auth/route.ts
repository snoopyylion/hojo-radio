// app/api/test-auth/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function GET(request: NextRequest) {
  console.log('🧪 Test auth endpoint called');
  console.log('📋 Request headers:', Object.fromEntries(request.headers.entries()));
  
  // Check Clerk environment variables
  console.log('🔧 Clerk Environment Check:');
  console.log('  - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:', process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? 'present' : 'missing');
  console.log('  - CLERK_SECRET_KEY:', process.env.CLERK_SECRET_KEY ? 'present' : 'missing');
  console.log('  - CLERK_WEBHOOK_SECRET:', process.env.CLERK_WEBHOOK_SECRET ? 'present' : 'missing');
  
  try {
    const { userId } = await auth();
    console.log('👤 User ID from auth:', userId);
    
    if (userId) {
      return NextResponse.json({
        success: true,
        userId,
        message: 'Authentication working!'
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'No user ID found',
        message: 'Authentication failed'
      }, { status: 401 });
    }
  } catch (error) {
    console.error('❌ Auth test failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Auth function threw error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
