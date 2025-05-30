import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    // Get authenticated user
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    console.log('📊 Fetching user likes summary for:', userId);

    // Get total number of posts this user has liked
    const { count: totalLikes } = await supabaseAdmin
      .from('post_likes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Get recent likes with post details (optional)
    const { data: recentLikes, error } = await supabaseAdmin
      .from('post_likes')
      .select('post_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('❌ Error fetching user likes:', error);
      return NextResponse.json({ error: 'Failed to fetch user likes' }, { status: 500 });
    }

    return NextResponse.json({
      totalLikes: totalLikes || 0,
      recentLikes: recentLikes || []
    });
  } catch (error) {
    console.error('❌ User likes error:', error);
    return NextResponse.json({ 
      error: 'Failed to get user likes summary' 
    }, { status: 500 });
  }
}