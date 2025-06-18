"use client";

import React, { useEffect, useState, useRef } from "react";
import { client } from "@/sanity/lib/client";
import { ALL_POSTS_QUERY } from "@/sanity/lib/queries";
import { groq } from "next-sanity";
import { TrendingUp, ArrowRight, Newspaper } from "lucide-react";
import NewsTile from "@/components/NewsTile";
import { gsap } from "gsap";
import Link from "next/link";

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

interface HomeCategorySectionProps {
  title: string;
  posts: Post[];
  icon: React.ReactNode;
}

const HomeCategorySection: React.FC<HomeCategorySectionProps> = ({
  title,
  posts,
  icon
}) => {
  const displayPosts = posts.slice(0, 2); // Show only 2 posts per category

  return (
    <div className="bg-white dark:bg-black rounded-xl p-6 border  hover:border-[#EF3866]/20 dark:hover:border-[#EF3866]/20 transition-all duration-300">
      <div className="mb-6">
        <h3 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-3">
          {icon}
          {title}
          <div className="flex-1 h-px bg-gradient-to-r from-[#EF3866]/30 to-transparent ml-4"></div>
        </h3>
      </div>

      <div className="space-y-4">
        {displayPosts.map((post) => (
          <NewsTile key={post._id} post={post} />
        ))}
      </div>

      {posts.length > 2 && (
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            +{posts.length - 2} more articles in {title}
          </p>
        </div>
      )}
    </div>
  );
};

const HomeNewsSection = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [randomCategory, setRandomCategory] = useState<string>("");
  
  // Animation refs
  const sectionRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Get latest posts (sorted by date)
  const latestPosts = [...posts]
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, 2); // Show only 2 latest posts

  // Get posts for random category, excluding those already shown in latest
  const latestPostIds = new Set(latestPosts.map(post => post._id));
  const randomCategoryPosts = randomCategory 
    ? posts
        .filter(post =>
          !latestPostIds.has(post._id) && // Exclude posts already in latest
          post.categories.some(cat => cat.title === randomCategory)
        )
        .slice(0, 2)
    : [];

  // If random category doesn't have enough unique posts, try another category
  useEffect(() => {
    if (categories.length > 0 && randomCategoryPosts.length === 0 && randomCategory) {
      // Find a category that has posts not already in latest
      const availableCategories = categories.filter(category => {
        const categoryPosts = posts.filter(post =>
          !latestPostIds.has(post._id) &&
          post.categories.some(cat => cat.title === category)
        );
        return categoryPosts.length > 0;
      });

      if (availableCategories.length > 0) {
        const randomIndex = Math.floor(Math.random() * availableCategories.length);
        setRandomCategory(availableCategories[randomIndex]);
      }
    }
  }, [categories, randomCategory, posts, latestPostIds, randomCategoryPosts.length]);

  // Select random category when categories are loaded
  useEffect(() => {
    if (categories.length > 0 && !randomCategory) {
      // Find categories that have posts not in latest
      const availableCategories = categories.filter(category => {
        const categoryPosts = posts.filter(post =>
          !latestPostIds.has(post._id) &&
          post.categories.some(cat => cat.title === category)
        );
        return categoryPosts.length > 0;
      });

      if (availableCategories.length > 0) {
        const randomIndex = Math.floor(Math.random() * availableCategories.length);
        setRandomCategory(availableCategories[randomIndex]);
      }
    }
  }, [categories, randomCategory, posts, latestPostIds]);

  // Animation effects
  useEffect(() => {
    if (!isLoading && sectionRef.current) {
      const tl = gsap.timeline();

      // Header animation
      if (headerRef.current) {
        gsap.set(headerRef.current, { opacity: 0, y: 30 });
        tl.to(headerRef.current, {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power3.out"
        });
      }

      // Content animation
      if (contentRef.current) {
        const sections = contentRef.current.querySelectorAll('.news-category-section');
        gsap.set(sections, { opacity: 0, y: 30 });
        tl.to(sections, {
          opacity: 1,
          y: 0,
          duration: 0.6,
          stagger: 0.2,
          ease: "power2.out"
        }, "-=0.4");
      }
    }
  }, [isLoading, posts]);

  // Fetch posts
  useEffect(() => {
    async function fetchPosts() {
      setIsLoading(true);
      try {
        const data = await client.fetch<Post[]>(ALL_POSTS_QUERY);
        setPosts(data);

        // Extract unique categories
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

  if (isLoading) {
    return (
      <section className="py-16 px-4 md:px-8 lg:px-16 max-w-7xl mx-auto">
        <div className="flex items-center justify-center py-16">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 border-4 border-gray-200 dark:border-gray-800 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-transparent border-t-[#EF3866] rounded-full animate-spin"></div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section ref={sectionRef} className="py-16 px-4 md:px-2 lg:px-2 max-w-7xl mx-auto bg-white dark:bg-gray-900/20">
      {/* Section Header */}
      <div ref={headerRef} className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-light text-gray-900 dark:text-white mb-6 tracking-tight">
          Latest News & Insights
        </h2>
        
        {/* Accent line */}
        <div className="w-24 h-0.5 bg-[#EF3866] mx-auto mb-6"></div>
        
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto font-light leading-relaxed">
          Stay updated with our curated selection of news and expert insights
        </p>
      </div>

      {/* News Content Grid */}
      <div ref={contentRef} className="space-y-8">
        {/* Latest News and Random Category Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Latest News Section */}
          <div className="news-category-section">
            <HomeCategorySection
              title="Latest News"
              posts={latestPosts}
              icon={<TrendingUp className="w-5 h-5 text-[#EF3866]" />}
            />
          </div>

          {/* Random Category Section */}
          {randomCategory && randomCategoryPosts.length > 0 && (
            <div className="news-category-section">
              <HomeCategorySection
                title={randomCategory}
                posts={randomCategoryPosts}
                icon={<Newspaper className="w-5 h-5 text-[#EF3866]" />}
              />
            </div>
          )}
        </div>

        {/* Show More Button */}
        <div className="flex justify-center mt-12">
          <Link 
            href="/blog"
            className="group inline-flex items-center gap-3 border border-[#EF3866] bg-white dark:bg-black text-[#EF3866] hover:bg-[#ffe6ec] dark:hover:bg-[#1a1a1a] font-medium px-8 py-4 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
          >
            <span>Explore All News</span>
            <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>

        {/* News Stats */}
        <div className="border-t border-gray-200 dark:border-gray-800 pt-8 mt-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="space-y-2">
              <p className="text-2xl md:text-3xl font-bold text-[#EF3866]">
                {posts.length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                Total Articles
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-2xl md:text-3xl font-bold text-[#EF3866]">
                {categories.length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                Categories
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-2xl md:text-3xl font-bold text-[#EF3866]">
                {latestPosts.length > 0 
                  ? new Date(latestPosts[0].publishedAt).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    })
                  : '---'
                }
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                Latest Update
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomeNewsSection;