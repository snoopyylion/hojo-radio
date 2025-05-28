"use client";
import React from "react";
import { urlFor } from "@/sanity/lib/image";
import Link from "next/link";
import Image from "next/image";
import { formatDistance } from 'date-fns';

interface SanityImage {
  asset: {
    _ref: string;
    _type: string;
  };
}

interface NewsTileProps {
  post: {
    _id: string;
    title: string;
    description: string;
    slug: { current: string };
    mainImage?: SanityImage;
    publishedAt: string;
    author: {
      name: string;
      image?: SanityImage;
    };
    categories: { title: string }[];
  };
  view?: 'grid' | 'list';
}

const NewsTile: React.FC<NewsTileProps> = ({ post, view = 'grid' }) => {
  const timeAgo = formatDistance(new Date(post.publishedAt), new Date(), { addSuffix: true });

  if (view === 'list') {
    return (
      <Link href={`/post/${post._id}`} className="block group">
        <div className="bg-white dark:bg-gray-800/40 backdrop-blur-sm border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1 flex flex-col md:flex-row">
          <div className="relative md:w-2/5 aspect-video md:aspect-[4/3]">
            {post.mainImage ? (
              <>
                <Image
                  src={urlFor(post.mainImage).url()}
                  alt={post.title}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-[#EF3866]/20 via-transparent to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              </>
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#EF3866]/10 via-pink-50 to-purple-100 dark:from-[#EF3866]/20 dark:to-purple-900" />
            )}
            
            {/* Floating categories */}
            <div className="absolute top-4 left-4 flex flex-wrap gap-2 max-w-[calc(100%-2rem)]">
              {post.categories.slice(0, 2).map((cat, index) => (
                <span
                  key={index}
                  className="bg-white/90 backdrop-blur-md text-[#EF3866] text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm border border-white/20 transition-transform group-hover:scale-105"
                >
                  {cat.title}
                </span>
              ))}
              {post.categories.length > 2 && (
                <span className="bg-[#EF3866]/90 backdrop-blur-md text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm">
                  +{post.categories.length - 2}
                </span>
              )}
            </div>
          </div>

          <div className="p-6 md:p-8 flex flex-col flex-grow justify-between">
            <div>
              <h3 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white mb-4 leading-tight group-hover:text-[#EF3866] dark:group-hover:text-[#ff7a9c] transition-colors duration-300">
                {post.title}
              </h3>
              
              <p className="text-base text-gray-600 dark:text-gray-300 mb-6 line-clamp-3 leading-relaxed">
                {post.description}
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {post.author.image ? (
                  <div className="w-12 h-12 relative rounded-full overflow-hidden mr-4 ring-2 ring-[#EF3866]/20 group-hover:ring-[#EF3866]/40 transition-all duration-300">
                    <Image
                      src={urlFor(post.author.image).width(80).height(80).url()}
                      alt={post.author.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-12 h-12 bg-gradient-to-br from-[#EF3866] to-pink-600 text-white rounded-full flex items-center justify-center mr-4 shadow-md group-hover:shadow-lg transition-all duration-300">
                    <span className="text-lg font-bold">
                      {post.author.name.charAt(0)}
                    </span>
                  </div>
                )}
                <div>
                  <span className="text-base font-semibold text-gray-800 dark:text-gray-200 block">{post.author.name}</span>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{timeAgo}</p>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-[#EF3866] to-pink-600 text-white group-hover:shadow-lg group-hover:shadow-[#EF3866]/25 transition-all duration-300 flex items-center text-sm font-semibold px-6 py-3 rounded-full group-hover:scale-105">
                Read Article
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-2 group-hover:translate-x-1 transition-transform duration-300">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/post/${post._id}`} className="block h-full group">
      <div className="bg-white dark:bg-gray-800/40 backdrop-blur-sm border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 flex flex-col h-full group-hover:border-[#EF3866]/30">
        <div className="relative w-full aspect-[16/9] bg-gray-100 dark:bg-gray-700 overflow-hidden">
          {post.mainImage ? (
            <>
              <Image
                src={urlFor(post.mainImage).url()}
                alt={post.title}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-[#EF3866]/20 via-transparent to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            </>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#EF3866]/10 via-pink-50 to-purple-100 dark:from-[#EF3866]/20 dark:to-purple-900 group-hover:from-[#EF3866]/20 group-hover:to-purple-200 transition-all duration-500" />
          )}
          
          {/* Floating categories */}
          <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
            {post.categories.slice(0, 2).map((cat, index) => (
              <span
                key={index}
                className="bg-white/90 backdrop-blur-md text-[#EF3866] text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm border border-white/20 transition-transform group-hover:scale-105 self-end"
              >
                {cat.title}
              </span>
            ))}
            {post.categories.length > 2 && (
              <span className="bg-[#EF3866]/90 backdrop-blur-md text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm self-end">
                +{post.categories.length - 2}
              </span>
            )}
          </div>

          {/* Read time indicator */}
          <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm text-white text-xs font-medium px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            5 min read
          </div>
        </div>

        <div className="p-6 flex flex-col flex-grow">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white line-clamp-2 group-hover:text-[#EF3866] dark:group-hover:text-[#ff7a9c] transition-colors duration-300 mb-3 leading-tight">
            {post.title}
          </h3>

          <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3 mb-6 leading-relaxed flex-grow">
            {post.description}
          </p>

          <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center">
              {post.author.image ? (
                <div className="w-10 h-10 relative rounded-full overflow-hidden mr-3 ring-2 ring-[#EF3866]/20 group-hover:ring-[#EF3866]/40 transition-all duration-300">
                  <Image
                    src={urlFor(post.author.image).width(80).height(80).url()}
                    alt={post.author.name}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-10 h-10 bg-gradient-to-br from-[#EF3866] to-pink-600 text-white rounded-full flex items-center justify-center mr-3 shadow-md group-hover:shadow-lg transition-all duration-300">
                  <span className="text-sm font-bold">
                    {post.author.name.charAt(0)}
                  </span>
                </div>
              )}
              <div>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 block">{post.author.name}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{timeAgo}</span>
              </div>
            </div>
            
            <div className="bg-[#EF3866]/10 text-[#EF3866] group-hover:bg-[#EF3866] group-hover:text-white transition-all duration-300 flex items-center text-xs font-semibold px-4 py-2 rounded-full group-hover:shadow-md">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 transition-transform duration-300">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default NewsTile;