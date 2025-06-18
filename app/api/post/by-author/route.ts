// pages/api/post/by-author.ts or app/api/post/by-author/route.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { client } from '@/sanity/lib/client';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Debug query to see all author documents and their fields
const DEBUG_AUTHORS_QUERY = `
  *[_type == "author"] {
    _id,
    name,
    userId,
    email,
    username
  }
`;

// Debug query to see all posts with their author references
const DEBUG_POSTS_QUERY = `
  *[_type == "post"] {
    _id,
    title,
    author -> {
      _id,
      name,
      userId,
      email,
      username
    }
  }
`;

// CORRECTED: Query using the actual field name 'userId' from your Sanity data
const POSTS_BY_AUTHOR_QUERY = `
  *[_type == "post" && author->userId == $userId] | order(publishedAt desc) {
    _id,
    title,
    description,
    excerpt,
    body,
    mainImage {
      asset -> {
        url
      }
    },
    publishedAt,
    _createdAt,
    _updatedAt,
    slug,
    likes,
    comments,
    author -> {
      _id,
      name,
      userId,
      email,
      username,
      image {
        asset -> {
          url
        }
      }
    }
  }
`;

// Alternative queries for different possible field names (keeping as fallback)
const POSTS_BY_AUTHOR_QUERIES = [
  // Try user_id
  `*[_type == "post" && author->user_id == $userId] | order(publishedAt desc) {
    _id, title, description, excerpt, body,
    mainImage { asset -> { url } },
    publishedAt, _createdAt, _updatedAt, slug, likes, comments,
    author -> { _id, name, user_id, image { asset -> { url } } }
  }`,
  // Try clerk_user_id  
  `*[_type == "post" && author->clerk_user_id == $userId] | order(publishedAt desc) {
    _id, title, description, excerpt, body,
    mainImage { asset -> { url } },
    publishedAt, _createdAt, _updatedAt, slug, likes, comments,
    author -> { _id, name, clerk_user_id, image { asset -> { url } } }
  }`,
  // Try supabase_user_id
  `*[_type == "post" && author->supabase_user_id == $userId] | order(publishedAt desc) {
    _id, title, description, excerpt, body,
    mainImage { asset -> { url } },
    publishedAt, _createdAt, _updatedAt, slug, likes, comments,
    author -> { _id, name, supabase_user_id, image { asset -> { url } } }
  }`,
  // Try external_user_id
  `*[_type == "post" && author->external_user_id == $userId] | order(publishedAt desc) {
    _id, title, description, excerpt, body,
    mainImage { asset -> { url } },
    publishedAt, _createdAt, _updatedAt, slug, likes, comments,
    author -> { _id, name, external_user_id, image { asset -> { url } } }
  }`,
  // Try id (if you stored it as 'id' field)
  `*[_type == "post" && author->id == $userId] | order(publishedAt desc) {
    _id, title, description, excerpt, body,
    mainImage { asset -> { url } },
    publishedAt, _createdAt, _updatedAt, slug, likes, comments,
    author -> { _id, name, id, image { asset -> { url } } }
  }`
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { authorId } = req.body;

    if (!authorId) {
      return res.status(400).json({ error: 'Author ID is required' });
    }

    // Since you're using Clerk user IDs, you might want to verify differently
    // or skip Supabase verification if authors are managed in Sanity
    
    // Optional: Verify user exists in Supabase (comment out if not needed)
    /*
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', authorId)
      .single();

    if (userError) {
      console.error('Error fetching user:', userError);
      return res.status(404).json({ error: 'User not found' });
    }

    if (userData.role !== 'author') {
      return res.status(403).json({ error: 'User is not an author' });
    }
    */

    // Debug: First, let's see what authors exist
    console.log('DEBUG: Fetching all authors...');
    const allAuthors = await client.fetch(DEBUG_AUTHORS_QUERY);
    console.log('DEBUG: All authors:', JSON.stringify(allAuthors, null, 2));

    // Debug: Let's see all posts with their authors
    console.log('DEBUG: Fetching all posts with authors...');
    const allPosts = await client.fetch(DEBUG_POSTS_QUERY);
    console.log('DEBUG: All posts with authors:', JSON.stringify(allPosts, null, 2));

    // Try the corrected main query first (using 'userId' field)
    let posts = await client.fetch(POSTS_BY_AUTHOR_QUERY, { userId: authorId });
    console.log(`DEBUG: Main query result: ${posts.length} posts`);

    // If no posts found, try all alternative queries
    if (posts.length === 0) {
      for (let i = 0; i < POSTS_BY_AUTHOR_QUERIES.length; i++) {
        console.log(`DEBUG: Trying alternative query ${i + 1}...`);
        posts = await client.fetch(POSTS_BY_AUTHOR_QUERIES[i], { userId: authorId });
        console.log(`DEBUG: Alternative query ${i + 1} result: ${posts.length} posts`);
        if (posts.length > 0) break;
      }
    }

    console.log(`Found ${posts.length} posts for author ${authorId}`);

    return res.status(200).json(posts);

  } catch (error) {
    console.error('Error fetching posts by author:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// If using App Router (app/api/post/by-author/route.ts)
export async function POST(request: Request) {
  try {
    const { authorId } = await request.json();

    if (!authorId) {
      return Response.json({ error: 'Author ID is required' }, { status: 400 });
    }

    // Optional: Verify user exists in Supabase (comment out if not needed)
    /*
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', authorId)
      .single();

    if (userError) {
      console.error('Error fetching user:', userError);
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    if (userData.role !== 'author') {
      return Response.json({ error: 'User is not an author' }, { status: 403 });
    }
    */

    // Debug: First, let's see what authors exist
    console.log('DEBUG: Fetching all authors...');
    const allAuthors = await client.fetch(DEBUG_AUTHORS_QUERY);
    console.log('DEBUG: All authors:', JSON.stringify(allAuthors, null, 2));

    // Debug: Let's see all posts with their authors
    console.log('DEBUG: Fetching all posts with authors...');
    const allPosts = await client.fetch(DEBUG_POSTS_QUERY);
    console.log('DEBUG: All posts with authors:', JSON.stringify(allPosts, null, 2));

    // Try the corrected main query first (using 'userId' field)
    let posts = await client.fetch(POSTS_BY_AUTHOR_QUERY, { userId: authorId });
    console.log(`DEBUG: Main query result: ${posts.length} posts`);

    // If no posts found, try all alternative queries
    if (posts.length === 0) {
      for (let i = 0; i < POSTS_BY_AUTHOR_QUERIES.length; i++) {
        console.log(`DEBUG: Trying alternative query ${i + 1}...`);
        posts = await client.fetch(POSTS_BY_AUTHOR_QUERIES[i], { userId: authorId });
        console.log(`DEBUG: Alternative query ${i + 1} result: ${posts.length} posts`);
        if (posts.length > 0) break;
      }
    }

    console.log(`Found ${posts.length} posts for author ${authorId}`);

    return Response.json(posts);

  } catch (error) {
    console.error('Error fetching posts by author:', error);
    return Response.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}