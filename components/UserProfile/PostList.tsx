// components/UserProfile/PostsList.tsx
'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, MessageCircle, BookOpen, Calendar } from 'lucide-react';
import { UserPost } from '@/types/user';

interface PostsListProps {
  posts: UserPost[];
  loading?: boolean;
}

export const PostsList: React.FC<PostsListProps> = ({ posts, loading = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && !loading) {
      const items = containerRef.current.querySelectorAll('.post-item');
      gsap.fromTo(items, 
        { opacity: 0, y: 30 },
        { 
          opacity: 1, 
          y: 0, 
          duration: 0.5,
          stagger: 0.1,
          ease: "power2.out"
        }
      );
    }
  }, [posts, loading]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse bg-gray-100 dark:bg-gray-800 rounded-xl p-6">
            <div className="flex gap-4">
              <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-lg flex-shrink-0"></div>
              <div className="flex-1 space-y-3">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                <div className="flex gap-4">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
          <BookOpen size={32} className="text-gray-400 dark:text-gray-500" />
        </div>
        <div className="w-16 h-0.5 bg-[#EF3866] mx-auto mb-6"></div>
        <h3 className="text-2xl font-light text-gray-900 dark:text-white mb-4 tracking-tight">
          No Posts Yet
        </h3>
        <p className="text-gray-600 dark:text-gray-400 leading-relaxed font-light max-w-md mx-auto">
          This author hasn&apos;t published any posts yet. Check back later to discover their content and insights.
        </p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="space-y-6">
      {posts.map((post) => {
        // Use slug if available, otherwise fall back to ID
        const postUrl = post.slug ? `/post/${post.slug}` : `/post/${post.id}`;
        
        return (
          <Link href={postUrl} key={post.id}>
            <div className="post-item group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:shadow-lg hover:border-[#EF3866]/30 transition-all duration-300 cursor-pointer">
              <div className="flex gap-6">
                {post.image_url && (
                  <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-xl overflow-hidden flex-shrink-0">
                    <Image
                      src={post.image_url}
                      alt={post.title}
                      width={96}
                      height={96}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-3 group-hover:text-[#EF3866] transition-colors line-clamp-2 leading-snug">
                    {post.title}
                  </h3>
                  {post.excerpt && (
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-3 leading-relaxed">
                      {post.excerpt}
                    </p>
                  )}
                  <div className="flex items-center gap-6 text-xs text-gray-500 dark:text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={14} />
                      <span className="font-medium">{formatDate(post.published_at)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Heart size={14} />
                      <span className="font-medium">{post.likes_count || 0}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MessageCircle size={14} />
                      <span className="font-medium">{post.comments_count || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
};