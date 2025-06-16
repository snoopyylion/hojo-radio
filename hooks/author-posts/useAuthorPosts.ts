// hooks/useAuthorPosts.ts
import { useState, useEffect } from 'react';
import { UserPost } from '@/types/user';

export const POSTS_BY_AUTHOR_QUERY = `
  *[_type == "post" && author._ref == $id] | order(publishedAt desc, _createdAt desc) {
    _id,
    _createdAt,
    _updatedAt,
    title,
    slug,
    description,
    excerpt,
    body,
    mainImage {
      asset -> {
        url,
        metadata {
          dimensions
        }
      }
    },
    author -> {
      _id,
      name,
      slug,
      image {
        asset -> {
          url
        }
      }
    },
    categories[] -> {
      _id,
      title
    },
    publishedAt,
    likes,
    comments
  }
`;

interface UseAuthorPostsProps {
  authorId: string;
  isAuthor: boolean;
}

export const useAuthorPosts = ({ authorId, isAuthor }: UseAuthorPostsProps) => {
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only fetch posts if user is confirmed to be an author
    if (!isAuthor || !authorId) {
      setPosts([]);
      return;
    }

    const fetchAuthorPosts = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/post/by-author', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ authorId }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch author posts');
        }

        const data = await response.json();
        
        // Transform Sanity data to match UserPost interface
        const transformedPosts: UserPost[] = data.map((post: any) => ({
          id: post._id,
          title: post.title,
          excerpt: post.excerpt || post.description || '',
          image_url: post.mainImage?.asset?.url || null,
          published_at: post.publishedAt || post._createdAt,
          likes_count: post.likes?.length || 0,
          comments_count: post.comments?.length || 0,
          slug: post.slug,
          author: {
            id: post.author._id,
            name: post.author.name,
            image_url: post.author.image?.asset?.url || null,
          }
        }));

        setPosts(transformedPosts);
      } catch (err) {
        console.error('Error fetching author posts:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAuthorPosts();
  }, [authorId, isAuthor]);

  return { posts, loading, error, refetch: () => {
    if (isAuthor && authorId) {
      // Trigger refetch by updating a dependency
    }
  }};
};
