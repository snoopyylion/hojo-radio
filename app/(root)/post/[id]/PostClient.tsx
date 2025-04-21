"use client";
import { client } from '@/sanity/lib/client';
import { notFound } from 'next/navigation';
import { PortableText } from '@portabletext/react';
import type { PortableTextReactComponents } from '@portabletext/react';
import Image from 'next/image';
import { formatDate } from "@/lib/utils";
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import CommentSection from '@/components/CommentSection';

// Define interfaces for type safety
interface PostImage {
  asset: {
    url: string;
  };
  alt?: string;
}

interface Author {
  name: string;
  bio?: string;
  image?: {
    asset: {
      url: string;
    };
  };
  imageUrl?: string;
}

interface RelatedPost {
  _id: string;
  title: string;
  slug: {
    current: string;
  };
}

interface Post {
  _id: string;
  title: string;
  slug: {
    current: string;
  };
  publishedAt?: string;
  _createdAt?: string;
  description?: string;
  mainImage?: PostImage;
  author?: Author;
  categories?: {
    title: string;
  }[];
  body: any; // This will be typed properly below
  nextPost?: RelatedPost;
  prevPost?: RelatedPost;
}

interface PostClientProps {
  id: string;
}

const ptComponents: Partial<PortableTextReactComponents> = {
  types: {
    image: ({ value }) => {
      if (!value?.asset?.url) return null;
      return (
        <div className="relative w-full aspect-video my-6">
          <Image
            src={value.asset.url}
            alt={value.alt || 'Post image'}
            fill
            className="object-cover rounded-xl shadow-md"
          />
        </div>
      );
    },
  },
  marks: {
    link: ({ children, value }) => {
      const rel = value?.href && !value.href.startsWith('/') ? 'noreferrer noopener' : undefined;
      return (
        <a href={value?.href || '#'} rel={rel} className="text-[#EF3866] font-medium hover:underline">
          {children}
        </a>
      );
    },
  },
};

export default function PostClient({ id }: PostClientProps) {
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNavigation, setShowNavigation] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [lastScrollY, setLastScrollY] = useState(0);
  const router = useRouter();
  
  // New state to track scroll boundaries
  const [atTop, setAtTop] = useState(true);
  const [atBottom, setAtBottom] = useState(false);
  const [scrollAttempt, setScrollAttempt] = useState<'none' | 'up' | 'down'>('none');
  const scrollAttemptTimer = useRef<NodeJS.Timeout | null>(null);
  const [scrollIntent, setScrollIntent] = useState<'none' | 'up' | 'down'>('none');
  const scrollIntentConfirmed = useRef(false);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        // If id is undefined or empty, throw error to prevent unnecessary API call
        if (!id) {
          throw new Error("Missing post ID");
        }
        
        const fetchedPost = await client.fetch<Post>(
          `*[_type == "post" && _id == $id][0]{
            _id, title, slug, description, body, publishedAt, _createdAt,
            mainImage{ asset->{url}, alt },
            "author": author->{ name, bio, image{asset->{url}}, "imageUrl": image.asset->url },
            categories[]->{title},
            "nextPost": *[_type == "post" && publishedAt > ^.publishedAt] | order(publishedAt asc)[0]{ _id, title, slug },
            "prevPost": *[_type == "post" && publishedAt < ^.publishedAt] | order(publishedAt desc)[0]{ _id, title, slug }
          }`,
          { id }
        );
        
        if (!fetchedPost) {
          notFound();
        }
        setPost(fetchedPost);
      } catch (error) {
        console.error("Failed to fetch post:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPost();
  }, [id]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
    
      // Show navigation hint if user scrolls down
      setShowNavigation(currentScrollY > 200);
    
      const isAtTop = currentScrollY < 50;
      const isAtBottom = (window.innerHeight + currentScrollY) >= document.body.offsetHeight - 50;
    
      setAtTop(isAtTop);
      setAtBottom(isAtBottom);
    
      if (isAtTop && currentScrollY < lastScrollY) {
        if (scrollIntent === 'up' && scrollIntentConfirmed.current && post?.prevPost?._id) {
          router.push(`/post/${post.prevPost._id}`);
          scrollIntentConfirmed.current = false;
          setScrollIntent('none');
        } else {
          setScrollIntent('up');
          scrollIntentConfirmed.current = true;
        }
      } else if (isAtBottom && currentScrollY > lastScrollY) {
        if (scrollIntent === 'down' && scrollIntentConfirmed.current && post?.nextPost?._id) {
          router.push(`/post/${post.nextPost._id}`);
          scrollIntentConfirmed.current = false;
          setScrollIntent('none');
        } else {
          setScrollIntent('down');
          scrollIntentConfirmed.current = true;
        }
      } else {
        if (scrollIntent !== 'none') {
          setScrollIntent('none');
          scrollIntentConfirmed.current = false;
        }
      }
    
      setLastScrollY(currentScrollY);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY, post, router]);

  // Handle navigation when user tries to scroll beyond boundaries
  useEffect(() => {
    if (scrollAttempt === 'none') return;
    
    // Clear any existing timer
    if (scrollAttemptTimer.current) {
      clearTimeout(scrollAttemptTimer.current);
    }
    
    // Set a timer to navigate if user continues the scrolling attempt
    scrollAttemptTimer.current = setTimeout(() => {
      if (scrollAttempt === 'down' && atBottom && post?.nextPost?._id) {
        router.push(`/post/${post.nextPost._id}`);
      } else if (scrollAttempt === 'up' && atTop && post?.prevPost?._id) {
        router.push(`/post/${post.prevPost._id}`);
      }
      setScrollAttempt('none');
    }, 600); // Slightly shorter delay for better responsiveness
    
    return () => {
      if (scrollAttemptTimer.current) {
        clearTimeout(scrollAttemptTimer.current);
      }
    };
  }, [scrollAttempt, atTop, atBottom, post, router]);

  // Determine content type
  const isPortableText = post?.body && typeof post.body === 'object' && Array.isArray(post.body);
  const isMarkdown = post?.body && typeof post.body === 'string';

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="h-10 w-64 bg-gray-300 dark:bg-gray-600 rounded mb-8"></div>
          <div className="h-48 w-full max-w-md bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!post) return notFound();

  return (
    <div className="bg-white dark:bg-black transition-colors duration-300 min-h-screen" ref={scrollRef}>
      {/* Scroll Indicators - Only show when actively trying to scroll beyond */}
      {scrollAttempt === 'down' && atBottom && post?.nextPost && (
        <div className="fixed bottom-0 inset-x-0 bg-gradient-to-t from-[#EF3866]/80 to-transparent h-24 z-40 flex items-end justify-center pb-4 text-white">
          <div className="animate-bounce flex flex-col items-center">
            <ChevronDown size={24} />
            <p className="text-sm font-medium">Next Post</p>
          </div>
        </div>
      )}
      
      {scrollAttempt === 'up' && atTop && post?.prevPost && (
        <div className="fixed top-0 inset-x-0 bg-gradient-to-b from-[#EF3866]/80 to-transparent h-24 z-40 flex items-start justify-center pt-4 text-white">
          <div className="animate-bounce flex flex-col items-center">
            <ChevronUp size={24} />
            <p className="text-sm font-medium">Previous Post</p>
          </div>
        </div>
      )}

      {/* Hero Section with parallax effect */}
      <section className="pt-[120px] md:pt-[150px] bg-gradient-to-r from-pink-100 via-white to-purple-100 dark:from-pink-950 dark:via-gray-950 dark:to-purple-950 py-16 text-center px-4 md:px-10 transition-colors duration-300 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-5"></div>
        <div className="relative z-10">
          <p className="uppercase text-sm text-gray-500 dark:text-gray-400 tracking-widest transition-colors">
            {formatDate(post.publishedAt || post._createdAt || '')}
          </p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 dark:text-white mt-4 transition-colors leading-tight">
            {post.title}
          </h1>
          {post.description && (
            <p className="mt-4 max-w-2xl mx-auto text-base md:text-lg text-gray-600 dark:text-gray-300 transition-colors">
              {post.description}
            </p>
          )}
        </div>
      </section>

      {/* Floating Action Buttons */}
      <div className="sticky top-4 z-30 mt-6 flex justify-center gap-3 md:gap-4 flex-wrap px-4">
        <div className="flex gap-3 md:gap-4 backdrop-blur-md bg-white/70 dark:bg-black/70 p-2 rounded-full shadow-lg border border-gray-100 dark:border-gray-800">
          {[
            { label: 'Like', icon: '❤️', color: 'bg-[#EF3866]' },
            { label: 'Share', icon: '🔗', color: 'bg-blue-500' },
            { label: 'Save', icon: '⭐', color: 'bg-yellow-500' },
            { label: 'Listen', icon: '🔊', color: 'bg-purple-600' },
          ].map(({ label, icon, color }) => (
            <button
              key={label}
              className={`${color} text-white px-4 py-2 rounded-full hover:brightness-110 transition flex items-center gap-2 shadow-md text-sm md:text-base`}
            >
              <span className="md:block">{icon}</span> <span className="hidden md:block">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Post Section */}
      <section className="px-4 md:px-10 py-10 max-w-4xl mx-auto">
        {post.mainImage?.asset?.url && (
          <div className="w-full aspect-video relative rounded-xl overflow-hidden shadow-xl mb-12 group">
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent z-10"></div>
            <Image
              src={post.mainImage.asset.url}
              alt={post.mainImage.alt || post.title}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
              priority
            />
          </div>
        )}

        {/* Author + Category */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
          {post.author && (
            <div className="flex items-center gap-4">
              {post.author.imageUrl || post.author.image?.asset?.url ? (
                <div className="relative">
                  <Image
                    src={post.author.imageUrl || post.author.image?.asset?.url || '/placeholder-avatar.png'}
                    alt={post.author.name || "Author"}
                    width={60}
                    height={60}
                    className="rounded-full border-2 border-[#EF3866] object-cover shadow-md"
                  />
                  <span className="absolute bottom-0 right-0 bg-green-500 h-3 w-3 rounded-full border-2 border-white dark:border-black"></span>
                </div>
              ) : (
                <div className="w-[60px] h-[60px] rounded-full bg-gradient-to-br from-[#EF3866] to-pink-400 flex items-center justify-center text-white text-lg font-bold">
                  {post.author.name?.charAt(0) || "A"}
                </div>
              )}
              <div>
                <p className="font-semibold text-lg text-gray-900 dark:text-white transition-colors">
                  {post.author.name}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 transition-colors">
                  @{post.author.name?.toLowerCase().replace(/\s+/g, '')}
                </p>
              </div>
            </div>
          )}
          {post.categories && post.categories.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {post.categories.map(category => (
                <span key={category.title} className="inline-block bg-[#fce7f3] dark:bg-[#4c1d38] text-[#d7325a] dark:text-[#ff5e8a] text-sm font-medium px-4 py-1 rounded-full shadow-sm transition-colors">
                  {category.title}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Post Content */}
        <div className="bg-white dark:bg-gray-800/50 backdrop-blur-sm p-6 md:p-8 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 transition-colors">
          <div className="text-gray-800 dark:text-gray-200 prose prose-p:leading-7 prose-headings:font-bold prose-img:rounded-xl max-w-none prose-a:text-[#EF3866] dark:prose-a:text-[#ff7a9c] dark:prose-headings:text-white dark:prose-p:text-gray-300 dark:prose-strong:text-white dark:prose-li:text-gray-300 transition-colors">
            {isPortableText && (
              <PortableText value={post.body} components={ptComponents} />
            )}
            {isMarkdown && (
              <ReactMarkdown>{post.body}</ReactMarkdown>
            )}
            {!isPortableText && !isMarkdown && (
              <p className="text-center text-gray-400 dark:text-gray-500 italic transition-colors">
                No content available.
              </p>
            )}
          </div>
        </div>
        
        {/* Discussion Section */}
        <div className="mt-8 bg-white dark:bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 transition-colors">
          <CommentSection postId={post._id} />
        </div>
      </section>
      
      {/* Previous/Next Post Navigation */}
      <div className={`fixed z-30 inset-y-0 right-0 flex items-center transform transition-transform duration-300 ${showNavigation ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="bg-white/80 dark:bg-black/80 backdrop-blur-sm p-3 rounded-l-lg shadow-lg border border-r-0 border-gray-200 dark:border-gray-700 flex flex-col gap-4">
          {post.prevPost && (
            <Link href={`/post/${post.prevPost._id}`} className="bg-gray-100 dark:bg-gray-800 hover:bg-[#EF3866] hover:text-white text-gray-700 dark:text-gray-300 p-3 rounded-full transition-colors flex items-center justify-center">
              <ChevronUp size={20} />
            </Link>
          )}
          {post.nextPost && (
            <Link href={`/post/${post.nextPost._id}`} className="bg-gray-100 dark:bg-gray-800 hover:bg-[#EF3866] hover:text-white text-gray-700 dark:text-gray-300 p-3 rounded-full transition-colors flex items-center justify-center">
              <ChevronDown size={20} />
            </Link>
          )}
        </div>
      </div>

      {/* Bottom Navigation Bar */}
      <div className="sticky bottom-0 inset-x-0 bg-white/80 dark:bg-black/80 backdrop-blur-md shadow-lg border-t border-gray-200 dark:border-gray-800 p-4 z-20">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          {post.prevPost ? (
            <Link href={`/post/${post.prevPost._id}`} className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-[#EF3866] dark:hover:text-[#EF3866] transition-colors">
              <ChevronLeft size={18} />
              <span className="hidden sm:inline">Previous</span>
            </Link>
          ) : (
            <div className="w-24"></div>
          )}
          
          <div className="flex space-x-6">
            <button className="text-gray-700 dark:text-gray-300 hover:text-[#EF3866] dark:hover:text-[#EF3866] transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
              </svg>
            </button>
            <button className="text-gray-700 dark:text-gray-300 hover:text-[#EF3866] dark:hover:text-[#EF3866] transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
            </button>
            <button className="text-gray-700 dark:text-gray-300 hover:text-[#EF3866] dark:hover:text-[#EF3866] transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
            </button>
          </div>
          
          {post.nextPost ? (
            <Link href={`/post/${post.nextPost._id}`} className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-[#EF3866] dark:hover:text-[#EF3866] transition-colors">
              <span className="hidden sm:inline">Next</span>
              <ChevronRight size={18} />
            </Link>
          ) : (
            <div className="w-24"></div>
          )}
        </div>
      </div>
    </div>
  );
}