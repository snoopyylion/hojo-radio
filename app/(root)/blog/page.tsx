"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import { client } from "@/sanity/lib/client";
import { ALL_POSTS_QUERY } from "@/sanity/lib/queries";
import { groq } from "next-sanity";
import { ChevronUp } from "lucide-react";
import NewsTile from "@/components/NewsTile";

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

// Type guard to check if a document matches the Post interface
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

const NewsPage = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [view, setView] = useState<'grid' | 'list'>('grid');

  // For infinite scroll
  const postsPerPage = 9;
  const [visiblePosts, setVisiblePosts] = useState(postsPerPage);
  const loaderRef = useRef<HTMLDivElement>(null);

  // Use useMemo to calculate filtered posts to avoid the "used before declaration" error
  const filteredPosts = useMemo(() => {
    return posts.filter(post => {
      const matchesSearch = post.title.toLowerCase().includes(search.toLowerCase()) ||
        post.description?.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = !activeCategory ||
        post.categories.some(cat => cat.title === activeCategory);

      return matchesSearch && matchesCategory;
    });
  }, [posts, search, activeCategory]);

  useEffect(() => {
    // Initial fetch of all posts
    async function fetchPosts() {
      setIsLoading(true);
      try {
        const data = await client.fetch<Post[]>(ALL_POSTS_QUERY);
        setPosts(data);

        // Extract all unique categories
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

    // Set up real-time listener
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

        // Handle different types of updates
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

    // Set up scroll listener
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);

    // Clean up
    return () => {
      subscription.unsubscribe();
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Reset visible posts when filters change
  useEffect(() => {
    setVisiblePosts(Math.min(postsPerPage, filteredPosts.length));
  }, [search, activeCategory, filteredPosts.length]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const currentLoaderRef = loaderRef.current; // Capture current value
    
    const observer = new IntersectionObserver(
      entries => {
        const [entry] = entries;
        if (entry.isIntersecting && visiblePosts < filteredPosts.length) {
          setVisiblePosts(prev => Math.min(prev + postsPerPage, filteredPosts.length));
        }
      },
      { threshold: 0.1 }
    );
  
    if (currentLoaderRef) {
      observer.observe(currentLoaderRef);
    }
  
    return () => {
      if (currentLoaderRef) {
        observer.unobserve(currentLoaderRef);
      }
    };
  }, [loaderRef, visiblePosts, filteredPosts.length]);
  // Scroll to top function
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <section className="px-4 pt-[120px] md:pt-[150px] md:px-8 lg:px-16 py-8 bg-white dark:bg-black transition-colors duration-300 min-h-screen">
      {/* Hero Section */}
      <div className="relative mb-10 bg-gradient-to-r from-pink-100 via-white to-purple-100 dark:from-pink-950 dark:via-gray-950 dark:to-purple-950 rounded-xl overflow-hidden">
        <div className="absolute inset-0 bg-[url('/img/heroimg.png')] opacity-5"></div>
        <div className="relative p-6 md:p-10 lg:p-16">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-900 dark:text-white mb-4">
            Latest News & Articles
          </h1>
          <p className="text-gray-600 dark:text-gray-300 max-w-2xl">
            Stay up to date with the most recent updates, insights, and stories from our team.
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-black/80 backdrop-blur-md pt-4 pb-4 mb-6 border-b border-gray-100 dark:border-gray-800">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
          <div className="relative w-full md:w-auto md:flex-1 max-w-md">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search articles..."
              className="w-full border border-gray-300 dark:border-gray-700 rounded-full px-5 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors pl-10"
            />
            <span className="absolute left-3 top-2.5 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setView('grid')}
              className={`p-2 rounded ${view === 'grid' ? 'bg-[#EF3866] text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}
              aria-label="Grid view"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
            </button>
            <button
              onClick={() => setView('list')}
              className={`p-2 rounded ${view === 'list' ? 'bg-[#EF3866] text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}
              aria-label="List view"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 pb-1 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors duration-200 ${!activeCategory
                ? 'bg-[#EF3866] text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
          >
            All
          </button>
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors duration-200 ${activeCategory === category
                  ? 'bg-[#EF3866] text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Content Section */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="relative w-16 h-16">
            <div className="absolute top-0 left-0 w-full h-full border-4 border-[#EF3866]/20 rounded-full"></div>
            <div className="absolute top-0 left-0 w-full h-full border-4 border-transparent border-t-[#EF3866] rounded-full animate-spin"></div>
          </div>
        </div>
      ) : (
        <>
          {filteredPosts.length > 0 ? (
            <div className={view === 'grid'
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
              : "flex flex-col gap-4"
            }>
              {filteredPosts.slice(0, visiblePosts).map(post => (
                <NewsTile key={post._id} post={post} view={view} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-[#EF3866] mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">No posts found</h3>
              <p className="text-gray-600 dark:text-gray-300 max-w-md mb-4">
                We couldn't find any posts matching your search criteria. Try adjusting your filters or explore different categories.
              </p>
              <button
                onClick={() => { setSearch(""); setActiveCategory(null); }}
                className="bg-[#EF3866] hover:bg-[#d72955] text-white px-6 py-2 rounded-full transition shadow-md"
              >
                Reset Filters
              </button>
            </div>
          )}

          {/* Infinite Scroll Loader */}
          {filteredPosts.length > visiblePosts && (
            <div
              ref={loaderRef}
              className="flex justify-center items-center py-8"
            >
              <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-2 w-16 rounded-full"></div>
            </div>
          )}
        </>
      )}

      {/* Scroll to top button */}
      <button
        onClick={scrollToTop}
        className={`fixed bottom-6 right-6 bg-[#EF3866] hover:bg-[#d72955] text-white p-3 rounded-full shadow-lg z-50 transition-opacity duration-300 ${showScrollTop ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        aria-label="Scroll to top"
      >
        <ChevronUp size={20} />
      </button>
    </section>
  );
};

export default NewsPage;

