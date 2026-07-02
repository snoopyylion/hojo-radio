// app/api/podcast/recent-episodes/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '8'), 20);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: episodes, error } = await supabase
      .from('podcast_episodes')
      .select(`
        id, episode_number, title, description,
        cover_image_url, duration_seconds, play_count,
        like_count, published_at, recording_status, audio_url,
        podcast:podcasts!podcast_id(id, name, slug, cover_image_url, author_id),
        season:podcast_seasons!season_id(id, title, season_number),
        author:users!author_id(first_name, last_name)
      `)
      .eq('is_published', true)
      .eq('recording_status', 'ready')
      .order('published_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Recent episodes fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch episodes' }, { status: 500 });
    }

    const normalized = (episodes || []).map((ep) => {
      const podcast = Array.isArray(ep.podcast) ? ep.podcast[0] : ep.podcast;
      const season = Array.isArray(ep.season) ? ep.season[0] : ep.season;
      const author = Array.isArray(ep.author) ? ep.author[0] : ep.author;

      return {
        id: ep.id,
        episode_number: ep.episode_number,
        title: ep.title,
        description: ep.description,
        cover_image_url: ep.cover_image_url,
        audio_url: ep.audio_url,
        duration_seconds: ep.duration_seconds,
        play_count: ep.play_count,
        like_count: ep.like_count,
        published_at: ep.published_at,
        author: author || { first_name: 'Unknown', last_name: '' },
        podcast: {
          id: podcast?.id || '',
          name: podcast?.name || 'Unknown',
          slug: podcast?.slug || '',
          cover_image_url: podcast?.cover_image_url || null,
          author_id: podcast?.author_id || '',
        },
        season: {
          id: season?.id || '',
          title: season?.title || 'Season 1',
          season_number: season?.season_number || 1,
        },
      };
    });

    return NextResponse.json({ episodes: normalized });
  } catch (error) {
    console.error('Recent episodes API error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}