'use client'
import TrendingSection from '@/components/home/Blog/TrendingSection';
import React, { useEffect, useState, useCallback } from 'react'
import BlogTile from '@/components/home/Blog/BlogTile';
import { client } from "@/sanity/lib/client";
import { groq } from "next-sanity";

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
        supabaseUserId: string;
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

const POSTS_PER_PAGE = 6;

const Page = () => {
    const [darkMode, setDarkMode] = useState(false);
    const [posts, setPosts] = useState<Post[]>([]);
    const [displayedPosts, setDisplayedPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMorePosts, setHasMorePosts] = useState(true);

    useEffect(() => {
        // Check system preference
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setDarkMode(isDark);

        // Listen for system theme changes
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (e: MediaQueryListEvent) => setDarkMode(e.matches);
        mediaQuery.addEventListener('change', handleChange);

        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    // Load more posts function - Fixed to prevent disappearing posts
    const loadMorePosts = useCallback(() => {
        if (isLoadingMore || !hasMorePosts) return;

        setIsLoadingMore(true);

        setTimeout(() => {
            const startIndex = displayedPosts.length; // Use current displayed posts length
            const endIndex = startIndex + POSTS_PER_PAGE;

            const newPosts = posts.slice(startIndex, endIndex);

            if (newPosts.length === 0) {
                setHasMorePosts(false);
            } else {
                setDisplayedPosts(prev => [...prev, ...newPosts]);

                // Check if we've loaded all posts
                if (endIndex >= posts.length) {
                    setHasMorePosts(false);
                }
            }

            setIsLoadingMore(false);
        }, 800);
    }, [posts, displayedPosts, isLoadingMore, hasMorePosts]);

    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // Fetch posts from Sanity
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
          author->{ name, image, supabaseUserId },
          categories[]->{ title }
        }`;

                const data = await client.fetch<Post[]>(optimizedQuery);

                if (isMounted) {
                    setPosts(data);
                    // Initially load first batch of posts
                    const initialPosts = data.slice(0, POSTS_PER_PAGE);
                    setDisplayedPosts(initialPosts);
                    setHasMorePosts(data.length > POSTS_PER_PAGE);
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
          author->{ name, image, supabaseUserId },
          categories[]->{ title }
        }`
            )
            .subscribe((update) => {
                if (!isMounted) return;

                const { result, documentId, mutations } = update;

                if (mutations.some(m => 'create' in m)) {
                    if (result && isPost(result)) {
                        setPosts(prevPosts => {
                            const newPosts = [result, ...prevPosts];
                            setDisplayedPosts(prev => [result, ...prev.slice(0, POSTS_PER_PAGE - 1)]);
                            return newPosts;
                        });
                    }
                } else if (mutations.some(m => 'delete' in m)) {
                    setPosts(prevPosts => prevPosts.filter(post => post._id !== documentId));
                    setDisplayedPosts(prevPosts => prevPosts.filter(post => post._id !== documentId));
                } else {
                    if (result && isPost(result)) {
                        setPosts(prevPosts =>
                            prevPosts.map(post => post._id === result._id ? result : post)
                        );
                        setDisplayedPosts(prevPosts =>
                            prevPosts.map(post => post._id === result._id ? result : post)
                        );
                    }
                }
            });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, []);

    if (isLoading) {
        return (
            <div className={darkMode ? 'dark' : ''}>
                <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
                    <div className="w-full max-w-4xl space-y-6">
                        {[...Array(3)].map((_, i) => (
                            <div
                                key={i}
                                className="rounded-2xl bg-white dark:bg-gray-900 shadow-sm p-4 flex gap-4 animate-[pulse_2s_ease-in-out_infinite]"
                            >
                                {/* Thumbnail */}
                                <div className="w-32 h-24 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>

                                {/* Text content */}
                                <div className="flex-1 space-y-3 py-2">
                                    <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4"></div>
                                    <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/2"></div>
                                    <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-full"></div>

                                    {/* Author row */}
                                    <div className="flex items-center gap-3 mt-2">
                                        <div className="w-8 h-8 bg-gray-200 dark:bg-gray-800 rounded-full"></div>
                                        <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/4"></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }


    return (
        <div className={darkMode ? 'dark' : ''}>
            <div className="h-screen bg-white dark:bg-gray-950 flex flex-col">
                {/* Main Content - Fixed height with flex */}
                <main className="flex-1 max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 sm:py-4 flex gap-8 overflow-hidden">
                    {/* Blog Posts Section - Scrollable */}
                    <div className="flex-1 lg:flex-[2] flex flex-col">
                        <div className="flex-1 overflow-y-auto pr-2">
                            <div className="space-y-6">
                                {displayedPosts.map(post => (
                                    <div key={post._id} className="transform transition-all duration-200 hover:scale-[1.02]">
                                        <BlogTile post={post} />
                                    </div>
                                ))}
                            </div>

                            {/* Load More Button - Minimalistic design with EF3866 */}
                            {hasMorePosts && (
                                <div className="flex justify-center pt-8 pb-8">
                                    <button
                                        onClick={loadMorePosts}
                                        disabled={isLoadingMore}
                                        className={`
                                            border-2 border-[#EF3866] text-[#EF3866] 
                                            px-6 py-3 rounded-lg font-medium 
                                            hover:bg-[#EF3866] hover:text-white
                                            dark:text-white dark:border-white dark:hover:bg-white dark:hover:text-black
                                            transition-all duration-300
                                            disabled:opacity-50 disabled:cursor-not-allowed
                                            min-w-[140px] flex items-center justify-center
                                        `}
                                    >
                                        {isLoadingMore ? (
                                            <div className="flex items-center gap-2">
                                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                                <span>Loading</span>
                                            </div>
                                        ) : (
                                            <span>Load More</span>
                                        )}
                                    </button>
                                </div>
                            )}

                            {/* End message when no more posts */}
                            {!hasMorePosts && displayedPosts.length > 0 && (
                                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                    <p className="text-sm">You&#39;ve reached the end!</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Trending Section - Fixed height sidebar */}
                    <aside className="lg:w-80 hidden lg:block">
                        {/* Publication date */}
                        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 tracking-widest uppercase mb-2">
                            {formattedDate}
                        </div>
                        <div className="h-full">
                            <TrendingSection />
                        </div>
                    </aside>
                </main>

                {/* Mobile blog Section */}
                <div className="lg:hidden px-4 sm:px-6 pb-8">
                    {/* Publication date */}
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 tracking-widest uppercase mb-2">
                            {formattedDate}
                        </div>
                    <div className="bg-white dark:bg-black rounded-2xl shadow-sm">
                        <div className="space-y-2">
                            {displayedPosts.map(post => (
                                <div key={post._id} className="transform transition-all duration-200 hover:scale-[1.02]">
                                    <BlogTile post={post} />
                                </div>
                            ))}
                        </div>
                        {/* Load More Button - Minimalistic design with EF3866 */}
                        {hasMorePosts && (
                            <div className="flex justify-center pt-12 pb-8">
                                <button
                                    onClick={loadMorePosts}
                                    disabled={isLoadingMore}
                                    className={`
                                            border-2 border-[#EF3866] text-[#EF3866] 
                                            px-6 py-3 rounded-lg font-medium 
                                            hover:bg-[#EF3866] hover:text-white
                                            dark:text-white dark:border-white dark:hover:bg-white dark:hover:text-black
                                            transition-all duration-300
                                            disabled:opacity-50 disabled:cursor-not-allowed
                                            min-w-[140px] flex items-center justify-center
                                        `}
                                >
                                    {isLoadingMore ? (
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                            <span>Loading</span>
                                        </div>
                                    ) : (
                                        <span>Load More</span>
                                    )}
                                </button>
                            </div>
                        )}

                        {/* End message when no more posts */}
                        {!hasMorePosts && displayedPosts.length > 0 && (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                <p className="text-sm">You&#39;ve reached the end!</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Page