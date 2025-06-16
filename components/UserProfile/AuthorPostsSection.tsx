
// components/UserProfile/AuthorPostsSection.tsx
'use client';

import React from 'react';
import { PostsList } from './PostList';
import { useAuthorPosts } from '@/hooks/author-posts/useAuthorPosts';
import { BookOpen } from 'lucide-react';

interface AuthorPostsSectionProps {
  userId: string;
  isAuthor: boolean;
  userName: string;
}

export const AuthorPostsSection: React.FC<AuthorPostsSectionProps> = ({
  userId,
  isAuthor,
  userName
}) => {
  const { posts, loading, error } = useAuthorPosts({ 
    authorId: userId, 
    isAuthor 
  });

  // Don't render anything if user is not an author
  if (!isAuthor) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-gray-200 dark:border-gray-700">
        <BookOpen size={24} className="text-[#EF3866]" />
        <h3 className="text-2xl font-light text-gray-900 dark:text-white tracking-tight">
          Posts by {userName}
        </h3>
        {!loading && posts.length > 0 && (
          <span className="px-3 py-1 bg-[#EF3866]/10 text-[#EF3866] text-sm font-medium rounded-full">
            {posts.length}
          </span>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-400 text-sm">
            Failed to load posts: {error}
          </p>
        </div>
      )}

      {/* Posts List */}
      <PostsList posts={posts} loading={loading} />
    </div>
  );
};