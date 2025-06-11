// app/api/search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sanityClient } from '@/lib/sanity/client';
import { GLOBAL_SEARCH_QUERY } from '@/sanity/lib/queries';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface SearchResult {
  id: string;
  type: 'user' | 'article' | 'author' | 'category';
  title: string;
  subtitle?: string;
  image?: string;
  url: string;
  excerpt?: string;
  publishedAt?: string | null;
  likes?: number;
  comments?: number;
  relevanceScore?: number;
  source?: 'supabase' | 'sanity';
  // Add these for debugging
  originalId?: string;
  databaseId?: string;
}

interface SearchResponse {
  results: SearchResult[];
  totalCount: number;
  query: string;
  categories: {
    users: SearchResult[];
    articles: SearchResult[];
    authors: SearchResult[];
    categories: SearchResult[];
  };
}

interface SanityPost {
  _id: string;
  title?: string;
  slug?: {
    current?: string;
  };
  excerpt?: string;
  description?: string;
  publishedAt?: string;
  likes?: number;
  comments?: number;
  author?: {
    name?: string;
  };
  mainImage?: {
    asset?: {
      url?: string;
    };
  };
}

interface SanityAuthor {
  _id: string;
  name?: string;
  slug?: {
    current?: string;
  };
  bio?: string;
  image?: {
    asset?: {
      url?: string;
    };
  };
}

interface SanityCategory {
  _id: string;
  title?: string;
  slug?: {
    current?: string;
  };
  description?: string;
}

interface SanitySearchResults {
  posts?: SanityPost[];
  authors?: SanityAuthor[];
  categories?: SanityCategory[];
}

// Define the expected user structure from Supabase
interface SupabaseUser {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  name?: string | null;
  full_name?: string | null;
  role?: string | null;
  clerk_id?: string | null;
  user_id?: string | null;
  external_id?: string | null;
  image_url?: string | null;
  avatar_url?: string | null;
  profile_image?: string | null;
  email?: string | null;
  username?: string | null;
  created_at?: string | null;
}

// Helper function to safely convert to string and handle null/undefined
const safeString = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'boolean') return value.toString();
  return String(value);
};

// Helper function to format dates
const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return 'Unknown date';
  }
};

// Enhanced relevance scoring function with safety checks
const calculateRelevance = (text: unknown, query: string): number => {
  const safeText = safeString(text).toLowerCase().trim();
  const safeQuery = safeString(query).toLowerCase().trim();
  
  if (!safeText || !safeQuery) return 0;
  
  if (safeText === safeQuery) return 100;
  if (safeText.startsWith(safeQuery)) return 90;
  if (safeText.includes(safeQuery)) return 80;
  
  const queryWords = safeQuery.split(' ').filter(word => word.length > 0);
  const textWords = safeText.split(' ').filter(word => word.length > 0);
  
  let matchScore = 0;
  const totalWords = queryWords.length;
  
  queryWords.forEach(queryWord => {
    const exactMatch = textWords.find(textWord => textWord === queryWord);
    const partialMatch = textWords.find(textWord => 
      textWord.includes(queryWord) || queryWord.includes(textWord)
    );
    
    if (exactMatch) {
      matchScore += 10;
    } else if (partialMatch) {
      matchScore += 5;
    }
  });
  
  return totalWords > 0 ? Math.min((matchScore / totalWords) * 7, 70) : 0;
};

// Type guard to check if the data is a valid user record
const isValidUser = (data: unknown): data is SupabaseUser => {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    typeof (data as { id: unknown }).id === 'string'
  );
};


// Function to get Supabase table structure and search users
const searchSupabaseUsers = async (query: string, limit: number = 20): Promise<SearchResult[]> => {
  try {
    console.log('🔍 Searching Supabase users with query:', query);
    
    // First, let's check what columns exist in the users table
    const { data: tableInfo, error: schemaError } = await supabase
      .from('users')
      .select('*')
      .limit(1);

    if (schemaError) {
      console.error('❌ Error checking table schema:', schemaError);
      return [];
    }

    const availableColumns = tableInfo && tableInfo.length > 0 ? Object.keys(tableInfo[0]) : [];
    console.log('📋 Available columns in users table:', availableColumns);

    // Build dynamic select query based on available columns
    const selectColumns = [
      'id',
      availableColumns.includes('first_name') ? 'first_name' : null,
      availableColumns.includes('last_name') ? 'last_name' : null,
      availableColumns.includes('name') ? 'name' : null,
      availableColumns.includes('full_name') ? 'full_name' : null,
      availableColumns.includes('role') ? 'role' : null,
      availableColumns.includes('clerk_id') ? 'clerk_id' : null,
      availableColumns.includes('user_id') ? 'user_id' : null,
      availableColumns.includes('external_id') ? 'external_id' : null,
      availableColumns.includes('image_url') ? 'image_url' : null,
      availableColumns.includes('avatar_url') ? 'avatar_url' : null,
      availableColumns.includes('profile_image') ? 'profile_image' : null,
      availableColumns.includes('email') ? 'email' : null,
      availableColumns.includes('username') ? 'username' : null,
      availableColumns.includes('created_at') ? 'created_at' : null,
    ].filter(Boolean).join(', ');

    // Build dynamic search conditions
    const searchConditions = [];
    if (availableColumns.includes('first_name')) searchConditions.push(`first_name.ilike.%${query}%`);
    if (availableColumns.includes('last_name')) searchConditions.push(`last_name.ilike.%${query}%`);
    if (availableColumns.includes('name')) searchConditions.push(`name.ilike.%${query}%`);
    if (availableColumns.includes('full_name')) searchConditions.push(`full_name.ilike.%${query}%`);
    if (availableColumns.includes('email')) searchConditions.push(`email.ilike.%${query}%`);
    if (availableColumns.includes('username')) searchConditions.push(`username.ilike.%${query}%`);

    if (searchConditions.length === 0) {
      console.log('⚠️ No searchable columns found in users table');
      return [];
    }

    // Perform the search
    const supabaseResponse = await supabase
      .from('users')
      .select(selectColumns)
      .or(searchConditions.join(','))
      .limit(limit);

    if (supabaseResponse.error) {
      console.error('Supabase user search error:', supabaseResponse.error);
      return [];
    }

    const rawUsers = supabaseResponse.data;

    if (!rawUsers || rawUsers.length === 0) {
      console.log('No Supabase users found for query:', query);
      return [];
    }

    // DEBUG: Log raw users from database
    console.log('📋 Raw Supabase users found:', rawUsers.map(u => {
      if (isValidUser(u)) {
        return {
          id: u.id,
          name: `${safeString(u.first_name)} ${safeString(u.last_name)}`.trim(),
          email: u.email,
          clerk_id: u.clerk_id,
          user_id: u.user_id
        };
      }
      return { invalid: true };
    }));

    const userResults: SearchResult[] = [];
    
    for (const rawUser of rawUsers) {
      try {
        // Use type guard to ensure we have a valid user
        if (!isValidUser(rawUser)) {
          console.warn('⚠️ Invalid user record skipped:', rawUser);
          continue;
        }

        const user = rawUser as SupabaseUser;
        
        // Safely extract user data
        const firstName = safeString(user.first_name || '').trim();
        const lastName = safeString(user.last_name || '').trim();
        const name = safeString(user.name || '').trim();
        const fullName = safeString(user.full_name || '').trim();
        const role = safeString(user.role || 'user');
        const email = safeString(user.email || '');
        const username = safeString(user.username || '');
        
        // Determine display name
        let displayName = '';
        if (fullName) {
          displayName = fullName;
        } else if (name) {
          displayName = name;
        } else if (firstName || lastName) {
          displayName = `${firstName} ${lastName}`.trim();
        } else if (username) {
          displayName = username;
        } else if (email) {
          displayName = email.split('@')[0];
        } else {
          displayName = 'Unknown User';
        }

        // Get image URL
        const imageUrl = safeString(
          user.image_url || 
          user.avatar_url || 
          user.profile_image
        );

        // Use the original database ID directly for URLs
        const originalId = safeString(user.id);
        const clerkId = safeString(user.clerk_id || '');
        const userId = safeString(user.user_id || '');
        
        // Calculate relevance
        const relevance = Math.max(
          calculateRelevance(displayName, query),
          calculateRelevance(firstName, query),
          calculateRelevance(lastName, query),
          calculateRelevance(name, query),
          calculateRelevance(fullName, query),
          calculateRelevance(email, query),
          calculateRelevance(username, query)
        );

        // Create search result with unique ID for search but original ID for URL
        const searchResult: SearchResult = {
          id: `supabase_user_${originalId}`, // Prefixed for search result uniqueness
          type: role.toLowerCase() === 'author' ? 'author' : 'user',
          title: displayName,
          subtitle: role.toLowerCase() === 'author' ? '✍️ Author' : '👤 User',
          url: `/user/${originalId}`, 
          image: imageUrl,
          excerpt: email ? `Email: ${email}` : undefined,
          relevanceScore: relevance,
          source: 'supabase',
          originalId: originalId, // Store for debugging
          databaseId: originalId // Store for reference
        };

        userResults.push(searchResult);

        // DEBUG: Log what we're adding to results
        console.log('✅ Added user to results:', {
          searchId: searchResult.id,
          originalId: originalId,
          title: displayName,
          url: searchResult.url,
          clerkId: clerkId || 'none',
          userId: userId || 'none'
        });

      } catch (userError) {
        console.warn('⚠️ Error processing user record:', userError);
        continue;
      }
    }

    console.log(`✅ Processed ${userResults.length} Supabase users`);
    return userResults;
  } catch (error) {
    console.error('❌ Error searching Supabase users:', error);
    return [];
  }
};

// Function to search Sanity content
const searchSanityContent = async (query: string, limit: number = 20): Promise<SearchResult[]> => {
  try {
    console.log('🔍 Searching Sanity content with query:', query);
    
    if (!sanityClient) {
      console.error('❌ Sanity client not available');
      return [];
    }

    const searchStrategies = [
      `"${query}"*`,
      `*${query}*`,
      query.split(' ').map(word => `"${word}"`).join(' '),
    ];

    const allResults: SanitySearchResults = { posts: [], authors: [], categories: [] };

    for (const searchTerm of searchStrategies) {
      try {
        const results: SanitySearchResults = await sanityClient.fetch(GLOBAL_SEARCH_QUERY, {
          searchTerm,
          limit: Math.ceil(limit / searchStrategies.length)
        });

        if (results?.posts) allResults.posts = [...(allResults.posts || []), ...results.posts];
        if (results?.authors) allResults.authors = [...(allResults.authors || []), ...results.authors];
        if (results?.categories) allResults.categories = [...(allResults.categories || []), ...results.categories];
      } catch (strategyError) {
        console.warn('⚠️ Search strategy failed:', searchTerm, strategyError);
      }
    }

    // Remove duplicates
    allResults.posts = Array.from(new Map((allResults.posts || []).map((item: SanityPost) => [item._id, item])).values());
    allResults.authors = Array.from(new Map((allResults.authors || []).map((item: SanityAuthor) => [item._id, item])).values());
    allResults.categories = Array.from(new Map((allResults.categories || []).map((item: SanityCategory) => [item._id, item])).values());

    const searchResults: SearchResult[] = [];

    // Process posts/articles
    if (allResults?.posts && Array.isArray(allResults.posts)) {
      allResults.posts.forEach((post: SanityPost) => {
        if (post && post._id && post.title) {
          const authorName = safeString(post.author?.name || 'Unknown Author');
          const publishedAt = post.publishedAt || null;
          const slug = safeString(post.slug?.current || post._id);
          const imageUrl = safeString(post.mainImage?.asset?.url || '');
          const title = safeString(post.title);
          const excerpt = safeString(post.excerpt || post.description || '');
          
          const titleRelevance = calculateRelevance(title, query);
          const excerptRelevance = calculateRelevance(excerpt, query);
          const authorRelevance = calculateRelevance(authorName, query);
          const relevance = Math.max(titleRelevance, excerptRelevance, authorRelevance);
          
          searchResults.push({
            id: `sanity_post_${post._id}`,
            type: 'article',
            title: title,
            subtitle: `📝 ${authorName}${publishedAt ? ` • ${formatDate(publishedAt)}` : ''}`,
            url: `/blog/${slug}`,
            image: imageUrl || undefined,
            excerpt: excerpt,
            publishedAt: publishedAt,
            likes: Number(post.likes) || 0,
            comments: Number(post.comments) || 0,
            relevanceScore: relevance,
            source: 'sanity',
            originalId: post._id,
            databaseId: post._id
          });
        }
      });
    }

    // Process Sanity authors
    if (allResults?.authors && Array.isArray(allResults.authors)) {
      allResults.authors.forEach((author: SanityAuthor) => {
        if (author && author._id && author.name) {
          const slug = safeString(author.slug?.current || author._id);
          const imageUrl = safeString(author.image?.asset?.url || '/default-avatar.png');
          const name = safeString(author.name);
          const bio = safeString(author.bio || '');
          
          const nameRelevance = calculateRelevance(name, query);
          const bioRelevance = calculateRelevance(bio, query);
          const relevance = Math.max(nameRelevance, bioRelevance);
          
          searchResults.push({
            id: `sanity_author_${author._id}`,
            type: 'author',
            title: name,
            subtitle: '✍️ Author (Sanity) • View Profile',
            url: `/authors/${slug}`,
            image: imageUrl,
            excerpt: bio,
            relevanceScore: relevance,
            source: 'sanity',
            originalId: author._id,
            databaseId: author._id
          });
        }
      });
    }

    // Process categories
    if (allResults?.categories && Array.isArray(allResults.categories)) {
      allResults.categories.forEach((category: SanityCategory) => {
        if (category && category._id && category.title) {
          const slug = safeString(category.slug?.current || category._id);
          const title = safeString(category.title);
          const description = safeString(category.description || '');
          
          const relevance = calculateRelevance(title, query);
          
          searchResults.push({
            id: `sanity_category_${category._id}`,
            type: 'category',
            title: title,
            subtitle: '🏷️ Category • Browse Posts',
            url: `/blog/category/${slug}`,
            excerpt: description,
            relevanceScore: relevance,
            source: 'sanity',
            originalId: category._id,
            databaseId: category._id
          });
        }
      });
    }

    console.log(`✅ Found ${searchResults.length} Sanity results`);
    return searchResults;
  } catch (error) {
    console.error('❌ Error searching Sanity content:', error);
    return [];
  }
};

// Deduplicate results
const deduplicateResults = (results: SearchResult[]): SearchResult[] => {
  const seen = new Map<string, SearchResult>();
  
  results.forEach(result => {
    const key = `${result.type}_${safeString(result.title).toLowerCase().trim()}`;
    
    if (!seen.has(key) || (result.relevanceScore || 0) > (seen.get(key)?.relevanceScore || 0)) {
      seen.set(key, result);
    }
  });
  
  return Array.from(seen.values());
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim();
    const type = searchParams.get('type') || 'all';
    const limit = parseInt(searchParams.get('limit') || '20');

    console.log('🔍 Search API called with:', { query, type, limit });

    if (!query) {
      return NextResponse.json({
        results: [],
        totalCount: 0,
        query: '',
        categories: { users: [], articles: [], authors: [], categories: [] }
      });
    }

    const results: SearchResult[] = [];

    // Search Supabase users
    if (type === 'all' || type === 'users' || type === 'authors') {
      const supabaseUserResults = await searchSupabaseUsers(query, limit);
      results.push(...supabaseUserResults);
    }

    // Search Sanity content
    if (type === 'all' || ['articles', 'authors', 'categories'].includes(type)) {
      const sanityResults = await searchSanityContent(query, limit);
      results.push(...sanityResults);
    }

    // Deduplicate results
    const deduplicatedResults = deduplicateResults(results);

    // Sort by relevance score
    const typePriority: Record<SearchResult['type'], number> = { user: 1, author: 2, article: 3, category: 4 };
    deduplicatedResults.sort((a, b) => {
      const scoreDiff = (b.relevanceScore || 0) - (a.relevanceScore || 0);
      if (scoreDiff !== 0) return scoreDiff;
      return (typePriority[a.type] || 5) - (typePriority[b.type] || 5);
    });

    // Categorize results
    const categories = {
      users: deduplicatedResults.filter(r => r.type === 'user'),
      articles: deduplicatedResults.filter(r => r.type === 'article'),
      authors: deduplicatedResults.filter(r => r.type === 'author'),
      categories: deduplicatedResults.filter(r => r.type === 'category')
    };

    // Filter results based on type
    let filteredResults = deduplicatedResults;
    if (type !== 'all') {
      const typeMapping: Record<string, SearchResult['type']> = {
        users: 'user',
        articles: 'article',
        authors: 'author',
        categories: 'category'
      };
      
      const mappedType = typeMapping[type];
      if (mappedType) {
        filteredResults = deduplicatedResults.filter(r => r.type === mappedType);
      }
    }

    filteredResults = filteredResults.slice(0, limit);

    const response: SearchResponse = {
      results: filteredResults,
      totalCount: deduplicatedResults.length,
      query,
      categories
    };

    // DEBUG: Log final results
    console.log('✅ Search completed:', {
      totalResults: deduplicatedResults.length,
      users: categories.users.length,
      articles: categories.articles.length,
      authors: categories.authors.length,
      categories: categories.categories.length,
      userUrls: categories.users.map(u => ({ title: u.title, url: u.url, id: u.id, originalId: u.originalId }))
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ Search API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}