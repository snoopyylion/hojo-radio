"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, User, BookOpen, Tag, Clock, Heart, MessageCircle, ArrowRight, Filter, Grid, List, X, UserPlus } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

interface SearchResult {
  id: string;
  type: 'user' | 'article' | 'author' | 'category';
  title: string;
  subtitle?: string;
  image?: string;
  url: string;
  excerpt?: string;
  publishedAt?: string;
  likes?: number;
  comments?: number;
  relevanceScore?: number;
  isFollowing?: boolean;
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

interface FollowingUser {
  id: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  role?: string;
  followed_at?: string;
}

interface FollowingResponse {
  type: string;
  users: FollowingUser[];
  count: number;
}

const SearchResultsPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q') || '';

  const [searchResults, setSearchResults] = useState<SearchResponse>({
    results: [],
    totalCount: 0,
    query: '',
    categories: { users: [], articles: [], authors: [], categories: [] }
  });
  const [originalResults, setOriginalResults] = useState<SearchResponse>({
    results: [],
    totalCount: 0,
    query: '',
    categories: { users: [], articles: [], authors: [], categories: [] }
  });
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'users' | 'articles' | 'authors' | 'categories'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [newQuery, setNewQuery] = useState(query);
  const [followingUsers, setFollowingUsers] = useState<Set<string>>(new Set());
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [followingLoading, setFollowingLoading] = useState<Set<string>>(new Set());

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

  // FIXED: Simplified and consistent database ID extraction
  const getDatabaseId = (result: SearchResult): string => {
  console.log('🔍 Getting database ID for result:', {
    id: result.id,
    type: result.type,
    databaseId: result.databaseId,
    originalId: result.originalId
  });

  // Priority order: databaseId > originalId > cleaned id
  if (result.databaseId) {
    console.log('✅ Using databaseId:', result.databaseId);
    return result.databaseId;
  }

  if (result.originalId) {
    console.log('✅ Using originalId:', result.originalId);
    return result.originalId;
  }

  // Clean the ID by removing common prefixes if they exist
  const cleanUserId = (userId: string): string => {
    // Remove common prefixes that might be added by your search API
    const prefixes = ['supabase_user_', 'user_', 'sanity_user_'];
    
    for (const prefix of prefixes) {
      if (userId.startsWith(prefix)) {
        return userId.replace(prefix, '');
      }
    }
    
    return userId;
  };

  const cleanId = cleanUserId(result.id);
  console.log('✅ Final database ID:', cleanId);
  return cleanId;
};

  // Check if a user can be followed (users and authors can be followed)
  const canFollowUser = useCallback((result: SearchResult): boolean => {
  if (result.type !== 'user' && result.type !== 'author') {
    return false;
  }

  // Prevent following yourself
  const databaseId = getDatabaseId(result);
  return currentUserId !== databaseId;
}, [currentUserId]); // Dependencies: currentUserId

  // FIXED: Handle follow/unfollow with proper error handling and state management
  const handleFollowToggle = async (result: SearchResult) => {
    if (!canFollowUser(result)) {
      console.log('❌ Cannot follow this type of result:', result.type);
      return;
    }
    const databaseId = getDatabaseId(result);
    if (currentUserId === databaseId) {
      alert('You cannot follow yourself');
      return;
    }
    const isCurrentlyFollowing = followingUsers.has(databaseId);

    // Prevent multiple simultaneous requests
    if (followingLoading.has(databaseId)) {
      console.log('⏳ Follow request already in progress for:', databaseId);
      return;
    }

    console.log('🔄 Starting follow toggle:', {
      resultId: result.id,
      databaseId: databaseId,
      isCurrentlyFollowing: isCurrentlyFollowing,
      action: isCurrentlyFollowing ? 'unfollow' : 'follow'
    });

    // Set loading state
    setFollowingLoading(prev => new Set(prev).add(databaseId));

    try {
      const response = await fetch('/api/follow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: isCurrentlyFollowing ? 'unfollow' : 'follow',
          following_id: databaseId
        })
      });

      const responseData = await response.json();
      console.log('📡 Follow API response:', responseData);

      if (response.ok && responseData.success) {
        console.log('✅ Follow operation successful:', responseData);

        // Update local following state
        setFollowingUsers(prev => {
          const newSet = new Set(prev);
          if (responseData.action === 'followed') {
            newSet.add(databaseId);
            console.log('➕ Added to following set:', databaseId);
          } else if (responseData.action === 'unfollowed') {
            newSet.delete(databaseId);
            console.log('➖ Removed from following set:', databaseId);
          }
          return newSet;
        });

        // Update search results to reflect the new follow state
        const updateResults = (results: SearchResult[]) =>
          results.map(searchResult => {
            const searchDatabaseId = getDatabaseId(searchResult);
            if (searchDatabaseId === databaseId) {
              return {
                ...searchResult,
                isFollowing: responseData.action === 'followed'
              };
            }
            return searchResult;
          });

        setSearchResults(prev => ({
          ...prev,
          results: updateResults(prev.results),
          categories: {
            ...prev.categories,
            users: updateResults(prev.categories.users),
            authors: updateResults(prev.categories.authors)
          }
        }));

        setOriginalResults(prev => ({
          ...prev,
          results: updateResults(prev.results),
          categories: {
            ...prev.categories,
            users: updateResults(prev.categories.users),
            authors: updateResults(prev.categories.authors)
          }
        }));

        // Show success message
        console.log(`✅ Successfully ${responseData.action} user`);

      } else {
        console.error('❌ Follow API error:', responseData);
        alert(`Error: ${responseData.error || 'Failed to update follow status'}`);
      }
    } catch (error) {
      console.error('❌ Network error during follow toggle:', error);
      alert('Network error occurred while updating follow status. Please try again.');
    } finally {
      // Remove loading state
      setFollowingLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(databaseId);
        return newSet;
      });
    }
  };


  // Get proper URL for result
  const getResultUrl = (result: SearchResult): string => {
    console.log('Generating URL for result:', { id: result.id, type: result.type });

    switch (result.type) {
      case 'article':
        let postId = result.url.includes('/post/')
          ? result.url.split('/post/')[1].split('/')[0]
          : result.id;

        // If prefixed with "sanity_post_", strip it
        if (postId.startsWith('sanity_post_')) {
          postId = postId.replace('sanity_post_', '');
        }

        return `/post/${postId}`;

       case 'user':
      case 'author':
        // Based on your logs, originalId contains the correct database ID
        let userId = result.originalId || result.databaseId || result.id;
        
        // If we still don't have a userId, try getDatabaseId
        if (!userId) {
          userId = getDatabaseId(result);
        }
        
        console.log('🔍 User ID options:', {
          id: result.id,
          originalId: result.originalId,
          databaseId: result.databaseId,
          selected: userId
        });
        
        console.log('User URL generated:', `/user/${userId}`);
        return `/user/${userId}`;

      case 'category':
        return `/blog/category/${getDatabaseId(result)}`;

      default:
        return result.url || '#';
    }
  };

  // FIXED: Check if user is currently being followed
  const isUserFollowing = (result: SearchResult): boolean => {
    const databaseId = getDatabaseId(result);
    return followingUsers.has(databaseId) || followingUsers.has(result.id) || !!result.isFollowing;
  };

  // FIXED: Load current user's following list with better error handling
  const loadFollowingStatus = async () => {
    try {
      console.log('📡 Loading following status...');
      const response = await fetch('/api/follow?type=following');

      if (response.ok) {
        const data: FollowingResponse = await response.json();
        console.log('✅ Following data received:', data);

        const followingIds = new Set(data.users.map((user: FollowingUser) => user.id));
        setFollowingUsers(followingIds);

        console.log('✅ Following IDs set:', Array.from(followingIds));
      } else {
        console.error('❌ Failed to load following status:', response.status);
      }
    } catch (error) {
      console.error('❌ Error loading following status:', error);
    }
  };

  // Load current user ID
  const loadCurrentUserId = async () => {
    try {
      const response = await fetch('/api/user/me');
      if (response.ok) {
        const userData = await response.json();
        setCurrentUserId(userData.id);
      }
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  };

  useEffect(() => {
    loadFollowingStatus();
    loadCurrentUserId();
  }, []);

  // Updated performSearch to use API route
  const performSearch = useCallback(async (searchQuery: string) => {
  if (!searchQuery.trim()) {
    const emptyResults = {
      results: [],
      totalCount: 0,
      query: '',
      categories: { users: [], articles: [], authors: [], categories: [] }
    };
    setSearchResults(emptyResults);
    setOriginalResults(emptyResults);
    return;
  }

  setIsLoading(true);

  try {
    console.log('🔍 Performing search:', { query: searchQuery });

    const apiUrl = new URL('/api/search', window.location.origin);
    apiUrl.searchParams.set('q', searchQuery);
    apiUrl.searchParams.set('limit', '50');

    console.log('📡 Calling API:', apiUrl.toString());

    const response = await fetch(apiUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: SearchResponse = await response.json();

    console.log('✅ API response:', {
      totalCount: data.totalCount,
      categories: {
        users: data.categories.users.length,
        articles: data.categories.articles.length,
        authors: data.categories.authors.length,
        categories: data.categories.categories.length
      }
    });

    // Update search results with current following status
    const updateResultsWithFollowStatus = (results: SearchResult[]) =>
      results.map(result => {
        if (canFollowUser(result)) {
          const databaseId = getDatabaseId(result);
          return {
            ...result,
            isFollowing: followingUsers.has(databaseId)
          };
        }
        return result;
      });

    const responseWithQuery = {
      ...data,
      query: searchQuery,
      results: updateResultsWithFollowStatus(data.results),
      categories: {
        ...data.categories,
        users: updateResultsWithFollowStatus(data.categories.users),
        authors: updateResultsWithFollowStatus(data.categories.authors),
        articles: data.categories.articles,
        categories: data.categories.categories
      }
    };

    setOriginalResults(responseWithQuery);
    setSearchResults(responseWithQuery);

  } catch (error) {
    console.error('❌ Search error:', error);

    const errorResults = {
      results: [],
      totalCount: 0,
      query: searchQuery,
      categories: { users: [], articles: [], authors: [], categories: [] }
    };
    setSearchResults(errorResults);
    setOriginalResults(errorResults);
  } finally {
    setIsLoading(false);
  }
}, [followingUsers, currentUserId]);


  // Load initial results
  useEffect(() => {
  if (query) {
    setNewQuery(query);
    performSearch(query);
  }
}, [query, performSearch]);

  // FIXED: Re-run search when following status changes to update results
  useEffect(() => {
  if (query && followingUsers.size > 0) {
    // Update existing results with current follow status without making a new API call
    const updateResultsWithFollowStatus = (results: SearchResult[]) =>
      results.map(result => {
        if (canFollowUser(result)) {
          const databaseId = getDatabaseId(result);
          return {
            ...result,
            isFollowing: followingUsers.has(databaseId)
          };
        }
        return result;
      });

    setSearchResults(prev => ({
      ...prev,
      results: updateResultsWithFollowStatus(prev.results),
      categories: {
        ...prev.categories,
        users: updateResultsWithFollowStatus(prev.categories.users),
        authors: updateResultsWithFollowStatus(prev.categories.authors)
      }
    }));

    setOriginalResults(prev => ({
      ...prev,
      results: updateResultsWithFollowStatus(prev.results),
      categories: {
        ...prev.categories,
        users: updateResultsWithFollowStatus(prev.categories.users),
        authors: updateResultsWithFollowStatus(prev.categories.authors)
      }
    }));
  }
}, [followingUsers, query, canFollowUser]);

  // Handle filter change
  const handleFilterChange = (filter: typeof activeFilter) => {
    setActiveFilter(filter);
    setShowMobileFilters(false);

    if (filter === 'all') {
      setSearchResults(originalResults);
    } else {
      const categoryResults = originalResults.categories[filter] || [];
      setSearchResults({
        ...originalResults,
        results: categoryResults
      });
    }
  };

  // Handle new search
  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (newQuery.trim()) {
      const newUrl = `/search?q=${encodeURIComponent(newQuery)}`;
      if (window.location.pathname + window.location.search !== newUrl) {
        router.push(newUrl);
      }
      setActiveFilter('all');
      performSearch(newQuery);
    }
  };

  // Handle Enter key in search input
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Clear search
  const clearSearch = () => {
    setNewQuery('');
    const emptyResults = {
      results: [],
      totalCount: 0,
      query: '',
      categories: { users: [], articles: [], authors: [], categories: [] }
    };
    setSearchResults(emptyResults);
    setOriginalResults(emptyResults);
    setActiveFilter('all');
    router.push('/search');
  };

  // Get result counts for each category from original results
  const getCategoryCount = (category: keyof typeof originalResults.categories) => {
    return originalResults.categories[category]?.length || 0;
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'user': return <User size={20} className="text-blue-600" />;
      case 'article': return <BookOpen size={20} className="text-green-600" />;
      case 'author': return <User size={20} className="text-purple-600" />;
      case 'category': return <Tag size={20} className="text-orange-600" />;
      default: return <Search size={20} className="text-gray-600" />;
    }
  };

  const getResultTypeColor = (type: string) => {
    switch (type) {
      case 'user': return 'bg-blue-100 text-blue-700';
      case 'article': return 'bg-green-100 text-green-700';
      case 'author': return 'bg-purple-100 text-purple-700';
      case 'category': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // Filter buttons data
  const filterButtons = [
    { key: 'all', label: 'All Results', count: originalResults.totalCount, icon: Search },
    { key: 'articles', label: 'Articles', count: getCategoryCount('articles'), icon: BookOpen },
    { key: 'users', label: 'Users', count: getCategoryCount('users'), icon: User },
    { key: 'authors', label: 'Authors', count: getCategoryCount('authors'), icon: User },
    { key: 'categories', label: 'Categories', count: getCategoryCount('categories'), icon: Tag }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black pt-24 sm:pt-20 font-sora mb-[24px] transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-8">
        {/* Search Header */}
        <div className="mb-6 lg:mb-8">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6 transition-colors duration-300"
          >
            Search Results
          </motion.h1>

          {/* Enhanced Search Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-4 sm:mb-6"
          >
            <form onSubmit={handleSearch} className="relative max-w-2xl">
              <div className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={newQuery}
                  onChange={(e) => setNewQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Search users, articles, authors, categories..."
                  className="w-full h-12 sm:h-14 pl-10 sm:pl-12 pr-16 sm:pr-20 text-base sm:text-lg bg-white dark:bg-black border-2 border-gray-200 dark:border-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-[#EF3866] focus:border-[#EF3866] dark:focus:border-[#EF3866] transition-all shadow-sm hover:shadow-md text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
                <Search size={20} className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 sm:w-6 sm:h-6" />

                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1 sm:gap-2">
                  {newQuery && (
                    <button
                      type="button"
                      onClick={clearSearch}
                      className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                    >
                      <X size={16} className="text-gray-400 dark:text-gray-500 sm:w-5 sm:h-5" />
                    </button>
                  )}
                  <button
                    type="submit"
                    className="bg-[#EF3866] hover:bg-[#d7325a] text-white px-4 sm:px-6 py-2 rounded-full transition-all font-medium text-sm sm:text-base"
                  >
                    Search
                  </button>
                </div>
              </div>
            </form>
          </motion.div>

          {/* Results Summary and Controls */}
          {query && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#EF3866]"></div>
                    Searching...
                  </span>
                ) : (
                  <>
                    Found <span className="font-semibold text-[#EF3866]">{activeFilter === 'all' ? originalResults.totalCount : searchResults.results.length}</span> results for &quot;
                    <span className="font-semibold text-gray-900 dark:text-white">{query}</span>&quot;
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Mobile Filter Toggle */}
                <button
                  onClick={() => setShowMobileFilters(!showMobileFilters)}
                  className="lg:hidden flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  <Filter size={16} />
                  Filters
                </button>

                <span className="text-sm text-gray-500 dark:text-gray-400 mr-2 hidden sm:inline">View:</span>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-[#EF3866] text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'}`}
                >
                  <List size={16} className="sm:w-5 sm:h-5" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-[#EF3866] text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'}`}
                >
                  <Grid size={16} className="sm:w-5 sm:h-5" />
                </button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Mobile Filters Overlay */}
        <AnimatePresence>
          {showMobileFilters && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 lg:hidden"
              onClick={() => setShowMobileFilters(false)}
            >
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                className="absolute left-0 top-0 h-full w-80 max-w-[85vw] bg-white dark:bg-black shadow-xl dark:shadow-2xl overflow-y-auto border-r dark:border-gray-800"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <Filter size={20} className="text-[#EF3866]" />
                      Filter Results
                    </h3>
                    <button
                      onClick={() => setShowMobileFilters(false)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-lg transition-colors"
                    >
                      <X size={20} className="text-gray-600 dark:text-gray-400" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    {filterButtons.map((filter) => {
                      const Icon = filter.icon;
                      return (
                        <button
                          key={filter.key}
                          onClick={() => handleFilterChange(filter.key as typeof activeFilter)}
                          className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${activeFilter === filter.key
                            ? 'bg-[#EF3866] text-white shadow-md'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-700 dark:text-gray-300 hover:text-[#EF3866] dark:hover:text-[#EF3866] border border-transparent dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700'
                            }`}
                        >
                          <Icon size={18} />
                          <span className="font-medium flex-1 text-left">{filter.label}</span>
                          <span className={`text-sm px-2 py-1 rounded-full ${activeFilter === filter.key
                            ? 'bg-white/20'
                            : 'bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                            }`}>
                            {filter.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-4 lg:gap-8">
          {/* Desktop Filters Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="hidden lg:block w-64 flex-shrink-0"
          >
            <div className="bg-white dark:bg-black rounded-xl shadow-sm dark:shadow-2xl p-6 sticky top-28 border border-gray-200 dark:border-gray-800">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Filter size={20} className="text-[#EF3866]" />
                Filter Results
              </h3>

              <div className="space-y-2">
                {filterButtons.map((filter) => {
                  const Icon = filter.icon;
                  return (
                    <button
                      key={filter.key}
                      onClick={() => handleFilterChange(filter.key as typeof activeFilter)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${activeFilter === filter.key
                        ? 'bg-[#EF3866] text-white shadow-md'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-700 dark:text-gray-300 hover:text-[#EF3866] dark:hover:text-[#EF3866] border border-transparent dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700'
                        }`}
                    >
                      <Icon size={18} />
                      <span className="font-medium flex-1 text-left">{filter.label}</span>
                      <span className={`text-sm px-2 py-1 rounded-full ${activeFilter === filter.key
                        ? 'bg-white/20'
                        : 'bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                        }`}>
                        {filter.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>

          {/* Results */}
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-center py-12"
                >
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#EF3866] mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-300 font-medium">Searching...</p>
                  </div>
                </motion.div>
              ) : searchResults.results.length === 0 && query ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-12"
                >
                  <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gray-100 dark:bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-200 dark:border-gray-800">
                    <Search size={32} className="text-gray-400 dark:text-gray-500 sm:w-10 sm:h-10" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-2">No results found</h3>
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4 px-4">
                    We couldn&apos;t find anything matching &quot;<span className="font-medium text-gray-900 dark:text-white">{query}</span>&quot;. Try different keywords or check spelling.
                  </p>
                  <button
                    onClick={clearSearch}
                    className="bg-[#EF3866] hover:bg-[#d7325a] text-white px-6 py-2 rounded-full transition-all font-medium"
                  >
                    Clear search
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={
                    viewMode === 'grid'
                      ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6'
                      : 'space-y-3 sm:space-y-4'
                  }
                >
                  {searchResults.results.map((result, index) => (
                    <motion.div
                      key={result.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <div className="bg-white dark:bg-black rounded-xl shadow-sm dark:shadow-2xl hover:shadow-md dark:hover:shadow-2xl transition-all p-4 sm:p-6 border border-gray-200 dark:border-gray-800 hover:border-[#EF3866]/20 dark:hover:border-[#EF3866]/40 group">
                        <div className="flex items-start gap-3 sm:gap-4">
                          {/* Result Icon/Image */}
                          <div className="flex-shrink-0">
                            {result.image ? (
                              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden border-2 border-gray-100 dark:border-gray-800">
                                <Image
                                  src={result.image}
                                  alt={result.title}
                                  width={48}
                                  height={48}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 dark:bg-gray-900 rounded-full flex items-center justify-center group-hover:bg-gray-200 dark:group-hover:bg-gray-800 transition-colors border border-gray-200 dark:border-gray-800">
                                {getResultIcon(result.type)}
                              </div>
                            )}
                          </div>

                          {/* Result Content */}
                          <div className="flex-1 min-w-0">
                            <Link href={getResultUrl(result)}>
                              <div className="cursor-pointer">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                                  <span className={`px-2 sm:px-3 py-1 text-xs font-medium rounded-full ${getResultTypeColor(result.type)} w-fit`}>
                                    {result.type}
                                  </span>
                                  {result.publishedAt && (
                                    <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                      <Clock size={12} />
                                      {formatDate(result.publishedAt)}
                                    </span>
                                  )}
                                </div>

                                <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-[#EF3866] dark:group-hover:text-[#EF3866] transition-colors mb-1 line-clamp-2 text-sm sm:text-base">
                                  {result.title}
                                </h3>

                                {result.subtitle && (
                                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-1 sm:line-clamp-none">{result.subtitle}</p>
                                )}

                                {result.excerpt && (
                                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">{result.excerpt}</p>
                                )}

                                {/* Article Stats */}
                                {result.type === 'article' && (result.likes || result.comments) && (
                                  <div className="flex items-center gap-3 sm:gap-4 text-xs text-gray-500 dark:text-gray-400">
                                    {result.likes && (
                                      <span className="flex items-center gap-1">
                                        <Heart size={12} />
                                        {result.likes}
                                      </span>
                                    )}
                                    {result.comments && (
                                      <span className="flex items-center gap-1">
                                        <MessageCircle size={12} />
                                        {result.comments}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </Link>
                          </div>

                          {/* Action Button */}
                          <div className="flex-shrink-0 flex flex-col sm:flex-row items-end sm:items-center gap-2">
                            {canFollowUser(result) && (
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleFollowToggle(result);
                                }}
                                className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all ${isUserFollowing(result)
                                  ? 'bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700'
                                  : 'bg-[#EF3866] text-white hover:bg-[#d7325a]'
                                  }`}
                              >
                                <UserPlus size={12} className="sm:w-4 sm:h-4" />
                                <span className="hidden sm:inline">
                                  {isUserFollowing(result) ? 'Following' : 'Follow'}
                                </span>
                              </button>
                            )}
                            <Link href={getResultUrl(result)}>
                              <ArrowRight size={18} className="text-gray-400 dark:text-gray-500 group-hover:text-[#EF3866] dark:group-hover:text-[#EF3866] transition-colors sm:w-5 sm:h-5" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchResultsPage;