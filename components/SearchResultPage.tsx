"use client";

import React, { useState, useEffect, useRef } from 'react';
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
  isFollowing?: boolean; // For users
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
  const [isLoading, setIsLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'users' | 'articles' | 'authors' | 'categories'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [newQuery, setNewQuery] = useState(query);
  const [followingUsers, setFollowingUsers] = useState<Set<string>>(new Set());
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  // Handle follow/unfollow
  const handleFollowToggle = async (userId: string, isCurrentlyFollowing: boolean) => {
    try {
      const response = await fetch(`/api/users/${userId}/follow`, {
        method: isCurrentlyFollowing ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setFollowingUsers(prev => {
          const newSet = new Set(prev);
          if (isCurrentlyFollowing) {
            newSet.delete(userId);
          } else {
            newSet.add(userId);
          }
          return newSet;
        });
      }
    } catch (error) {
      console.error('Follow toggle error:', error);
    }
  };

  // Get proper URL for result
  const getResultUrl = (result: SearchResult): string => {
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
        return `/user/${result.id}`;

      case 'category':
        return `/category/${result.id}`;

      default:
        return result.url || '#';
    }
  };

  // Updated performSearch to use API route
  const performSearch = async (searchQuery: string) => {
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
      
      // Build API URL with proper encoding
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

      const responseWithQuery = {
        ...data,
        query: searchQuery
      };

      // Store both original and current results
      setOriginalResults(responseWithQuery);
      setSearchResults(responseWithQuery);

    } catch (error) {
      console.error('❌ Search error:', error);
      
      // Set error state with empty results
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
  };

  // Load initial results
  useEffect(() => {
    if (query) {
      setNewQuery(query);
      performSearch(query);
    }
  }, [query]);

  // Handle filter change with proper type mapping
  const handleFilterChange = (filter: typeof activeFilter) => {
    setActiveFilter(filter);
    setShowMobileFilters(false); // Close mobile filters
    
    if (filter === 'all') {
      // Reset to show all original results
      setSearchResults(originalResults);
    } else {
      // Filter results based on selected category
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
      setActiveFilter('all'); // Reset filter when performing new search
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
    <div className="min-h-screen bg-gray-50 pt-24 sm:pt-20 font-sora">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-8">
        {/* Search Header */}
        <div className="mb-6 lg:mb-8">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-6"
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
                  className="w-full h-12 sm:h-14 pl-10 sm:pl-12 pr-16 sm:pr-20 text-base sm:text-lg bg-white border-2 border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-[#EF3866] focus:border-[#EF3866] transition-all shadow-sm hover:shadow-md"
                />
                <Search size={20} className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-400 sm:w-6 sm:h-6" />
                
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1 sm:gap-2">
                  {newQuery && (
                    <button
                      type="button"
                      onClick={clearSearch}
                      className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <X size={16} className="text-gray-400 sm:w-5 sm:h-5" />
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
              <div className="text-sm sm:text-base text-gray-600">
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#EF3866]"></div>
                    Searching...
                  </span>
                ) : (
                  <>
                    Found <span className="font-semibold text-[#EF3866]">{activeFilter === 'all' ? originalResults.totalCount : searchResults.results.length}</span> results for &quot;
                    <span className="font-semibold text-gray-900">{query}</span>&quot;
                  </>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {/* Mobile Filter Toggle */}
                <button
                  onClick={() => setShowMobileFilters(!showMobileFilters)}
                  className="lg:hidden flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  <Filter size={16} />
                  Filters
                </button>
                
                <span className="text-sm text-gray-500 mr-2 hidden sm:inline">View:</span>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-[#EF3866] text-white' : 'hover:bg-gray-200 text-gray-600'}`}
                >
                  <List size={16} className="sm:w-5 sm:h-5" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-[#EF3866] text-white' : 'hover:bg-gray-200 text-gray-600'}`}
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
              className="fixed inset-0 bg-black/50 z-50 lg:hidden"
              onClick={() => setShowMobileFilters(false)}
            >
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                className="absolute left-0 top-0 h-full w-80 max-w-[85vw] bg-white shadow-xl overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Filter size={20} className="text-[#EF3866]" />
                      Filter Results
                    </h3>
                    <button
                      onClick={() => setShowMobileFilters(false)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {filterButtons.map((filter) => {
                      const Icon = filter.icon;
                      return (
                        <button
                          key={filter.key}
                          onClick={() => handleFilterChange(filter.key as typeof activeFilter)}
                          className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                            activeFilter === filter.key
                              ? 'bg-[#EF3866] text-white shadow-md'
                              : 'hover:bg-gray-50 text-gray-700 hover:text-[#EF3866]'
                          }`}
                        >
                          <Icon size={18} />
                          <span className="font-medium flex-1 text-left">{filter.label}</span>
                          <span className={`text-sm px-2 py-1 rounded-full ${
                            activeFilter === filter.key
                              ? 'bg-white/20'
                              : 'bg-gray-200 text-gray-600'
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
            <div className="bg-white rounded-xl shadow-sm p-6 sticky top-28 border">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
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
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                        activeFilter === filter.key
                          ? 'bg-[#EF3866] text-white shadow-md'
                          : 'hover:bg-gray-50 text-gray-700 hover:text-[#EF3866]'
                      }`}
                    >
                      <Icon size={18} />
                      <span className="font-medium flex-1 text-left">{filter.label}</span>
                      <span className={`text-sm px-2 py-1 rounded-full ${
                        activeFilter === filter.key
                          ? 'bg-white/20'
                          : 'bg-gray-200 text-gray-600'
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
                    <p className="text-gray-600 font-medium">Searching...</p>
                  </div>
                </motion.div>
              ) : searchResults.results.length === 0 && query ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-12"
                >
                  <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search size={32} className="text-gray-400 sm:w-10 sm:h-10" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">No results found</h3>
                  <p className="text-sm sm:text-base text-gray-600 mb-4 px-4">
                    We couldn&apos;t find anything matching &quot;<span className="font-medium">{query}</span>&quot;. Try different keywords or check spelling.
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
                      <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all p-4 sm:p-6 border hover:border-[#EF3866]/20 group">
                        <div className="flex items-start gap-3 sm:gap-4">
                          {/* Result Icon/Image */}
                          <div className="flex-shrink-0">
                            {result.image ? (
                              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden border-2 border-gray-100">
                                <Image
                                  src={result.image}
                                  alt={result.title}
                                  width={48}
                                  height={48}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-full flex items-center justify-center group-hover:bg-gray-200 transition-colors">
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
                                    <span className="text-xs text-gray-500 flex items-center gap-1">
                                      <Clock size={12} />
                                      {formatDate(result.publishedAt)}
                                    </span>
                                  )}
                                </div>

                                <h3 className="font-semibold text-gray-900 group-hover:text-[#EF3866] transition-colors mb-1 line-clamp-2 text-sm sm:text-base">
                                  {result.title}
                                </h3>

                                {result.subtitle && (
                                  <p className="text-xs sm:text-sm text-gray-600 mb-2 line-clamp-1 sm:line-clamp-none">{result.subtitle}</p>
                                )}

                                {result.excerpt && (
                                  <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 mb-3">{result.excerpt}</p>
                                )}

                                {/* Article Stats */}
                                {result.type === 'article' && (result.likes || result.comments) && (
                                  <div className="flex items-center gap-3 sm:gap-4 text-xs text-gray-500">
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
                            {result.type === 'user' && (
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  const isFollowing = followingUsers.has(result.id) || !!result.isFollowing;
                                  handleFollowToggle(result.id, isFollowing);
                                }}
                                className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all ${
                                  followingUsers.has(result.id) || result.isFollowing
                                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    : 'bg-[#EF3866] text-white hover:bg-[#d7325a]'
                                }`}
                              >
                                <UserPlus size={12} className="sm:w-4 sm:h-4" />
                                <span className="hidden sm:inline">
                                  {followingUsers.has(result.id) || result.isFollowing ? 'Following' : 'Follow'}
                                </span>
                              </button>
                            )}
                            <Link href={getResultUrl(result)}>
                              <ArrowRight size={18} className="text-gray-400 group-hover:text-[#EF3866] transition-colors sm:w-5 sm:h-5" />
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