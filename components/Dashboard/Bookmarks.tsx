import React, { useState, useEffect, useCallback } from 'react';
import { urlFor } from '@/sanity/lib/image';
import Link from 'next/link';
import Image from 'next/image';

// Utility function to format relative time
const formatTimeAgo = (date: string | Date) => {
    const now = new Date();
    const past = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} months ago`;
    return `${Math.floor(diffInSeconds / 31536000)} years ago`;
};

// Utility function to safely get image URL
const getImageUrl = (image: SanityImage | undefined, width: number, height: number): string | null => {
    if (!image || !image.asset || !image.asset._ref) {
        return null;
    }
    
    try {
        return urlFor(image).width(width).height(height).url();
    } catch (error) {
        console.warn('Failed to generate image URL:', error);
        return null;
    }
};

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

const BookmarksPage: React.FC = () => {
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

            const response = await fetch(`/api/user/bookmarks?page=${page}&limit=${limit}`);

            if (!response.ok) {
                throw new Error('Failed to fetch bookmarks');
            }

            const data: BookmarksData = await response.json();
            setBookmarksData(data);
            setCurrentPage(page);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
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
            const response = await fetch(`/api/post/${postId}/bookmark`, {
                method: 'POST',
            });

            if (response.ok) {
                // Remove from local state
                setBookmarksData(prev => {
                    if (!prev) return null;

                    const updatedBookmarks = prev.bookmarks.filter(b => b.id !== bookmarkId);

                    return {
                        ...prev,
                        bookmarks: updatedBookmarks,
                        count: prev.count - 1
                    };
                });
            }
        } catch (err) {
            console.error('Failed to remove bookmark:', err);
        } finally {
            setIsRemoving(null);
        }
    };

    const getUniqueCategories = () => {
        if (!bookmarksData?.bookmarks) return [];

        const categories = new Set<string>();
        bookmarksData.bookmarks.forEach(bookmark => {
            bookmark.post.categories.forEach(cat => categories.add(cat.title));
        });

        return Array.from(categories).sort();
    };

    const filteredBookmarks = bookmarksData?.bookmarks.filter(bookmark => {
        if (selectedCategory === 'all') return true;
        return bookmark.post.categories.some(cat => cat.title === selectedCategory);
    }) || [];

    if (loading && !bookmarksData) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-[#EF3866] mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">Loading your bookmarks...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                        Error Loading Bookmarks
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
                    <button
                        onClick={() => fetchBookmarks(currentPage)}
                        className="bg-[#EF3866] text-white px-4 py-2 rounded-lg hover:bg-[#d63456] transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    const categories = getUniqueCategories();

    return (
        <div className="min-h-screen bg-white dark:bg-gray-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-4">
                        <Bookmark className="w-8 h-8 text-[#EF3866]" />
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                            My Bookmarks
                        </h1>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400">
                        {bookmarksData?.count || 0} saved articles
                    </p>
                </div>

                {bookmarksData?.bookmarks.length === 0 ? (
                    <div className="text-center py-16">
                        <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                            No bookmarks yet
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            Start saving articles to read them later
                        </p>
                        <Link
                            href="/"
                            className="inline-block bg-[#EF3866] text-white px-6 py-3 rounded-lg hover:bg-[#d63456] transition-colors"
                        >
                            Browse Articles
                        </Link>
                    </div>
                ) : (
                    <>
                        {/* Filters and View Controls */}
                        <div className="flex flex-col sm:flex-row gap-4 mb-8 items-start sm:items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <Filter className="w-4 h-4 text-gray-500" />
                                    <select
                                        value={selectedCategory}
                                        onChange={(e) => setSelectedCategory(e.target.value)}
                                        className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#EF3866] focus:border-transparent"
                                    >
                                        <option value="all">All Categories</option>
                                        {categories.map(category => (
                                            <option key={category} value={category}>
                                                {category}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-2 rounded-lg transition-colors ${viewMode === 'grid'
                                            ? 'bg-[#EF3866] text-white'
                                            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                        }`}
                                >
                                    <Grid className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`p-2 rounded-lg transition-colors ${viewMode === 'list'
                                            ? 'bg-[#EF3866] text-white'
                                            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                        }`}
                                >
                                    <List className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Bookmarks Grid/List */}
                        {viewMode === 'grid' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                                {filteredBookmarks.map((bookmark) => {
                                    const imageUrl = getImageUrl(bookmark.post.mainImage, 400, 250);
                                    
                                    return (
                                        <div
                                            key={bookmark.id}
                                            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group"
                                        >
                                            <Link href={`/post/${bookmark.post._id}`}>
                                                <div className="relative aspect-[16/10] bg-gray-100 dark:bg-gray-700">
                                                    {imageUrl ? (
                                                        <Image
                                                            src={imageUrl}
                                                            alt={bookmark.post.title}
                                                            fill
                                                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full bg-gradient-to-br from-[#EF3866]/10 to-purple-100 dark:to-purple-900 flex items-center justify-center">
                                                            <BookOpen className="w-12 h-12 text-gray-400" />
                                                        </div>
                                                    )}
                                                </div>
                                            </Link>

                                            <div className="p-6">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex flex-wrap gap-2">
                                                        {bookmark.post.categories.slice(0, 2).map((cat, index) => (
                                                            <span
                                                                key={index}
                                                                className="text-xs bg-[#EF3866]/10 text-[#EF3866] px-2 py-1 rounded-full"
                                                            >
                                                                {cat.title}
                                                            </span>
                                                        ))}
                                                    </div>
                                                    <button
                                                        onClick={() => handleRemoveBookmark(bookmark.post._id, bookmark.id)}
                                                        disabled={isRemoving === bookmark.id}
                                                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                                    >
                                                        {isRemoving === bookmark.id ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                </div>

                                                <Link href={`/post/${bookmark.post._id}`}>
                                                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2 hover:text-[#EF3866] transition-colors">
                                                        {bookmark.post.title}
                                                    </h3>
                                                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-3">
                                                        {bookmark.post.description}
                                                    </p>
                                                </Link>

                                                <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 bg-[#EF3866] text-white rounded-full flex items-center justify-center text-xs font-bold">
                                                            {bookmark.post.author.name.charAt(0)}
                                                        </div>
                                                        <span>{bookmark.post.author.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        <span>
                                                            {formatTimeAgo(bookmark.created_at)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="space-y-4 mb-8">
                                {filteredBookmarks.map((bookmark) => {
                                    const imageUrl = getImageUrl(bookmark.post.mainImage, 128, 96);
                                    
                                    return (
                                        <div
                                            key={bookmark.id}
                                            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 p-6"
                                        >
                                            <div className="flex gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        {bookmark.post.categories.slice(0, 3).map((cat, index) => (
                                                            <span
                                                                key={index}
                                                                className="text-xs bg-[#EF3866]/10 text-[#EF3866] px-2 py-1 rounded-full"
                                                            >
                                                                {cat.title}
                                                            </span>
                                                        ))}
                                                    </div>

                                                    <Link href={`/post/${bookmark.post._id}`}>
                                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 hover:text-[#EF3866] transition-colors">
                                                            {bookmark.post.title}
                                                        </h3>
                                                        <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                                                            {bookmark.post.description}
                                                        </p>
                                                    </Link>

                                                    <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-6 h-6 bg-[#EF3866] text-white rounded-full flex items-center justify-center text-xs font-bold">
                                                                {bookmark.post.author.name.charAt(0)}
                                                            </div>
                                                            <span>{bookmark.post.author.name}</span>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            <div className="flex items-center gap-1">
                                                                <Clock className="w-3 h-3" />
                                                                <span>
                                                                    Saved {formatTimeAgo(bookmark.created_at)}
                                                                </span>
                                                            </div>
                                                            <button
                                                                onClick={() => handleRemoveBookmark(bookmark.post._id, bookmark.id)}
                                                                disabled={isRemoving === bookmark.id}
                                                                className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                                            >
                                                                {isRemoving === bookmark.id ? (
                                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                                ) : (
                                                                    <Trash2 className="w-4 h-4" />
                                                                )}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="w-32 h-24 flex-shrink-0">
                                                    <Link href={`/post/${bookmark.post._id}`}>
                                                        <div className="relative w-full h-full bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                                                            {imageUrl ? (
                                                                <Image
                                                                    src={imageUrl}
                                                                    alt={bookmark.post.title}
                                                                    fill
                                                                    className="object-cover hover:scale-105 transition-transform duration-300"
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full bg-gradient-to-br from-[#EF3866]/10 to-purple-100 dark:to-purple-900 flex items-center justify-center">
                                                                    <BookOpen className="w-6 h-6 text-gray-400" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Pagination */}
                        {bookmarksData && bookmarksData.totalPages > 1 && (
                            <div className="flex items-center justify-center gap-2">
                                <button
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1 || loading}
                                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    Previous
                                </button>

                                <span className="px-4 py-2 text-gray-600 dark:text-gray-400">
                                    Page {currentPage} of {bookmarksData.totalPages}
                                </span>

                                <button
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === bookmarksData.totalPages || loading}
                                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Next
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default BookmarksPage;