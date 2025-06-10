"use client";

import Image from "next/image";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { Menu, X, Bell, Home, Shield, Mic, BookOpen, Users, ArrowRight, Settings, CreditCard, User, Search } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { useAppContext } from "@/context/AppContext";
import Link from "next/link";
import SignOutBtn from "@/components/SignOutBtn";
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@supabase/supabase-js';
import { usePathname, useRouter } from 'next/navigation';

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


// Initialize Supabase client with proper type checking
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Define the user profile type
interface UserProfile {
  role: string;
  first_name: string;
}

// Navigation items with icons
const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/verify-news", label: "Verify News", icon: Shield },
  { href: "/podcast", label: "Podcast", icon: Mic },
  { href: "/blog", label: "Blog", icon: BookOpen },
  { href: "/aboutus", label: "About Us", icon: Users },
];

// Custom hook for dark mode detection
const useDarkMode = () => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkDarkMode = () => {
      if (typeof window !== 'undefined') {
        const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setIsDark(isDarkMode);
      }
    };

    checkDarkMode();

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setIsDark(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return isDark;
};

const NewNavbar = () => {
  const { user } = useAppContext();
  const pathname = usePathname();
  const router = useRouter();
  const isDarkMode = useDarkMode();
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [showSignOut, setShowSignOut] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);

  // Search states
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchResultsRef = useRef<HTMLDivElement>(null);

  const toggleSidebar = () => setIsOpen(!isOpen);

  // Update the performSearch function to properly use both Supabase and Sanity
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
  }, []);


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

  // Add the getResultUrl function from your search results page
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


  // Debounced search
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

  // Handle search functionality
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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Navigate to search results page with all results
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
      setIsSearchExpanded(false);
      setShowSearchResults(false);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    router.push(result.url);
    setIsSearchExpanded(false);
    setShowSearchResults(false);
    setSearchQuery('');
  };

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

  // Close sidebar on route change
  useEffect(() => {
    setIsOpen(false);
    setIsSearchExpanded(false);
    setShowSearchResults(false);
  }, [pathname]);

  // Fetch user profile data from Supabase
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user?.id) {
        setLoading(true);
        try {
          console.log('Fetching profile for user ID:', user.id); // Debug log

          // Query using the actual database structure
          const { data, error } = await supabase
            .from('users')
            .select('role, first_name')
            .eq('id', user.id) // Using 'id' as shown in your database
            .single();

          console.log('Supabase response:', { data, error }); // Debug log

          if (data && !error) {
            setUserProfile({
              first_name: data.first_name || 'User',
              role: data.role || 'Member'
            });
            console.log('User profile set:', data); // Debug log
          } else {
            console.error('Supabase error:', error);
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchUserProfile();
  }, [user?.id]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY < 10) setIsVisible(true);
      else if (window.scrollY > lastScrollY + 10) setIsVisible(false);
      else if (window.scrollY < lastScrollY - 10) setIsVisible(true);

      setLastScrollY(window.scrollY);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Dynamic theme classes
  const sidebarBgClass = isDarkMode
    ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-black'
    : 'bg-gradient-to-br from-white via-gray-50 to-gray-100';

  const sidebarTextClass = isDarkMode ? 'text-white' : 'text-gray-800';
  const sidebarSecondaryTextClass = isDarkMode ? 'text-gray-300' : 'text-gray-600';
  const sidebarBorderClass = isDarkMode ? 'border-gray-600/30' : 'border-gray-300/50';
  const sidebarHoverBgClass = isDarkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100/80';
  const sidebarCardBgClass = isDarkMode ? 'bg-white/5' : 'bg-gray-100/50';

  return (
    <>
      <nav
        className={`px-6 md:px-28 h-[92px] flex items-center bg-white/70 backdrop-blur-sm shadow-sm fixed top-0 left-0 w-full transition-transform duration-300 z-50 font-sora ${isVisible ? "translate-y-0" : "-translate-y-full"}`}
      >
        <div className="flex items-center justify-between w-full">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link href="/">
              <Image src="/img/logo.png" alt="logo" width={100} height={100} />
            </Link>
          </div>

          {/* Desktop Nav Links with Search */}
          <div className="hidden md:flex items-center space-x-8 text-sm font-medium text-gray-700 font-sora">
            {/* Navigation Links */}
            <div className="flex items-center space-x-14">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} className="hover:text-[#EF3866] transition font-sora">
                  {item.label}
                </Link>
              ))}
            </div>

            {/* Search Component */}
            <div className="relative flex items-center" ref={searchResultsRef}>
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
                      className="w-full h-10 pl-4 pr-12 text-sm bg-gray-100 border border-pink-200 rounded-full focus:outline-none  focus:ring-pink-200 transition-all"
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

              {/* Search Results Dropdown */}
              <AnimatePresence>
                {showSearchResults && searchResults.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-12 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-96 overflow-y-auto"
                  >
                    <div className="p-2">
                      {searchResults.map((result) => (
                        <button
                          key={result.id}
                          onClick={() => handleResultClick(result)}
                          className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors text-left group"
                        >
                          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-gray-300 transition-colors">
                            {result.image ? (
                              <Image
                                width={96}
                                height={96}
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
            </div>
          </div>

          {/* Auth Section */}
          <div className="hidden md:flex items-center">
            {user ? (
              <div className="flex items-center gap-4">
                <div
                  className="relative flex items-center"
                  onMouseEnter={() => setShowSignOut(true)}
                  onMouseLeave={() => setShowSignOut(false)}
                >
                  {/* User Info Section */}
                  <div className="flex items-center gap-[2px] w-[212px] h-[50px]">
                    {/* Alarm Icon */}
                    <div className="w-[22.5px] h-[25.37px] flex items-center justify-center">
                      <Image
                        src="/icons/bell.png"
                        alt="alarm"
                        width={16}
                        height={25.37}
                        className="hover:text-[#EF3866] cursor-pointer transition"
                      />
                    </div>

                    <div className="flex w-[161.5px] h-[50px] gap-[5px] items-center">
                      {/* User Button */}
                      <div className="w-[50px] h-[50px] flex items-center justify-center">
                        <UserButton afterSignOutUrl="/">
                          <UserButton.MenuItems>
                            <UserButton.Action
                              label="Settings"
                              labelIcon={<Settings size={16} />}
                              onClick={() => router.push("/settings")}
                            />
                            <UserButton.Action
                              label="Dashboard"
                              labelIcon={<User size={16} />}
                              onClick={() => router.push("/dashboard")}
                            />
                            <UserButton.Action
                              label="Billing"
                              labelIcon={<CreditCard size={16} />}
                              onClick={() => router.push("/billing")}
                            />
                            <UserButton.Action
                              label="My Profile"
                              labelIcon={<User size={16} />}
                              onClick={() => router.push("/profile")}
                            />
                          </UserButton.MenuItems>
                        </UserButton>
                      </div>

                      {/* User Profile Info */}
                      <Link href="/hashedpage" className="flex flex-col justify-center h-8 text-sm">
                        <span className="text-[#656565] text-[18px] leading-[100%] font-sora font-semibold capitalize">
                          {loading ? 'Loading...' : (userProfile?.role || 'Member')}
                        </span>
                        <span className="text-[#111827] text-[20px] leading-[100%] font-semibold capitalize">
                          {loading ? 'Loading...' : (userProfile?.first_name || user?.firstName || 'User')}
                        </span>
                      </Link>
                    </div>
                  </div>

                  <AnimatePresence>
                    {showSignOut && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute w-[120px] right-14 top-10 mt-5 bg-gray-50 border border-gray-200 shadow-lg rounded-lg p-2 z-50 m-auto"
                      >
                        <SignOutBtn />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            ) : (
              <Link href="/authentication/sign-up">
                <button className="flex items-center gap-4 bg-[#EF3866] hover:bg-[#d7325a] text-white px-6 py-4 rounded-full transition-all text-xl font-sora">
                  <span className="text-lg font-sora">Sign Up</span>
                  <Image
                    src="/icons/arrow-circle-right.png"
                    alt="arrow"
                    width={30}
                    height={30}
                  />
                </button>
              </Link>
            )}
          </div>

          {/* Mobile Hamburger */}
          <div className="md:hidden flex items-center gap-3">
            {/* Mobile Search Button */}
            <button
              onClick={handleSearchToggle}
              className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-[#EF3866] transition-all"
            >
              <Search size={20} />
            </button>

            <button
              onClick={toggleSidebar}
              className="relative flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 hover:from-gray-700 hover:to-gray-900 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              {isOpen ?
                <X size={24} className="text-white" /> :
                <Menu size={24} className="text-white" />
              }
            </button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <AnimatePresence>
          {isSearchExpanded && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="absolute top-full left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 p-4 md:hidden"
            >
              <form onSubmit={handleSearchSubmit}>
                <div className="relative">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search articles, news..."
                    className="w-full h-12 pl-12 pr-4 text-sm bg-gray-100 border border-pink-200 rounded-full focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-200 transition-all"
                  />
                  <Search size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  {isSearching && (
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-pink-500"></div>
                    </div>
                  )}
                </div>
              </form>

              {/* Mobile Search Results */}
              {showSearchResults && searchResults.length > 0 && (
                <div className="mt-4 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
                  <div className="p-2">
                    {searchResults.map((result) => (
                      <button
                        key={result.id}
                        onClick={() => handleResultClick(result)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors text-left"
                      >
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                          {result.image ? (
                            <Image
                              src={result.image}
                              alt={result.title}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <>
                              {result.type === 'user' && <User size={16} className="text-gray-600" />}
                              {result.type === 'article' && <BookOpen size={16} className="text-gray-600" />}
                              {result.type === 'author' && <User size={16} className="text-gray-600" />}
                              {result.type === 'category' && <div className="text-gray-600 text-xs font-semibold">#</div>}
                            </>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm truncate">{result.title}</p>
                          {result.subtitle && (
                            <p className="text-xs text-gray-500 truncate">{result.subtitle}</p>
                          )}
                        </div>
                        <div className="text-xs text-gray-400 capitalize">
                          {result.type}
                        </div>
                      </button>
                    ))}

                    {searchQuery && (
                      <button
                        onClick={handleSearchSubmit}
                        className="w-full flex items-center gap-3 p-3 hover:bg-pink-50 rounded-lg transition-colors text-left border-t border-gray-100 mt-2"
                      >
                        <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <Search size={16} className="text-pink-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 text-sm">See all results</p>
                          <p className="text-xs text-gray-500">View complete search results</p>
                        </div>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={`fixed inset-0 z-40 ${isDarkMode ? 'bg-black/70' : 'bg-gray-900/50'} backdrop-blur-sm`}
            onClick={toggleSidebar}
          />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className={`fixed top-0 right-0 h-screen w-80 ${sidebarBgClass} shadow-2xl z-50 overflow-y-auto`}
          >
            {/* Sidebar Content */}
            <div className="p-8 h-full flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 relative">
                    <Image
                      src="/img/logo.png"
                      alt="logo"
                      fill
                      className="object-contain"
                    />
                  </div>
                  <span className={`${sidebarTextClass} text-xl font-bold font-sora`}>Menu</span>
                </div>

                <button
                  onClick={toggleSidebar}
                  className={`w-10 h-10 rounded-full ${sidebarCardBgClass} backdrop-blur-sm border ${sidebarBorderClass} flex items-center justify-center transition-all duration-300`}
                >
                  <X size={20} className={sidebarTextClass} />
                </button>
              </div>

              {/* Navigation Links */}
              <div className="flex-1 space-y-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`group flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 ${sidebarHoverBgClass} backdrop-blur-sm border border-transparent ${sidebarBorderClass} ${isActive ? `${sidebarCardBgClass} border-${sidebarBorderClass}` : ''
                        }`}
                    >
                      <div className={`p-2 rounded-xl transition-all duration-300 ${isActive
                          ? 'bg-gradient-to-br from-[#EF3866] to-gray-700'
                          : `${sidebarCardBgClass} group-hover:bg-gradient-to-br group-hover:from-[#EF3866] group-hover:to-gray-700`
                        }`}>
                        <Icon size={20} className={`${isActive ? 'text-white' : `${sidebarTextClass} group-hover:text-white`}`} />
                      </div>
                      <span className={`${sidebarTextClass} font-medium font-sora text-lg transition-transform duration-300`}>
                        {item.label}
                      </span>
                      <ArrowRight
                        size={16}
                        className={`${sidebarSecondaryTextClass} group-hover:text-[#EF3866] transition-all duration-300 ml-auto`}
                      />
                    </Link>
                  );
                })}
              </div>

              {/* User Section */}
              <div className={`mt-8 p-6 rounded-2xl ${sidebarCardBgClass} backdrop-blur-sm border ${sidebarBorderClass}`}>
                {user ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#EF3866] to-gray-700 p-0.5">
                        <div className={`w-full h-full rounded-full ${sidebarCardBgClass} flex items-center justify-center`}>
                          <UserButton>
                            <UserButton.MenuItems>
                              <UserButton.Action
                                label="Dashboard"
                                labelIcon={<User size={16} />}
                                onClick={() => router.push("/hashedpage")}
                              />
                              <UserButton.Action
                                label="My Profile"
                                labelIcon={<User size={16} />}
                                onClick={() => router.push("/hashedpage")}
                              />
                            </UserButton.MenuItems>
                          </UserButton>
                        </div>
                      </div>

                      <div className="flex-1">
                        <Link href="/hashedpage" className="block">
                          <p className={`${sidebarSecondaryTextClass} text-sm font-sora capitalize`}>
                            {loading ? 'Loading...' : (userProfile?.role || 'Member')}
                          </p>
                          <p className={`${sidebarTextClass} font-semibold text-lg font-sora capitalize`}>
                            {loading ? 'Loading...' : (userProfile?.first_name || user?.firstName || 'User')}
                          </p>
                        </Link>
                      </div>

                      <Bell size={20} className={`${sidebarSecondaryTextClass} hover:text-[#EF3866] cursor-pointer transition-colors`} />
                    </div>

                    <div className={`pt-4 border-t ${sidebarBorderClass}`}>
                      <SignOutBtn />
                    </div>
                  </div>
                ) : (
                  <Link href="/authentication/sign-up">
                    <button className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-[#EF3866] to-gray-700 hover:from-[#d7325a] hover:to-gray-600 text-white font-semibold px-6 py-4 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl font-sora">
                      <span className="text-lg">Sign Up</span>
                      <ArrowRight size={20} />
                    </button>
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default NewNavbar;