"use client";

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { urlFor } from "@/sanity/lib/image";
import Link from 'next/link';
import { Clock, User } from 'lucide-react';
import { client } from "@/sanity/lib/client";
import { groq } from "next-sanity";

interface Post {
  _id: string;
  title: string;
  description: string;
  slug: { current: string };
  mainImage?: {
    asset: { _ref: string; _type: string };
  };
  publishedAt: string;
  author: {
    name: string;
    image?: {
      asset: { _ref: string; _type: string };
    };
  };
  categories: { title: string }[];
  // readTime?: number; // optional – can be added later
}

interface RecentBlogsProps {
  limit?: number;
  title?: string;
  showAuthor?: boolean;
  showDate?: boolean;
  className?: string;
}

const RecentBlogs = ({
  limit = 6,
  title = "Recent Blog Posts",
  showAuthor = true,
  showDate = true,
  className = "",
}: RecentBlogsProps) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecentPosts = async () => {
      try {
        const query = groq`*[_type == "post"] | order(publishedAt desc) [0...${limit}] {
          _id,
          title,
          description,
          slug,
          mainImage,
          publishedAt,
          author->{ name, image },
          categories[]->{ title }
        }`;

        const data = await client.fetch<Post[]>(query);

        setPosts(data || []);
      } catch (err) {
        console.error("Failed to fetch recent posts:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentPosts();
  }, [limit]);

  // Simple read time estimation (words / 200 wpm)
  const estimateReadTime = (text: string = "") => {
    const words = text.split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words / 200));
  };

  if (loading) {
    return (
      <div className={`w-full ${className}`}>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white font-sora mb-6">
          {title}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: limit }).map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-900 rounded-xl overflow-hidden shadow-sm animate-pulse"
            >
              <div className="h-48 bg-gray-200 dark:bg-gray-800" />
              <div className="p-5 space-y-3">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-4/5" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className={`w-full text-center py-12 ${className}`}>
        <p className="text-gray-500 dark:text-gray-400 text-lg">
          No blog posts yet. Check back soon!
        </p>
      </div>
    );
  }

  return (
    <section className={`w-full ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white font-sora mb-6 sm:text-3xl tracking-tight">
          {title}
        </h2>
        <Link
          href="/home/blog"
          className="text-[#EF3866] hover:text-[#d32f5e] font-medium text-sm sm:text-base flex items-center gap-1 transition-colors"
        >
          View all →
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {posts.map((post) => {
          const imageUrl = post.mainImage
            ? urlFor(post.mainImage).width(600).height(400).url()
            : "https://images.unsplash.com/photo-1516321310764-9f3c9619d7d7?w=800&auto=format&fit=crop&q=80";

          const authorImage = post.author?.image
            ? urlFor(post.author.image).width(48).height(48).url()
            : null;

          const readTime = estimateReadTime(post.description);

          return (
            <Link
              key={post._id}
              href={`/home/post/${post._id}`}
              className="group block bg-white dark:bg-gray-900 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 hover:border-[#EF3866]/40 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              <div className="relative aspect-[5/3] overflow-hidden">
                <Image
                  src={imageUrl}
                  alt={post.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              </div>

              <div className="p-5 flex flex-col">
                {post.categories?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {post.categories.slice(0, 2).map((cat) => (
                      <span
                        key={cat.title}
                        className="text-xs font-medium px-2.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full"
                      >
                        {cat.title}
                      </span>
                    ))}
                  </div>
                )}

                <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2 mb-2 group-hover:text-[#EF3866] transition-colors">
                  {post.title}
                </h3>

                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-4 flex-grow">
                  {post.description}
                </p>

                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mt-auto pt-4 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-4">
                    {showAuthor && (
                      <div className="flex items-center gap-2">
                        {authorImage ? (
                          <Image
                            src={authorImage}
                            alt={post.author.name}
                            width={24}
                            height={24}
                            className="rounded-full ring-1 ring-gray-200 dark:ring-gray-700"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center">
                            <User size={14} />
                          </div>
                        )}
                        <span className="font-medium truncate max-w-[120px]">
                          {post.author.name}
                        </span>
                      </div>
                    )}

                    {showDate && (
                      <div className="flex items-center gap-1.5 whitespace-nowrap">
                        <Clock size={14} />
                        <time dateTime={post.publishedAt}>
                          {new Date(post.publishedAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </time>
                      </div>
                    )}
                  </div>

                  <span className="font-medium whitespace-nowrap">
                    {readTime} min read
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
};

export default RecentBlogs;