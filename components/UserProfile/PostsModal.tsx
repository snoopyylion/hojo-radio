// components/UserProfile/PostsModal.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Loader, AlertCircle } from 'lucide-react';
import { gsap } from 'gsap';
import NewsTile from '@/components/NewsTile'; // Adjust import path as needed

interface SanityImage {
  asset: {
    _ref: string;
    _type: string;
    url?: string;
  };
}

interface Post {
  _id: string;
  title: string;
  description: string;
  excerpt?: string;
  slug: { current: string };
  mainImage?: SanityImage;
  publishedAt: string;
  _createdAt: string;
  _updatedAt: string;
  likes?: number;
  comments?: number;
  author: {
    _id: string;
    name: string;
    userId?: string;
    email?: string;
    username?: string;
    image?: SanityImage;
  };
  categories: { title: string }[];
}

interface PostsModalProps {
  authorId: string;
  authorName: string;
  onClose: () => void;
}

export const PostsModal: React.FC<PostsModalProps> = ({
  authorId,
  authorName,
  onClose
}) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const modalRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Animate modal entrance
    if (modalRef.current && overlayRef.current && contentRef.current) {
      const tl = gsap.timeline();
      
      gsap.set(overlayRef.current, { opacity: 0 });
      gsap.set(contentRef.current, { opacity: 0, scale: 0.9, y: 20 });
      
      tl.to(overlayRef.current, {
        opacity: 1,
        duration: 0.3,
        ease: "power2.out"
      })
      .to(contentRef.current, {
        opacity: 1,
        scale: 1,
        y: 0,
        duration: 0.4,
        ease: "power2.out"
      }, "-=0.1");
    }
  }, []);

  const fetchPosts = useCallback(async () => {
  try {
    setLoading(true);
    setError(null);

    const response = await fetch('/api/post/by-author', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authorId }),
    });

    if (!response.ok) throw new Error(`Failed to fetch posts: ${response.statusText}`);

    const data = await response.json();

    const transformedPosts = data.map((post: Post) => ({
      ...post,
      categories: post.categories || [],
      mainImage: post.mainImage?.asset ? {
        asset: {
          _ref: post.mainImage.asset._ref || '',
          _type: post.mainImage.asset._type || 'reference',
          url: post.mainImage.asset.url,
        },
      } : undefined,
    }));

    setPosts(transformedPosts);
  } catch (err) {
    console.error('Error fetching posts:', err);
    setError(err instanceof Error ? err.message : 'Failed to fetch posts');
  } finally {
    setLoading(false);
  }
}, [authorId]); // ✅ Add 'authorId' as a dependency

useEffect(() => {
  fetchPosts();
}, [fetchPosts]);

  const handleClose = () => {
    if (overlayRef.current && contentRef.current) {
      const tl = gsap.timeline({
        onComplete: onClose
      });
      
      tl.to(contentRef.current, {
        opacity: 0,
        scale: 0.9,
        y: 20,
        duration: 0.3,
        ease: "power2.in"
      })
      .to(overlayRef.current, {
        opacity: 0,
        duration: 0.2,
        ease: "power2.in"
      }, "-=0.1");
    } else {
      onClose();
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClose();
    }
  };

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      {/* Overlay */}
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleOverlayClick}
      />

      {/* Modal Content */}
      <div
        ref={contentRef}
        className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-800/50 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200/50 dark:border-gray-800/50 bg-gray-50/50 dark:bg-gray-800/30">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {authorName}&apos;s Posts
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {loading ? 'Loading...' : `${posts.length} post${posts.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"
            aria-label="Close modal"
          >
            <X size={24} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <Loader className="w-8 h-8 animate-spin text-[#EF3866] mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">Loading posts...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
                <p className="text-red-600 dark:text-red-400 mb-2">Error loading posts</p>
                <p className="text-gray-600 dark:text-gray-400 text-sm">{error}</p>
                <button
                  onClick={fetchPosts}
                  className="mt-4 px-4 py-2 bg-[#EF3866] text-white rounded-lg hover:bg-[#d7325a] transition-colors duration-200"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : posts.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-gray-600 dark:text-gray-400">No posts found</p>
                <p className="text-gray-500 dark:text-gray-500 text-sm mt-1">This author hasn&apos;t published any posts yet.</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {posts.map((post) => (
                <div key={post._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors duration-200">
                  <NewsTile post={post} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};