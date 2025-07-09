import { client } from '@/sanity/lib/client';
import { notFound } from 'next/navigation';
import { PortableText } from '@portabletext/react';
import type { PortableTextReactComponents } from '@portabletext/react';
import Image from 'next/image';
import { formatDate } from "@/lib/utils";
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import Link from 'next/link';
import { useEffect, useRef, useState, useCallback } from 'react';
import { ChevronUp, ChevronLeft, ChevronRight, Heart, Bookmark, Share2, Clock, Eye, MessageCircle } from 'lucide-react';
import CommentSection from '@/components/CommentSection';
import type { PortableTextBlock } from '@portabletext/types';
import { useLikes } from '../../../../hooks/likes/useLikes';
import { useUserLikes } from '../../../../hooks/user-likes/useUserLikes';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';


// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

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
  // Add these fields to get the Supabase user ID for navigation
  _id?: string; // Sanity author ID
  supabaseUserId?: string; // The actual user ID we need for navigation
}

interface RelatedPost {
  _id: string;
  title: string;
  slug: {
    current: string;
  };
}

interface BookmarkState {
  isBookmarked: boolean;
  bookmarkCount: number;
  isBookmarkLoading: boolean;
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
  body: PortableTextBlock[] | string | null;
  nextPost?: RelatedPost;
  prevPost?: RelatedPost;
}

interface PostClientProps {
  id: string;
}

// ... (keep all your existing markdownComponents and ptComponents code exactly the same)
const markdownComponents: Components = {
  h1: ({ children, ...props }) => (
    <h1 {...props} className="text-3xl md:text-4xl font-light text-gray-900 dark:text-white mb-8 mt-12 first:mt-0 leading-tight">
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2 {...props} className="text-2xl md:text-3xl font-light text-gray-900 dark:text-white mb-6 mt-10 first:mt-0 leading-tight">
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3 {...props} className="text-xl md:text-2xl font-light text-gray-900 dark:text-white mb-4 mt-8 first:mt-0 leading-tight">
      {children}
    </h3>
  ),
  h4: ({ children, ...props }) => (
    <h4 {...props} className="text-lg md:text-xl font-medium text-gray-900 dark:text-white mb-3 mt-6 first:mt-0">
      {children}
    </h4>
  ),
  h5: ({ children, ...props }) => (
    <h5 {...props} className="text-base md:text-lg font-medium text-gray-900 dark:text-white mb-2 mt-4 first:mt-0">
      {children}
    </h5>
  ),
  h6: ({ children, ...props }) => (
    <h6 {...props} className="text-sm md:text-base font-medium text-gray-900 dark:text-white mb-2 mt-4 first:mt-0">
      {children}
    </h6>
  ),
  p: ({ node, children, ...props }) => {
    // Check if the paragraph contains only an image
    const hasOnlyImage = node?.children?.length === 1 &&
      node.children[0]?.type === 'element' &&
      node.children[0]?.tagName === 'img';

    if (hasOnlyImage) {
      return <div className="my-8 first:mt-0">{children}</div>;
    }

    return (
      <p {...props} className="mb-6 text-gray-800 dark:text-gray-200 leading-relaxed text-lg md:text-xl font-light">
        {children}
      </p>
    );
  },

  img: ({ src, alt, ...props }) => (
    <div className="my-8 first:mt-0">
      <div className="relative w-full">
        <img
          {...props}
          src={src}
          alt={alt || 'Content image'}
          className="w-full h-auto rounded-lg shadow-sm"
        />
      </div>
      {alt && (
        <div className="text-sm text-gray-500 dark:text-gray-400 mt-3 text-center italic">
          {alt}
        </div>
      )}
    </div>
  ),

  blockquote: ({ children, ...props }) => (
    <blockquote {...props} className="my-8 pl-6 border-l-4 border-[#EF3866] dark:border-[#ff7a9c] italic text-lg md:text-xl text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/30 py-4 pr-4 rounded-r-lg">
      {children}
    </blockquote>
  ),
  ul: ({ children, ...props }) => (
    <ul {...props} className="mb-6 pl-6 space-y-2 text-gray-800 dark:text-gray-200 text-lg md:text-xl leading-relaxed">
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol {...props} className="mb-6 pl-6 space-y-2 text-gray-800 dark:text-gray-200 text-lg md:text-xl leading-relaxed list-decimal">
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => (
    <li {...props} className="mb-2 text-gray-800 dark:text-gray-200 leading-relaxed">
      {children}
    </li>
  ),
  strong: ({ children, ...props }) => (
    <strong {...props} className="font-semibold text-[#EF3866] dark:text-[#ff7a9c]">
      {children}
    </strong>
  ),
  em: ({ children, ...props }) => (
    <em {...props} className="italic text-gray-700 dark:text-gray-300">
      {children}
    </em>
  ),
  code: ({ children, className, ...props }) => {
    const isInline = !className?.includes('language-');

    if (isInline) {
      return (
        <code {...props} className="bg-gray-100 dark:bg-gray-800 text-[#EF3866] dark:text-[#ff7a9c] px-2 py-1 rounded text-sm font-mono">
          {children}
        </code>
      );
    }

    return (
      <code {...props} className={`${className || ''} block bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 p-4 rounded-lg overflow-x-auto text-sm font-mono`}>
        {children}
      </code>
    );
  },
  pre: ({ children, ...props }) => (
    <pre {...props} className="mb-6 bg-gray-100 dark:bg-gray-800 p-6 rounded-lg overflow-x-auto border border-gray-200 dark:border-gray-700">
      {children}
    </pre>
  ),
  a: ({ href, children, ...props }) => (
    <a
      {...props}
      href={href}
      className="text-[#EF3866] dark:text-[#ff7a9c] font-medium hover:underline transition-colors underline-offset-2"
      target={href?.startsWith('http') ? '_blank' : undefined}
      rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
    >
      {children}
    </a>
  ),
  hr: (props) => (
    <hr {...props} className="my-12 border-0 h-px bg-gray-200 dark:bg-gray-700" />
  ),
  table: ({ children, ...props }) => (
    <div className="overflow-x-auto my-8">
      <table {...props} className="min-w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }) => (
    <thead {...props} className="bg-gray-50 dark:bg-gray-700">
      {children}
    </thead>
  ),
  tbody: ({ children, ...props }) => (
    <tbody {...props} className="divide-y divide-gray-200 dark:divide-gray-600">
      {children}
    </tbody>
  ),
  tr: ({ children, ...props }) => (
    <tr {...props} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
      {children}
    </tr>
  ),
  th: ({ children, ...props }) => (
    <th {...props} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td {...props} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
      {children}
    </td>
  ),
};

const ptComponents: Partial<PortableTextReactComponents> = {
  types: {
    image: ({ value }) => {
      if (!value?.asset?.url) return null;
      return (
        <div className="my-12 first:mt-0">
          <div className="relative w-full aspect-video">
            <Image
              src={value.asset.url}
              alt={value.alt || 'Post image'}
              fill
              className="object-cover"
            />
          </div>
          {value.alt && (
            <figcaption className="text-sm text-gray-500 dark:text-gray-400 mt-3 text-center italic">
              {value.alt}
            </figcaption>
          )}
        </div>
      );
    },
  },
  marks: {
    link: ({ children, value }) => {
      const rel = value?.href && !value.href.startsWith('/') ? 'noreferrer noopener' : undefined;
      return (
        <a
          href={value?.href || '#'}
          rel={rel}
          className="text-[#EF3866] dark:text-[#ff7a9c] font-medium hover:underline transition-colors underline-offset-2"
        >
          {children}
        </a>
      );
    },
  },
  block: {
    normal: ({ children }) => (
      <p className="mb-6 text-gray-800 dark:text-gray-200 leading-relaxed text-lg">
        {children}
      </p>
    ),
    h1: ({ children }) => (
      <h1 className="text-3xl md:text-4xl font-light text-gray-900 dark:text-white mb-8 mt-12 first:mt-0">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-2xl md:text-3xl font-light text-gray-900 dark:text-white mb-6 mt-10 first:mt-0">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-xl md:text-2xl font-light text-gray-900 dark:text-white mb-4 mt-8 first:mt-0">
        {children}
      </h3>
    ),
    blockquote: ({ children }) => (
      <blockquote className="my-8 pl-6 border-l-2 border-[#EF3866] dark:border-[#ff7a9c] italic text-lg text-gray-700 dark:text-gray-300">
        {children}
      </blockquote>
    ),
  },
};

export default function PostClient({ id }: PostClientProps) {
  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);
  const [estimatedReadTime, setEstimatedReadTime] = useState(0);
  const [bookmarkState, setBookmarkState] = useState<BookmarkState>({
    isBookmarked: false,
    bookmarkCount: 0,
    isBookmarkLoading: false,
  });

  const { likeCount, hasLiked, toggleLike, loading, isSignedIn } = useLikes(id);
  const { refreshUserLikes } = useUserLikes();

  // Animation refs
  const heroRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const scrollTopRef = useRef<HTMLButtonElement>(null);

  // Scroll progress tracking
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY;
      const maxHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = Math.min((scrolled / maxHeight) * 100, 100);
      setReadingProgress(progress);
      setShowScrollTop(scrolled > 400);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // GSAP Animations
  useEffect(() => {
    if (!isLoading && post) {
      const tl = gsap.timeline();

      // Hero animation
      if (heroRef.current) {
        gsap.set(heroRef.current, { opacity: 0, y: 30 });
        tl.to(heroRef.current, {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power3.out"
        });
      }

      // Content fade in
      if (contentRef.current) {
        gsap.set(contentRef.current, { opacity: 0, y: 20 });
        tl.to(contentRef.current, {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: "power2.out"
        }, "-=0.4");
      }

      // Progress bar animation
      if (progressBarRef.current) {
        gsap.set(progressBarRef.current, { scaleX: 0, transformOrigin: "left" });
      }

      // Scroll top button
      if (scrollTopRef.current) {
        gsap.set(scrollTopRef.current, { scale: 0, rotation: -180 });
      }
    }
  }, [isLoading, post]);

  // Progress bar update
  useEffect(() => {
    if (progressBarRef.current) {
      gsap.to(progressBarRef.current, {
        scaleX: readingProgress / 100,
        duration: 0.1,
        ease: "none"
      });
    }
  }, [readingProgress]);

  // Scroll top button animation
  useEffect(() => {
    if (scrollTopRef.current) {
      if (showScrollTop) {
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
  }, [showScrollTop]);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        if (!id) {
          throw new Error("Missing post ID");
        }

        // Updated Sanity query to include the supabaseUserId field
        const fetchedPost = await client.fetch<Post>(
          `*[_type == "post" && _id == $id][0]{
            _id, title, slug, description, body, publishedAt, _createdAt,
            mainImage{ asset->{url}, alt },
            "author": author->{ 
              _id,
              name, 
              bio, 
              image{asset->{url}}, 
              "imageUrl": image.asset->url,
              supabaseUserId
            },
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

        // Calculate reading time
        const wordCount = (fetchedPost.body as string || '').split(' ').length;
        const readTime = Math.ceil(wordCount / 200); // Average reading speed
        setEstimatedReadTime(readTime);
      } catch (error) {
        console.error("Failed to fetch post:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPost();
  }, [id]);

  const handleLikeClick = async () => {
    await toggleLike();
    refreshUserLikes();
  };

  const scrollToTop = () => {
    gsap.to(window, {
      scrollTo: { y: 0 },
      duration: 1,
      ease: "power2.out"
    });
  };

  const handleShare = async () => {
    if (navigator.share && post) {
      try {
        await navigator.share({
          title: post.title,
          text: post.description,
          url: window.location.href,
        });
      } catch {
        // Fallback to copying URL
        navigator.clipboard.writeText(window.location.href);
      }
    } else {
      // Fallback to copying URL
      navigator.clipboard.writeText(window.location.href);
    }
  };

  useEffect(() => {
    const fetchBookmarkData = async () => {
      try {
        const response = await fetch(`/api/post/${id}/bookmark`);
        const data = await response.json();

        setBookmarkState(prev => ({
          ...prev,
          isBookmarked: data.hasBookmarked || false,
          bookmarkCount: data.bookmarkCount || 0,
        }));
      } catch (error) {
        console.error("Failed to fetch bookmark data:", error);
      }
    };

    if (id) {
      fetchBookmarkData();
    }
  }, [id]);

  // Replace your existing bookmark button handler with this:
  const handleBookmark = useCallback(async () => {
    if (bookmarkState.isBookmarkLoading) return;

    // Optimistic update
    const previousState = {
      isBookmarked: bookmarkState.isBookmarked,
      bookmarkCount: bookmarkState.bookmarkCount
    };

    setBookmarkState(prev => ({
      ...prev,
      isBookmarked: !prev.isBookmarked,
      bookmarkCount: prev.isBookmarked ? prev.bookmarkCount - 1 : prev.bookmarkCount + 1,
      isBookmarkLoading: true,
    }));

    try {
      const response = await fetch(`/api/post/${id}/bookmark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Update with server response
      setBookmarkState(prev => ({
        ...prev,
        isBookmarked: data.bookmarked || false,
        bookmarkCount: data.bookmarkCount || 0,
        isBookmarkLoading: false,
      }));
    } catch (error) {
      // Revert optimistic update on error
      setBookmarkState(prev => ({
        ...prev,
        isBookmarked: previousState.isBookmarked,
        bookmarkCount: previousState.bookmarkCount,
        isBookmarkLoading: false,
      }));
      console.error("Bookmark request failed:", error);
    }
  }, [id, bookmarkState.isBookmarked, bookmarkState.bookmarkCount, bookmarkState.isBookmarkLoading]);


  // Determine content type
  const isPortableText = post?.body && typeof post.body === 'object' && Array.isArray(post.body);
  const isMarkdown = post?.body && typeof post.body === 'string';

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

  if (!post) return notFound();

  return (
    <div className="min-h-screen bg-white dark:bg-black transition-colors duration-300">
      {/* Reading Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gray-100 dark:bg-gray-900 z-50">
        <div
          ref={progressBarRef}
          className="h-full bg-[#EF3866] dark:bg-[#ff7a9c] transform origin-left"
        />
      </div>

      {/* Minimal Header */}
      <header className="pt-[120px] pb-8 px-4 md:px-8 lg:px-16 max-w-4xl mx-auto">
        <div ref={heroRef}>
          {/* Categories */}
          {post.categories && post.categories.length > 0 && (
            <div className="mb-6">
              {post.categories.map((category, index) => (
                <span
                  key={category.title}
                  className="inline-block text-sm font-medium text-[#EF3866] dark:text-[#ff7a9c] mr-4"
                >
                  {index > 0 && <span className="text-gray-300 mr-4">•</span>}
                  {category.title}
                </span>
              ))}
            </div>
          )}

          {/* Title */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-light text-gray-900 dark:text-white mb-6 leading-tight tracking-tight">
            {post.title}
          </h1>

          {/* Subtitle */}
          {post.description && (
            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-8 font-light leading-relaxed">
              {post.description}
            </p>
          )}

          {/* Meta Information */}
          <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500 dark:text-gray-400 mb-8">
            <time className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {formatDate(post.publishedAt || post._createdAt || '')}
            </time>
            <span className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              {estimatedReadTime} min read
            </span>
          </div>

          {/* Author - UPDATED WITH CLICKABLE NAVIGATION */}
          {post.author && (
            <div className="pb-8 border-b border-gray-100 dark:border-gray-800">
              {post.author.supabaseUserId ? (
                // If we have a supabaseUserId, make it clickable
                <Link
                  href={`/user/${post.author.supabaseUserId || post.author._id || ''}`}
                  className="flex items-center gap-4 group hover:bg-gray-50 dark:hover:bg-gray-900/30 p-2 -m-2 rounded-lg transition-colors"
                >
                  {post.author.imageUrl || post.author.image?.asset?.url ? (
                    <Image
                      src={post.author.imageUrl || post.author.image?.asset?.url || '/placeholder-avatar.png'}
                      alt={post.author.name || "Author"}
                      width={48}
                      height={48}
                      className="rounded-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#EF3866] to-pink-400 flex items-center justify-center text-white font-medium group-hover:scale-105 transition-transform">
                      {post.author.name?.charAt(0) || "A"}
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white group-hover:text-[#EF3866] dark:group-hover:text-[#ff7a9c] transition-colors">
                      {post.author.name}
                    </p>
                    {post.author.bio && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {post.author.bio}
                      </p>
                    )}
                  </div>
                </Link>
              ) : (
                // If no supabaseUserId, display as non-clickable
                <div className="flex items-center gap-4">
                  {post.author.imageUrl || post.author.image?.asset?.url ? (
                    <Image
                      src={post.author.imageUrl || post.author.image?.asset?.url || '/placeholder-avatar.png'}
                      alt={post.author.name || "Author"}
                      width={48}
                      height={48}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#EF3866] to-pink-400 flex items-center justify-center text-white font-medium">
                      {post.author.name?.charAt(0) || "A"}
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {post.author.name}
                    </p>
                    {post.author.bio && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {post.author.bio}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Hero Image */}
      {post.mainImage?.asset?.url && (
        <div className="mb-12 px-4 md:px-8 lg:px-16">
          <div className="max-w-4xl mx-auto">
            <div className="w-full aspect-video relative">
              <Image
                src={post.mainImage.asset.url}
                alt={post.mainImage.alt || post.title}
                fill
                className="object-cover rounded-lg"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
                priority
              />
            </div>
            {post.mainImage.alt && (
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-3 text-center italic">
                {post.mainImage.alt}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <article className="px-4 md:px-8 lg:px-16 max-w-4xl mx-auto">
        <div ref={contentRef}>
          {/* Content */}
          <div className="max-w-none mb-16">
            {isPortableText && (
              <div className="[&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                <PortableText
                  value={post.body as PortableTextBlock[]}
                  components={ptComponents}
                />
              </div>
            )}
            {isMarkdown && (
              <div className="markdown-content [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                <ReactMarkdown
                  components={markdownComponents}
                >
                  {post.body as string}
                </ReactMarkdown>
              </div>
            )}
          </div>

          {/* Engagement Actions - Sticky */}
          <div className="sticky bottom-8 z-40 mb-16">
            <div className="flex justify-center">
              <div className="flex items-center gap-4 bg-white/90 dark:bg-black/90 backdrop-blur-md border border-gray-200 dark:border-gray-800 rounded-full px-6 py-3 shadow-lg">
                <button
                  onClick={handleLikeClick}
                  disabled={loading || !isSignedIn}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200 ${hasLiked
                    ? 'bg-red-50 text-red-600 hover:bg-red-100'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                    } ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
                  title={!isSignedIn ? 'Sign in to like posts' : hasLiked ? 'Unlike this post' : 'Like this post'}
                >
                  <Heart
                    className={`w-5 h-5 transition-all duration-200 ${hasLiked ? 'fill-current text-red-600' : 'text-gray-600 dark:text-gray-400'
                      }`}
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {loading ? '...' : likeCount}
                  </span>
                </button>

                <button
                  onClick={handleBookmark}
                  disabled={bookmarkState.isBookmarkLoading}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200 ${bookmarkState.isBookmarked
                      ? 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                    } ${bookmarkState.isBookmarkLoading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
                  title={bookmarkState.isBookmarked ? 'Remove from saved' : 'Save for later'}
                >
                  <Bookmark
                    className={`w-5 h-5 transition-all duration-200 ${bookmarkState.isBookmarked ? 'fill-current text-yellow-600' : 'text-gray-600 dark:text-gray-400'
                      } ${bookmarkState.isBookmarkLoading ? 'animate-pulse' : ''}`}
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {bookmarkState.isBookmarkLoading ? '...' : (bookmarkState.isBookmarked ? 'Saved' : 'Save')}
                  </span>
                </button>

                <button
                  onClick={handleShare}
                  className="p-2 rounded-full text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 hover:scale-105"
                  title="Share this post"
                >
                  <Share2 className="w-5 h-5" />
                </button>

                <a
                  href="#comments"
                  className="p-2 rounded-full text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 hover:scale-105"
                  title="Jump to comments"
                >
                  <MessageCircle className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>

          {/* Comments Section */}
          <section id="comments" className="border-t border-gray-100 dark:border-gray-800 pt-12">
            <h2 className="text-2xl md:text-3xl font-light text-gray-900 dark:text-white mb-8">
              Discussion
            </h2>
            <CommentSection postId={post._id} />
          </section>
        </div>
      </article>

      {/* Navigation */}
      {(post.prevPost || post.nextPost) && (
        <nav className="border-t border-gray-100 dark:border-gray-800 mt-16 pt-8 px-4 md:px-8 lg:px-16 max-w-4xl mx-auto">
          <div className="flex justify-between items-center">
            {post.prevPost ? (
              <Link
                href={`/post/${post.prevPost._id}`}
                className="flex items-center gap-3 text-gray-600 dark:text-gray-400 hover:text-[#EF3866] dark:hover:text-[#ff7a9c] transition-colors group"
              >
                <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                <div>
                  <p className="text-sm">Previous</p>
                  <p className="font-medium">{post.prevPost.title}</p>
                </div>
              </Link>
            ) : (
              <div />
            )}

            {post.nextPost ? (
              <Link
                href={`/post/${post.nextPost._id}`}
                className="flex items-center gap-3 text-gray-600 dark:text-gray-400 hover:text-[#EF3866] dark:hover:text-[#ff7a9c] transition-colors group text-right"
              >
                <div>
                  <p className="text-sm">Next</p>
                  <p className="font-medium">{post.nextPost.title}</p>
                </div>
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            ) : (
              <div />
            )}
          </div>
        </nav>
      )}

      {/* Scroll to Top Button */}
      <button
        ref={scrollTopRef}
        onClick={scrollToTop}
        className="fixed bottom-8 right-8 bg-white dark:bg-black border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white p-3 rounded-full shadow-lg hover:shadow-xl z-50 transition-all duration-300 hover:border-[#EF3866]/30"
        style={{ opacity: showScrollTop ? 1 : 0, pointerEvents: showScrollTop ? 'auto' : 'none' }}
        aria-label="Scroll to top"
      >
        <ChevronUp size={20} />
      </button>

      {/* Bottom padding */}
      <div className="h-16" />
    </div>
  );
}