"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Search, X, User, BookOpen, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';

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

interface SearchComponentProps {
  className?: string;
  isMobile?: boolean;
}

const SearchComponent: React.FC<SearchComponentProps> = ({ className = "", isMobile = false }) => {
  const pathname = usePathname();
  const router = useRouter();
  
  // Search states
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchResultsRef = useRef<HTMLDivElement>(null);

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

  // Generate URL for search results
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

  // Perform search API call
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);

    try {
      console.log('🔍 Performing navbar search:', { query: searchQuery });

      // Build API URL with proper encoding
      const apiUrl = new URL('/api/search', window.location.origin);
      apiUrl.searchParams.set('q', searchQuery);
      apiUrl.searchParams.set('limit', '10'); // Limit for navbar dropdown

      console.log('📡 Calling search API:', apiUrl.toString());

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

      console.log('✅ Search API response:', {
        totalCount: data.totalCount,
        categories: {
          users: data.categories.users.length,
          articles: data.categories.articles.length,
          authors: data.categories.authors.length,
          categories: data.categories.categories.length
        }
      });

      // Process and prioritize results for navbar dropdown
      const prioritizedResults: SearchResult[] = [];

      // 1. First, add users (highest priority for navbar)
      if (data.categories.users && data.categories.users.length > 0) {
        data.categories.users.forEach(user => {
          prioritizedResults.push({
            ...user,
            subtitle: user.subtitle || `👤 ${user.type === 'author' ? 'Author' : 'Member'}`,
            url: getResultUrl(user)
          });
        });
      }

      // 2. Then add articles
      if (data.categories.articles && data.categories.articles.length > 0) {
        data.categories.articles.slice(0, 4).forEach(article => { // Limit articles to 4 for navbar
          prioritizedResults.push({
            ...article,
            subtitle: article.subtitle || `📝 Article • ${formatDate(article.publishedAt || '')}`,
            url: getResultUrl(article)
          });
        });
      }

      // 3. Add authors
      if (data.categories.authors && data.categories.authors.length > 0) {
        data.categories.authors.slice(0, 2).forEach(author => { // Limit authors to 2 for navbar
          prioritizedResults.push({
            ...author,
            subtitle: author.subtitle || '✍️ Author • View Profile',
            url: getResultUrl(author)
          });
        });
      }

      // 4. Finally add categories
      if (data.categories.categories && data.categories.categories.length > 0) {
        data.categories.categories.slice(0, 2).forEach(category => { // Limit categories to 2 for navbar
          prioritizedResults.push({
            ...category,
            subtitle: category.subtitle || '🏷️ Category • Browse Posts',
            url: getResultUrl(category)
          });
        });
      }

      // Limit total results for navbar dropdown
      const finalResults = prioritizedResults.slice(0, 8);

      setSearchResults(finalResults);
      setShowSearchResults(finalResults.length > 0);

    } catch (error) {
      console.error('❌ Navbar search error:', error);
      setSearchResults([]);
      setShowSearchResults(false);
    } finally {
      setIsSearching(false);
    }
  }, [getResultUrl]);

  // Handle result click
  const handleResultClick = async (result: SearchResult, event?: React.MouseEvent | React.TouchEvent) => {
    // Prevent event bubbling and default behavior
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    console.log('🖱️ Result clicked:', {
      id: result.id,
      type: result.type,
      originalId: result.originalId,
      databaseId: result.databaseId,
      title: result.title
    });

    try {
      // Generate the URL
      const url = getResultUrl(result);
      console.log('🔗 Generated URL:', url);

      // Validate URL
      if (!url || url === '#' || url === '/') {
        console.error('❌ Invalid URL generated:', url);
        alert('Unable to navigate to this result. Please try again.');
        return;
      }

      // Clear search state immediately
      setIsSearchExpanded(false);
      setShowSearchResults(false);
      setSearchQuery('');

      // Check if we're already on the target page
      if (pathname === url) {
        console.log('📍 Already on target page:', url);
        return;
      }

      // Add a small delay to ensure state updates are processed
      await new Promise(resolve => setTimeout(resolve, 100));

      // Navigate using Next.js router
      console.log('🚀 Navigating to:', url);
      await router.push(url);

    } catch (error) {
      console.error('❌ Navigation error:', error);

      // Fallback navigation
      try {
        const fallbackUrl = getResultUrl(result);
        if (fallbackUrl && fallbackUrl !== '#' && fallbackUrl !== '/') {
          console.log('🔄 Attempting fallback navigation to:', fallbackUrl);
          window.location.href = fallbackUrl;
        } else {
          throw new Error('Fallback URL also invalid');
        }
      } catch (fallbackError) {
        console.error('❌ Fallback navigation failed:', fallbackError);
        alert('Navigation failed. Please try refreshing the page.');
      }
    }
  };

  // Handle search toggle
  const handleSearchToggle = () => {
    setIsSearchExpanded(!isSearchExpanded);
    if (!isSearchExpanded) {
      // Focus input when expanding
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 150);
    } else {
      // Clear search when collapsing
      setSearchQuery('');
      setSearchResults([]);
      setShowSearchResults(false);
    }
  };

  // Handle search form submission
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔍 Search submitted:', searchQuery);

    if (!searchQuery.trim()) {
      return;
    }

    try {
      // Clear search state first
      setIsSearchExpanded(false);
      setShowSearchResults(false);

      // Navigate to search results page
      const searchUrl = `/search?q=${encodeURIComponent(searchQuery.trim())}`;
      console.log('🔗 Navigating to search page:', searchUrl);

      // Clear search query after navigation
      setSearchQuery('');

      // Use Next.js router for better navigation
      await router.push(searchUrl);

    } catch (error) {
      console.error('❌ Search navigation error:', error);

      // Fallback to window.location
      const fallbackUrl = `/search?q=${encodeURIComponent(searchQuery.trim())}`;
      window.location.href = fallbackUrl;
    }
  };

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery) {
        performSearch(searchQuery);
      } else {
        setSearchResults([]);
        setShowSearchResults(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, performSearch]);

  // Close search on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSearchExpanded) {
        setIsSearchExpanded(false);
        setSearchQuery('');
        setShowSearchResults(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isSearchExpanded]);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchResultsRef.current && !searchResultsRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close search on route change
  useEffect(() => {
    setIsSearchExpanded(false);
    setShowSearchResults(false);
  }, [pathname]);

  // Render search results
  const renderSearchResults = () => (
    <AnimatePresence>
      {showSearchResults && searchResults.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.2 }}
          className={`absolute ${isMobile ? 'top-16 left-0 right-0' : 'top-12 left-0 right-0'} bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-96 overflow-y-auto`}
        >
          <div className="p-2">
            {searchResults.map((result) => (
              <button
                key={result.id}
                onClick={(e) => handleResultClick(result, e)}
                onTouchEnd={(e) => handleResultClick(result, e)}
                className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors text-left group cursor-pointer"
                type="button"
              >
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-gray-300 transition-colors">
                  {result.image ? (
                    <Image
                      width={40}
                      height={40}
                      src={result.image}
                      alt={result.title}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <>
                      {result.type === 'user' && <User size={20} className="text-gray-600" />}
                      {result.type === 'article' && <BookOpen size={20} className="text-gray-600" />}
                      {result.type === 'author' && <User size={20} className="text-gray-600" />}
                      {result.type === 'category' && <div className="text-gray-600 text-sm font-semibold">#</div>}
                    </>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate group-hover:text-[#EF3866] transition-colors">
                    {result.title}
                  </p>
                  {result.subtitle && (
                    <p className="text-sm text-gray-500 truncate">{result.subtitle}</p>
                  )}
                  {result.excerpt && (
                    <p className="text-xs text-gray-400 truncate mt-1">{result.excerpt}</p>
                  )}
                </div>
                <div className="flex flex-col items-end text-xs text-gray-400">
                  <span className="capitalize">{result.type}</span>
                  {result.likes && (
                    <span className="text-pink-500">♥ {result.likes}</span>
                  )}
                </div>
              </button>
            ))}

            {searchQuery && (
              <button
                onClick={handleSearchSubmit}
                className="w-full flex items-center gap-3 p-3 hover:bg-pink-50 rounded-lg transition-colors text-left border-t border-gray-100 mt-2 group"
              >
                <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-pink-200 transition-colors">
                  <Search size={20} className="text-pink-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 group-hover:text-[#EF3866] transition-colors">
                    See all results for &quot;{searchQuery}&quot;
                  </p>
                  <p className="text-sm text-gray-500">View complete search results</p>
                </div>
                <ArrowRight size={16} className="text-gray-400 group-hover:text-[#EF3866] transition-colors" />
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (isMobile) {
    return (
      <>
        {/* Mobile Search Button */}
        <button
          onClick={handleSearchToggle}
          className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-[#EF3866] transition-all"
        >
          <Search size={20} />
        </button>

        {/* Mobile Search Overlay */}
        <AnimatePresence>
          {isSearchExpanded && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="absolute top-full left-0 right-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 p-4 z-40"
              ref={searchResultsRef}
            >
              <form onSubmit={handleSearchSubmit} className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search users, articles, news..."
                  className="w-full h-12 pl-4 pr-12 text-sm bg-gray-100 border border-pink-200 rounded-full focus:outline-none focus:ring-2 focus:ring-pink-200 transition-all"
                  autoFocus
                />
                {isSearching && (
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-pink-500"></div>
                  </div>
                )}
                {renderSearchResults()}
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  // Desktop Search Component
  return (
    <div className={`relative flex items-center ${className}`} ref={searchResultsRef}>
      <AnimatePresence>
        {isSearchExpanded && (
          <motion.form
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            onSubmit={handleSearchSubmit}
            className="overflow-hidden relative"
          >
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users, articles, news..."
              className="w-full h-10 pl-4 pr-12 text-sm bg-gray-100 border border-pink-200 rounded-full focus:outline-none focus:ring-pink-200 transition-all"
            />
            {isSearching && (
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-pink-500"></div>
              </div>
            )}
          </motion.form>
        )}
      </AnimatePresence>

      <button
        onClick={handleSearchToggle}
        className={`p-2 rounded-full transition-all duration-300 ${isSearchExpanded
          ? 'bg-[#EF3866] text-white hover:bg-[#d7325a] ml-2'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-[#EF3866]'
          }`}
      >
        {isSearchExpanded ? (
          <X size={20} />
        ) : (
          <Search size={20} />
        )}
      </button>

      {renderSearchResults()}
    </div>
  );
};

export default SearchComponent;