// app/api/post/[id]/view/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sanityClient } from '@/lib/sanity/server';
import { auth } from '@clerk/nextjs/server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const postId = id;

    // Get client IP and user agent
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Fetch post details from Sanity
    const post = await sanityClient.fetch(
      `*[_type == "post" && _id == $postId][0]{
        _id,
        title,
        slug
      }`,
      { postId }
    );

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Check if user already viewed this post today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { data: existingView } = await supabaseAdmin
      .from('post_views')
      .select('id')
      .eq('user_id', userId)
      .eq('post_id', postId)
      .gte('viewed_at', today.toISOString())
      .single();

    if (existingView) {
      // Update the viewed_at timestamp for existing view
      const { data: updatedView, error } = await supabaseAdmin
        .from('post_views')
        .update({ 
          viewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', existingView.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating post view:', error);
        return NextResponse.json({ error: "Failed to update view" }, { status: 500 });
      }

      return NextResponse.json({ 
        message: "View updated successfully",
        view: updatedView
      });
    }

    // Create new view record
    const { data: newView, error } = await supabaseAdmin
      .from('post_views')
      .insert({
        user_id: userId,
        post_id: postId,
        post_title: post.title,
        post_slug: post.slug?.current,
        ip_address: ip,
        user_agent: userAgent,
        viewed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating post view:', error);
      return NextResponse.json({ error: "Failed to record view" }, { status: 500 });
    }

    return NextResponse.json({ 
      message: "View recorded successfully",
      view: newView
    });

  } catch (error) {
    console.error('Error in view tracking:', error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}