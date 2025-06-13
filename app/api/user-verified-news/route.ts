// pages/api/user-verified-news.ts or app/api/user-verified-news/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Define types for better type safety
interface SourceObject {
  name?: string;
  url?: string;
  credibility_score?: number;
}

type MatchedSource = string | SourceObject;
type MatchedSources = MatchedSource[] | string | null | undefined;

interface ParsedSource {
  name: string;
  url: string;
  credibility_score: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Select the columns from your verifications table
    const { data: verifications, error } = await supabase
      .from('verifications')
      .select(`
        id,
        headline,
        content,
        verdict,
        created_at,
        credibility_score,
        confidence_level,
        source_url,
        matched_sources,
        user_id
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch verified news' },
        { status: 500 }
      );
    }

    // Helper function to parse matched_sources with proper typing
    const parseMatchedSources = (matched_sources: MatchedSources): ParsedSource[] => {
      if (!matched_sources) return [];
      
      try {
        // If it's already an array, return it
        if (Array.isArray(matched_sources)) {
          return matched_sources.map((source, index) => {
            if (typeof source === 'string') {
              // If it's a URL string, create a source object
              if (source.startsWith('http')) {
                return {
                  name: `Source ${index + 1}`,
                  url: source,
                  credibility_score: 75 // Default score
                };
              }
              return { name: source, url: '#', credibility_score: 75 };
            }
            // If it's already an object with name and url
            return {
              name: source.name || `Source ${index + 1}`,
              url: source.url || source.name || '#',
              credibility_score: source.credibility_score || 75
            };
          });
        }
        
        // If it's a JSON string, parse it
        if (typeof matched_sources === 'string') {
          const parsed: unknown = JSON.parse(matched_sources);
          if (Array.isArray(parsed)) {
            return parsed.map((source: unknown, index: number) => ({
              name: typeof source === 'string' ? `Source ${index + 1}` : 
                    (typeof source === 'object' && source !== null && 'name' in source && typeof source.name === 'string' ? source.name : `Source ${index + 1}`),
              url: typeof source === 'string' ? source : 
                   (typeof source === 'object' && source !== null && 'url' in source && typeof source.url === 'string' ? source.url : '#'),
              credibility_score: typeof source === 'object' && source !== null && 'credibility_score' in source && typeof source.credibility_score === 'number' ? source.credibility_score : 75
            }));
          }
        }
        
        return [];
      } catch (e) {
        console.error('Error parsing matched_sources:', e);
        return [];
      }
    };

    // Transform the data to match the VerifiedNews interface
    const verifiedNews = verifications?.map(item => {
      const sources = parseMatchedSources(item.matched_sources);
      const isFake = item.verdict?.toLowerCase().includes('fake') || 
                     item.verdict?.toLowerCase().includes('false') ||
                     (item.credibility_score !== null && item.credibility_score < 30);
      
      return {
        id: item.id,
        title: item.headline || 'Untitled News',
        excerpt: item.content?.substring(0, 200) + (item.content?.length > 200 ? '...' : '') || '',
        source: 'Verified News',
        published_at: item.created_at,
        verified_at: item.created_at,
        image_url: null, // No image_url column available
        external_url: item.source_url || '#',
        sources: sources, // Parsed matched_sources
        views_count: Math.floor(Math.random() * 100) + 1, // Random for demo
        credibility_score: item.credibility_score || 75,
        is_fake: isFake,
        has_matching_source: sources.length > 0,
        verdict: item.verdict,
        confidence_level: item.confidence_level
      };
    }) || [];

    return NextResponse.json({
      success: true,
      verifiedNews,
      count: verifiedNews.length
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}