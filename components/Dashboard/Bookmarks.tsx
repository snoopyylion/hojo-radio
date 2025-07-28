// BookmarksPage.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { urlFor } from '@/sanity/lib/image';
import Link from 'next/link';
import Image from 'next/image';

import {
  Bookmark,
  Clock,
  ChevronLeft,
  ChevronRight,
  Trash2,
  BookOpen,
  Loader2,
  AlertCircle,
  Filter,
  Grid,
  List
} from 'lucide-react';

import { useAuth } from '@clerk/nextjs';
import { notificationService } from '@/lib/notificationService';
import toast from 'react-hot-toast';

interface SanityImage {
  asset: {
    _ref: string;
    _type: string;
  };
}

interface BookmarkedPost {
  id: string;
  post_id: string;
  created_at: string;
  post: {
    _id: string;
    title: string;
    description: string;
    slug: { current: string };
    mainImage?: SanityImage;
    publishedAt: string;
    author: {
      name: string;
      image?: SanityImage;
    };
    categories: { title: string }[];
  };
}

interface BookmarksData {
  bookmarks: BookmarkedPost[];
  count: number;
  totalPages: number;
  currentPage: number;
}

const formatTimeAgo = (date: string | Date) => {
  const now = new Date();
  const past = new Date(date);
  const diff = Math.floor((now.getTime() - past.getTime()) / 1000);

  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} days ago`;
  if (diff < 31536000) return `${Math.floor(diff / 2592000)} months ago`;
  return `${Math.floor(diff / 31536000)} years ago`;
};

const getImageUrl = (image: SanityImage | undefined, width: number, height: number): string | null => {
  if (!image || !image.asset || !image.asset._ref) return null;
  try {
    return urlFor(image).width(width).height(height).url();
  } catch (err) {
    console.warn('Image generation error:', err);
    return null;
  }
};

const BookmarksPage: React.FC = () => {
  const { userId } = useAuth();
  const [bookmarksData, setBookmarksData] = useState<BookmarksData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isRemoving, setIsRemoving] = useState<string | null>(null);

  const limit = 12;

  const fetchBookmarks = useCallback(async (page: number) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/user/bookmarks?page=${page}&limit=${limit}`);
      if (!res.ok) throw new Error('Failed to fetch bookmarks');
      const data: BookmarksData = await res.json();
      setBookmarksData(data);
      setCurrentPage(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error occurred');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchBookmarks(1);
  }, [fetchBookmarks]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= (bookmarksData?.totalPages || 1)) {
      fetchBookmarks(page);
    }
  };

  const handleRemoveBookmark = async (postId: string, bookmarkId: string) => {
    if (isRemoving) return;
    setIsRemoving(bookmarkId);
    try {
      const res = await fetch(`/api/post/${postId}/bookmark`, { method: 'POST' });
      if (res.ok) {
        setBookmarksData(prev => {
          if (!prev) return null;
          const updated = prev.bookmarks.filter(b => b.id !== bookmarkId);
          return { ...prev, bookmarks: updated, count: prev.count - 1 };
        });
        // Log user activity
        if (userId && postId) {
          await notificationService.createUserActivity({
            user_id: userId,
            type: 'post_bookmarked',
            title: 'Bookmark Removed',
            description: `You removed a bookmark from a post`,
            category: 'content',
            visibility: 'private',
            data: { post_id: postId }
          });
        }
        // Show toast
        toast.success('Bookmark removed');
      }
    } catch (err) {
      console.error('Remove failed:', err);
      toast.error('Failed to remove bookmark');
    } finally {
      setIsRemoving(null);
    }
  };

  const getUniqueCategories = () => {
    if (!bookmarksData?.bookmarks) return [];
    const categories = new Set<string>();
    bookmarksData.bookmarks.forEach(b => b.post.categories.forEach(c => categories.add(c.title)));
    return Array.from(categories).sort();
  };

  const categories = getUniqueCategories();
  const filteredBookmarks = bookmarksData?.bookmarks.filter(b =>
    selectedCategory === 'all' || b.post.categories.some(c => c.title === selectedCategory)
  ) || [];

  if (loading && !bookmarksData) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#EF3866] animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center text-center">
        <div>
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-black dark:text-white mb-2">Error Loading Bookmarks</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">{error}</p>
          <button onClick={() => fetchBookmarks(currentPage)} className="bg-[#EF3866] text-white px-4 py-2 rounded-lg hover:bg-[#d63456]">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-6">
          <Bookmark className="w-6 h-6 text-[#EF3866]" />
          <h1 className="text-2xl font-bold">My Bookmarks</h1>
        </div>
        <p className="text-gray-700 dark:text-gray-300 mb-6">{bookmarksData?.count || 0} saved articles</p>

        {/* Controls */}
        <div className="flex justify-between flex-wrap gap-4 mb-8">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="bg-white dark:bg-black border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => <option key={cat}>{cat}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2">
            {['grid', 'list'].map(mode => {
              const Icon = mode === 'grid' ? Grid : List;
              return (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode as 'grid' | 'list')}
                  className={`p-2 rounded transition-colors ${viewMode === mode
                    ? 'bg-[#EF3866] text-white'
                    : 'bg-white dark:bg-black border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Bookmarks */}
        {filteredBookmarks.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="w-14 h-14 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold">No bookmarks yet</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2 mb-4">Save articles to read later</p>
            <Link href="/" className="inline-block bg-[#EF3866] text-white px-6 py-3 rounded-lg hover:bg-[#d63456]">
              Browse Articles
            </Link>
          </div>
        ) : (
          <div className={`mb-10 ${viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-6'}`}>
            {filteredBookmarks.map(bookmark => {
              const imageUrl = getImageUrl(bookmark.post.mainImage, 400, 250);
              const card = (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex gap-2 flex-wrap">
                      {bookmark.post.categories.slice(0, 2).map((cat, i) => (
                        <span key={i} className="text-xs bg-[#EF3866]/10 text-[#EF3866] px-2 py-1 rounded-full">
                          {cat.title}
                        </span>
                      ))}
                    </div>
                    <button
                      onClick={() => handleRemoveBookmark(bookmark.post._id, bookmark.id)}
                      disabled={isRemoving === bookmark.id}
                      className="text-gray-500 hover:text-red-500 transition"
                    >
                      {isRemoving === bookmark.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>

                  <Link href={`/post/${bookmark.post._id}`}>
                    <h3 className="text-lg font-semibold hover:text-[#EF3866] mb-2 line-clamp-2">
                      {bookmark.post.title}
                    </h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
                      {bookmark.post.description}
                    </p>
                  </Link>

                  <div className="mt-4 flex justify-between text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex gap-2 items-center">
                      <div className="w-6 h-6 bg-[#EF3866] text-white rounded-full flex items-center justify-center text-xs">
                        {bookmark.post.author.name.charAt(0)}
                      </div>
                      <span>{bookmark.post.author.name}</span>
                    </div>
                    <div className="flex gap-1 items-center">
                      <Clock className="w-3 h-3" />
                      <span>{formatTimeAgo(bookmark.created_at)}</span>
                    </div>
                  </div>
                </>
              );

              return (
                <div key={bookmark.id} className="bg-white dark:bg-black border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm hover:shadow-md transition">
                  {viewMode === 'grid' ? (
                    <Link href={`/post/${bookmark.post._id}`}>
                      <div className="relative w-full h-48 mb-4 rounded overflow-hidden bg-white dark:bg-black">
                        {imageUrl ? (
                          <Image src={imageUrl} alt={bookmark.post.title} fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-[#EF3866]/10 to-purple-100 dark:to-purple-900 flex items-center justify-center">
                            <BookOpen className="w-10 h-10 text-gray-400" />
                          </div>
                        )}
                      </div>
                    </Link>
                  ) : null}
                  {card}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {bookmarksData && bookmarksData.totalPages > 1 && (
          <div className="flex justify-center gap-4">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-4 py-2 border rounded-lg text-sm bg-white dark:bg-black border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
            >
              <ChevronLeft className="inline w-4 h-4 mr-1" />
              Previous
            </button>
            <span className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
              Page {currentPage} of {bookmarksData.totalPages}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === bookmarksData.totalPages}
              className="px-4 py-2 border rounded-lg text-sm bg-white dark:bg-black border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
            >
              Next
              <ChevronRight className="inline w-4 h-4 ml-1" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookmarksPage;
