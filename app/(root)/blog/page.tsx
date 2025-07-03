"use client";

import React, { useEffect, useState, useRef, useCallback, useMemo, startTransition } from "react";
import { client } from "@/sanity/lib/client";
import { groq } from "next-sanity";
import { ChevronUp, Search, TrendingUp } from "lucide-react";
import NewsTile from "@/components/NewsTile";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

interface Post {
  _id: string;
  title: string;
  description: string;
  slug: { current: string };
  mainImage?: {
    asset: {
      _ref: string;
      _type: string;
    };
  };
  publishedAt: string;
  author: {
    name: string;
    image?: {
      asset: {
        _ref: string;
        _type: string;
      };
    };
  };
  categories: { title: string }[];
}

function isPost(doc: unknown): doc is Post {
  if (!doc || typeof doc !== 'object') return false;
  const post = doc as Record<string, unknown>;

  if (typeof post._id !== 'string') return false;
  if (typeof post.title !== 'string') return false;

  if (!post.slug || typeof post.slug !== 'object') return false;
  const slug = post.slug as Record<string, unknown>;
  if (typeof slug.current !== 'string') return false;

  if (typeof post.publishedAt !== 'string') return false;

  if (!post.author || typeof post.author !== 'object') return false;
  const author = post.author as Record<string, unknown>;
  if (typeof author.name !== 'string') return false;

  if (!Array.isArray(post.categories)) return false;

  return true;
}

interface CategorySectionProps {
  title: string;
  posts: Post[];
  visibleCount: number;
  onShowMore: () => void;
  isFullWidth?: boolean;
}

const CategorySection: React.FC<CategorySectionProps> = React.memo(({
  title,
  posts,
  visibleCount,
  onShowMore,
  isFullWidth = false
}) => {
  const displayPosts = posts.slice(0, visibleCount);
  const hasMorePosts = posts.length > visibleCount;

  return (
    <section className={`${isFullWidth ? 'mb-16' : 'mb-12'}`}>
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-white flex items-center gap-3">
          {title === 'Latest News' && <TrendingUp className="w-5 h-5 text-[#EF3866]" />}
          {title}
          <div className="flex-1 h-px bg-gradient-to-r from-[#EF3866]/30 to-transparent ml-4"></div>
        </h2>
      </div>

      <div className="space-y-4">
        {displayPosts.map((post) => (
          <NewsTile key={post._id} post={post} />
        ))}
      </div>

      {hasMorePosts && (
        <div className="flex justify-center mt-6">
          <button
            onClick={onShowMore}
            className="text-[#EF3866] hover:text-[#d72955] font-medium px-6 py-2 border border-[#EF3866]/20 hover:border-[#EF3866]/40 rounded-lg transition-all duration-200 hover:bg-[#EF3866]/5"
          >
            Show More ({posts.length - visibleCount} remaining)
          </button>
        </div>
      )}
    </section>
  );
});

CategorySection.displayName = 'CategorySection';

// Virtualized list component for better performance with large datasets
const VirtualizedPostList: React.FC<{ posts: Post[]; containerHeight: number }> = React.memo(({ posts, containerHeight }) => {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 10 });
  const containerRef = useRef<HTMLDivElement>(null);
  const ITEM_HEIGHT = 200; // Approximate height of each NewsTile

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const start = Math.floor(scrollTop / ITEM_HEIGHT);
      const end = Math.min(start + Math.ceil(containerHeight / ITEM_HEIGHT) + 2, posts.length);
      setVisibleRange({ start, end });
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [containerHeight, posts.length]);

  const visiblePosts = posts.slice(visibleRange.start, visibleRange.end);

  return (
    <div ref={containerRef} className="overflow-auto" style={{ height: containerHeight }}>
      <div style={{ height: posts.length * ITEM_HEIGHT }}>
        <div style={{ transform: `translateY(${visibleRange.start * ITEM_HEIGHT}px)` }}>
          {visiblePosts.map((post) => (
            <NewsTile key={post._id} post={post} />
          ))}
        </div>
      </div>
    </div>
  );
});

VirtualizedPostList.displayName = 'VirtualizedPostList';

const NewsPage = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);

  // Track visible count for each category (including Latest News)
  const [visibleCounts, setVisibleCounts] = useState<Record<string, number>>({});

  // Animation refs
  const heroRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollTopRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLDivElement>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      startTransition(() => {
        setDebouncedSearch(search);
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  // Initialize visible counts when categories change
  useEffect(() => {
    const initialCounts: Record<string, number> = { 'Latest News': 6 };
    categories.forEach(category => {
      initialCounts[category] = 4;
    });
    setVisibleCounts(initialCounts);
  }, [categories]);

  // Memoized filtered posts to avoid recalculation
  const filteredPosts = useMemo(() => {
    if (!debouncedSearch.trim()) return posts;

    const searchLower = debouncedSearch.toLowerCase();
    return posts.filter(post => {
      return (
        post.title.toLowerCase().includes(searchLower) ||
        post.description?.toLowerCase().includes(searchLower) ||
        post.author.name.toLowerCase().includes(searchLower) ||
        post.categories.some(cat => cat.title.toLowerCase().includes(searchLower))
      );
    });
  }, [posts, debouncedSearch]);

  // Memoized posts by category to avoid recalculation
  const postsByCategory = useMemo(() => {
    return categories.reduce((acc, category) => {
      acc[category] = posts.filter(post =>
        post.categories.some(cat => cat.title === category)
      );
      return acc;
    }, {} as Record<string, Post[]>);
  }, [categories, posts]);

  // Memoized latest posts
  const latestPosts = useMemo(() => {
    return [...posts].sort((a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
  }, [posts]);

  // Memoized categories from posts
  const extractedCategories = useMemo(() => {
    const allCategories = posts.flatMap(post =>
      post.categories.map(cat => cat.title)
    );
    return [...new Set(allCategories)];
  }, [posts]);

  // Update categories when posts change
  useEffect(() => {
    setCategories(extractedCategories);
  }, [extractedCategories]);

  // Enhanced scroll handler with nav animation
  const handleScroll = useCallback(() => {
    const scrollY = window.scrollY;
    const shouldShowScrollTop = scrollY > 400;
    const shouldShowNav = scrollY > 300; // Increased threshold to avoid early activation

    if (shouldShowScrollTop !== showScrollTop) {
      setShowScrollTop(shouldShowScrollTop);

      if (scrollTopRef.current) {
        if (shouldShowScrollTop) {
          gsap.to(scrollTopRef.current, {
            scale: 1,
            rotation: 0,
            duration: 0.3,
            ease: "back.out(1.7)"
          });
        } else {
          gsap.to(scrollTopRef.current, {
            scale: 0,
            rotation: -180,
            duration: 0.3,
            ease: "back.in(1.7)"
          });
        }
      }
    }

    if (shouldShowNav !== isScrolled) {
      setIsScrolled(shouldShowNav);
    }
  }, [showScrollTop, isScrolled]);

  // Throttled scroll event listener
  useEffect(() => {
    let ticking = false;

    const throttledHandleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', throttledHandleScroll, { passive: true });
    return () => window.removeEventListener('scroll', throttledHandleScroll);
  }, [handleScroll]);

  // Initial animations with reduced complexity
  useEffect(() => {
    if (isLoading) return;

    const tl = gsap.timeline();

    if (heroRef.current) {
      gsap.set(heroRef.current, { opacity: 0, y: 20 });
      tl.to(heroRef.current, {
        opacity: 1,
        y: 0,
        duration: 0.6,
        ease: "power2.out"
      });
    }

    if (searchRef.current) {
      gsap.set(searchRef.current, { opacity: 0, y: 15 });
      tl.to(searchRef.current, {
        opacity: 1,
        y: 0,
        duration: 0.4,
        ease: "power2.out"
      }, "-=0.3");
    }

    if (scrollTopRef.current) {
      gsap.set(scrollTopRef.current, { scale: 0, rotation: -180 });
    }

    return () => {
      tl.kill();
    };
  }, [isLoading]);

  // Content animation when posts load
  useEffect(() => {
    if (!isLoading && contentRef.current) {
      const sections = contentRef.current.querySelectorAll('.news-section');

      gsap.set(sections, { opacity: 0, y: 20 });

      gsap.to(sections, {
        opacity: 1,
        y: 0,
        duration: 0.4,
        stagger: 0.08,
        ease: "power2.out"
      });
    }
  }, [isLoading]);

  // Optimized data fetching with error handling and caching
  useEffect(() => {
    let isMounted = true;

    async function fetchPosts() {
      try {
        const optimizedQuery = groq`*[_type == "post"] | order(publishedAt desc) {
          _id,
          title,
          description,
          slug,
          mainImage,
          publishedAt,
          _createdAt,
          author->{ name, image },
          categories[]->{ title }
        }`;

        const data = await client.fetch<Post[]>(optimizedQuery);

        if (isMounted) {
          setPosts(data);
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error fetching posts:", error);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchPosts();

    const subscription = client
      .listen(
        groq`*[_type == "post"] {
          _id,
          title,
          description,
          slug,
          mainImage,
          publishedAt,
          _createdAt,
          author->{ name, image },
          categories[]->{ title }
        }`
      )
      .subscribe((update) => {
        if (!isMounted) return;

        const { result, documentId, mutations } = update;

        startTransition(() => {
          if (mutations.some(m => 'create' in m)) {
            if (result && isPost(result)) {
              setPosts(prevPosts => [result, ...prevPosts]);
            }
          } else if (mutations.some(m => 'delete' in m)) {
            setPosts(prevPosts => prevPosts.filter(post => post._id !== documentId));
          } else {
            if (result && isPost(result)) {
              setPosts(prevPosts =>
                prevPosts.map(post => post._id === result._id ? result : post)
              );
            }
          }
        });
      });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const scrollToTop = useCallback(() => {
    gsap.to(window, {
      scrollTo: { y: 0 },
      duration: 0.8,
      ease: "power2.out"
    });
  }, []);

  const handleShowMore = useCallback((categoryTitle: string) => {
    setVisibleCounts(prev => ({
      ...prev,
      [categoryTitle]: (prev[categoryTitle] || 4) + 6
    }));
  }, []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-4 border-gray-200 dark:border-gray-800 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-transparent border-t-[#EF3866] rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  const currentDate = new Date();
  const formattedDate = currentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="min-h-screen bg-white dark:bg-black transition-colors duration-300 pt-[90px]">
      {/* Floating Navigation Bar - Only shows when scrolled */}
      {/* Enhanced Floating Navigation Bar - Better positioning and styling */}
      <nav
        ref={navRef}
        className={`fixed top-3 sm:top-6 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-700 ease-out w-full max-w-[calc(100%-2rem)] ${isScrolled
            ? 'opacity-100 translate-y-0 scale-100'
            : 'opacity-0 -translate-y-8 scale-95 pointer-events-none'
          }`}
      >
        <div className="relative">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#EF3866]/10 via-[#EF3866]/5 to-[#EF3866]/10 rounded-2xl blur-xl scale-110 opacity-60"></div>

          {/* Main navbar */}
          <div className="relative bg-white/95 dark:bg-black/95 backdrop-blur-2xl border border-gray-200/60 dark:border-gray-800/60 rounded-2xl shadow-2xl shadow-black/5 dark:shadow-black/20 px-4 sm:px-8 py-3 sm:py-4">
            <div className="flex items-center justify-between w-full gap-4 sm:gap-8">

              {/* Left section - Brand */}
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="relative">
                  {/* Animated dot indicator */}
                  <div className="w-2 h-2 bg-[#EF3866] rounded-full animate-pulse"></div>
                  <div className="absolute inset-0 w-2 h-2 bg-[#EF3866] rounded-full animate-ping opacity-30"></div>
                </div>
                <div className="font-serif text-lg sm:text-xl font-bold tracking-tight">
                  <span className="text-gray-900 dark:text-white">News</span>
                  <span className="text-[#EF3866] ml-1 sm:ml-2">&</span>
                  <span className="text-gray-900 dark:text-white ml-1 sm:ml-2 italic font-light">Insights</span>
                </div>
              </div>

              {/* Right section - Date and status */}
              <div className="flex items-center space-x-4 sm:space-x-8">
                {/* Date */}
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 font-medium whitespace-nowrap">
                  {formattedDate}
                </div>

                {/* Separator */}
                <div className="h-6 w-px bg-gradient-to-b from-transparent via-gray-300 dark:via-gray-600 to-transparent"></div>

                {/* Live indicator */}
                <div className="flex items-center space-x-2 sm:space-x-3 text-xs sm:text-sm">
                  <div className="relative">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="absolute inset-0 w-2 h-2 bg-green-500 rounded-full animate-ping opacity-40"></div>
                  </div>
                  <span className="text-gray-600 dark:text-gray-300 font-medium">Live</span>
                </div>
              </div>
            </div>

            {/* Bottom accent line */}
            <div className="absolute bottom-0 left-4 sm:left-8 right-4 sm:right-8 h-px bg-gradient-to-r from-transparent via-[#EF3866]/20 to-transparent"></div>
          </div>
        </div>
      </nav>
      {/* Enhanced Header - No longer conflicts with floating nav */}
      <header className="relative pt-8 pb-16 px-4 md:px-8 lg:px-16 max-w-7xl mx-auto overflow-hidden">
        {/* Subtle animated background elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-32 left-16 w-1 h-1 bg-[#EF3866]/20 rounded-full animate-pulse"></div>
          <div className="absolute top-48 right-24 w-0.5 h-0.5 bg-[#EF3866]/30 rounded-full animate-pulse delay-500"></div>
          <div className="absolute bottom-32 left-1/3 w-1.5 h-1.5 bg-[#EF3866]/15 rounded-full animate-pulse delay-1000"></div>
        </div>

        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#EF3866]/20 to-transparent"></div>

        <div ref={heroRef} className="text-center mb-2 relative z-10">
          {/* Publication date */}
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-6 tracking-widest uppercase">
            {formattedDate}
          </div>

          {/* Main title with enhanced typography */}
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-serif font-bold text-gray-900 dark:text-whiteleading-tight tracking-tight">
            <span className="mr-4 text-gray-900 dark:text-white">News</span>
            <span className="text-[#EF3866] italic font-light">&amp; Insights</span>
          </h1>

          {/* Refined accent line */}
          <div className="flex items-center justify-center">
            <div className="w-8 h-px bg-gray-300 dark:bg-gray-700"></div>
            <div className="w-3 h-px bg-[#EF3866] mx-2"></div>
            <div className="w-8 h-px bg-gray-300 dark:bg-gray-700"></div>
          </div>
        </div>

        {/* Enhanced Search Bar */}
        <div ref={searchRef} className="max-w-2xl mx-auto relative z-10">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-[#EF3866]/5 via-transparent to-[#EF3866]/5 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative bg-white/80 dark:bg-black/80 backdrop-blur-sm border border-gray-200/60 dark:border-gray-800/60 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center p-1">
                <Search className="ml-5 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={search}
                  onChange={handleSearchChange}
                  placeholder="Search the latest stories, trends, and insights..."
                  className="flex-1 ml-4 mr-4 py-2 bg-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none text-base"
                />
                <button className="bg-[#EF3866] hover:bg-[#EF3866]/90 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 hover:scale-[1.02] focus:ring-2 focus:ring-[#EF3866]/20">
                  Search
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 md:px-8 lg:px-16 max-w-7xl mx-auto pb-16">
        <div ref={contentRef}>
          {/* Show search results if searching */}
          {debouncedSearch ? (
            <section className="news-section">
              <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-white mb-8 flex items-center gap-3">
                <Search className="w-6 h-6 text-[#EF3866]" />
                Search Results ({filteredPosts.length})
              </h2>
              {filteredPosts.length > 0 ? (
                <div className="space-y-6">
                  {filteredPosts.map((post) => (
                    <NewsTile key={post._id} post={post} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="text-gray-400 mb-4">
                    <Search className="w-16 h-16 mx-auto opacity-50" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    No results found
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Try searching with different keywords
                  </p>
                </div>
              )}
            </section>
          ) : (
            <>
              {/* Latest News Section */}
              <div className="news-section mb-16">
                <CategorySection
                  title="Latest News"
                  posts={latestPosts}
                  visibleCount={visibleCounts['Latest News'] || 6}
                  onShowMore={() => handleShowMore('Latest News')}
                  isFullWidth={true}
                />
              </div>

              {/* Category Sections */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                {categories.map((category) => (
                  <div key={category} className="news-section">
                    <CategorySection
                      title={category}
                      posts={postsByCategory[category] || []}
                      visibleCount={visibleCounts[category] || 4}
                      onShowMore={() => handleShowMore(category)}
                    />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </main>

      {/* Scroll to top button */}
      <button
        ref={scrollTopRef}
        onClick={scrollToTop}
        className="fixed bottom-8 right-8 bg-white dark:bg-black border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white p-3 rounded-full shadow-lg hover:shadow-xl z-50 transition-all duration-300 transform hover:scale-110 hover:border-[#EF3866]/30"
        style={{ opacity: showScrollTop ? 1 : 0, pointerEvents: showScrollTop ? 'auto' : 'none' }}
        aria-label="Scroll to top"
      >
        <ChevronUp size={20} />
      </button>
    </div>
  );
};

export default NewsPage;