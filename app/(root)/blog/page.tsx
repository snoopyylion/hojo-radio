"use client";

import React, { useEffect, useState, useRef } from "react";
import { client } from "@/sanity/lib/client";
import { ALL_POSTS_QUERY } from "@/sanity/lib/queries";
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

const CategorySection: React.FC<CategorySectionProps> = ({
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
};

const NewsPage = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  
  // Track visible count for each category (including Latest News)
  const [visibleCounts, setVisibleCounts] = useState<Record<string, number>>({});

  // Animation refs
  const heroRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollTopRef = useRef<HTMLButtonElement>(null);

  // Initialize visible counts when categories change
  useEffect(() => {
    const initialCounts: Record<string, number> = { 'Latest News': 4 };
    categories.forEach(category => {
      initialCounts[category] = 4;
    });
    setVisibleCounts(initialCounts);
  }, [categories]);

  // Filter posts based on search
  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(search.toLowerCase()) ||
      post.description?.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  // Group posts by category
  const postsByCategory = categories.reduce((acc, category) => {
    acc[category] = posts.filter(post =>
      post.categories.some(cat => cat.title === category)
    );
    return acc;
  }, {} as Record<string, Post[]>);

  // Get latest posts (all posts sorted by date)
  const latestPosts = [...posts].sort((a, b) =>
    new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  // Initial animations
  useEffect(() => {
    const tl = gsap.timeline();

    if (heroRef.current) {
      gsap.set(heroRef.current, { opacity: 0, y: 30 });
      tl.to(heroRef.current, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: "power3.out"
      });
    }

    if (searchRef.current) {
      gsap.set(searchRef.current, { opacity: 0, y: 20 });
      tl.to(searchRef.current, {
        opacity: 1,
        y: 0,
        duration: 0.6,
        ease: "power2.out"
      }, "-=0.4");
    }

    if (scrollTopRef.current) {
      gsap.set(scrollTopRef.current, { scale: 0, rotation: -180 });
    }

    return () => {
      tl.kill();
    };
  }, []);

  // Content animation when posts load
  useEffect(() => {
    if (!isLoading && contentRef.current) {
      const sections = contentRef.current.querySelectorAll('.news-section');

      gsap.set(sections, { opacity: 0, y: 30 });

      gsap.to(sections, {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: "power2.out"
      });
    }
  }, [isLoading, posts]);

  // Scroll top button animation
  useEffect(() => {
    const handleScroll = () => {
      const shouldShow = window.scrollY > 400;
      setShowScrollTop(shouldShow);

      if (scrollTopRef.current) {
        if (shouldShow && !showScrollTop) {
          gsap.to(scrollTopRef.current, {
            scale: 1,
            rotation: 0,
            duration: 0.3,
            ease: "back.out(1.7)"
          });
        } else if (!shouldShow && showScrollTop) {
          gsap.to(scrollTopRef.current, {
            scale: 0,
            rotation: -180,
            duration: 0.3,
            ease: "back.in(1.7)"
          });
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [showScrollTop]);

  // Fetch posts
  useEffect(() => {
    async function fetchPosts() {
      setIsLoading(true);
      try {
        const data = await client.fetch<Post[]>(ALL_POSTS_QUERY);
        setPosts(data);

        const allCategories = data.flatMap(post =>
          post.categories.map(cat => cat.title)
        );
        setCategories([...new Set(allCategories)]);
      } catch (error) {
        console.error("Error fetching posts:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPosts();

    // Real-time listener
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
        const { result, documentId, mutations } = update;

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

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const scrollToTop = () => {
    gsap.to(window, {
      scrollTo: { y: 0 },
      duration: 1,
      ease: "power2.out"
    });
  };

  const handleShowMore = (categoryTitle: string) => {
    setVisibleCounts(prev => ({
      ...prev,
      [categoryTitle]: (prev[categoryTitle] || 4) + 4
    }));
  };

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

  return (
    <div className="min-h-screen pt-[20px] bg-white dark:bg-black transition-colors duration-300">
      {/* Minimalist Professional Header */}
      <header className="relative pt-[100px] md:pt-[120px] pb-16 px-4 md:px-8 lg:px-16 max-w-7xl mx-auto">
        {/* Subtle background accent */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#EF3866]/20 to-transparent"></div>

        <div ref={heroRef} className="text-center mb-12">
          {/* Clean, minimal title */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-light text-gray-900 dark:text-white mb-6 tracking-tight">
            News & Insights
          </h1>

          {/* Accent line */}
          <div className="w-24 h-0.5 bg-[#EF3866] mx-auto mb-6"></div>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto font-light leading-relaxed">
            Stay informed with carefully curated stories and expert analysis
          </p>
        </div>

        {/* Clean Search Bar */}
        <div ref={searchRef} className="max-w-xl mx-auto">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search articles..."
              className="w-full pl-12 pr-4 py-4 border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-[#EF3866]/20 focus:border-[#EF3866] transition-all duration-200"
            />
          </div>
        </div>
      </header>

      {/* Main Content with Responsive Layout */}
      <main className="px-4 md:px-8 lg:px-16 max-w-7xl mx-auto pb-16">
        <div ref={contentRef}>
          {/* Show search results if searching */}
          {search ? (
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
              {/* Latest News Section - Full Width */}
              <div className="news-section mb-16">
                <CategorySection
                  title="Latest News"
                  posts={latestPosts}
                  visibleCount={visibleCounts['Latest News'] || 4}
                  onShowMore={() => handleShowMore('Latest News')}
                  isFullWidth={true}
                />
              </div>

              {/* Category Sections - Responsive Grid */}
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