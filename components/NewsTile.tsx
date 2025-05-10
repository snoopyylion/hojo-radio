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
        <div className="bg-white dark:bg-gray-800/40 backdrop-blur-sm border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden shadow transition-all hover:shadow-md duration-300 flex flex-col md:flex-row">
          <div className="relative md:w-1/4 aspect-video md:aspect-square">
            {post.mainImage ? (
              <>
                <Image
                  src={urlFor(post.mainImage).url()}
                  alt={post.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              </>
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-pink-100 to-purple-100 dark:from-pink-900 dark:to-purple-900" />
            )}
          </div>

          <div className="p-5 md:p-6 flex flex-col flex-grow justify-between">
            <div>
              <div className="flex flex-wrap gap-2 mb-3">
                {post.categories.map((cat, index) => (
                  <span
                    key={index}
                    className="bg-pink-100 dark:bg-[#EF3866] dark:text-white text-[#EF3866] text-xs font-medium px-2.5 py-1 rounded-full"
                  >
                    {cat.title}
                  </span>
                ))}
              </div>
              
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-3 group-hover:text-[#EF3866] dark:group-hover:text-[#ff7a9c] transition-colors">
                {post.title}
              </h3>
              
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
                {post.description}
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {post.author.image ? (
                  <div className="w-8 h-8 relative rounded-full overflow-hidden mr-3 border border-gray-200 dark:border-gray-700">
                    <Image
                      src={urlFor(post.author.image).width(80).height(80).url()}
                      alt={post.author.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-8 h-8 bg-[#EF3866]/10 text-[#EF3866] rounded-full flex items-center justify-center mr-3">
                    <span className="text-sm font-semibold">
                      {post.author.name.charAt(0)}
                    </span>
                  </div>
                )}
                <div>
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{post.author.name}</span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{timeAgo}</p>
                </div>
              </div>
              
              <span className="text-[#EF3866] dark:bg-[#EF3866] dark:text-white group-hover:translate-x-1 transition-transform flex items-center text-sm font-medium px-2.5 py-1 rounded-full  ">
                Read more
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </span>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/post/${post._id}`} className="block h-full group">
      <div className="bg-white dark:bg-gray-800/40 backdrop-blur-sm border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden shadow transition-all hover:shadow-lg hover:-translate-y-1 duration-300 flex flex-col h-full">
        <div className="relative w-full aspect-[16/9] bg-gray-100 dark:bg-gray-700 overflow-hidden">
          {post.mainImage ? (
            <>
              <Image
                src={urlFor(post.mainImage).url()}
                alt={post.title}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            </>
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-pink-100 to-purple-100 dark:from-pink-900 dark:to-purple-900" />
          )}
          
          <div className="absolute top-3 right-3 flex gap-2 z-10">
            {post.categories.slice(0, 2).map((cat, index) => (
              <span
                key={index}
                className="bg-pink-100/90 dark:bg-[#EF3866] dark:text-white backdrop-blur-sm text-[#EF3866] text-xs font-medium px-2.5 py-1 rounded-full"
              >
                {cat.title}
              </span>
            ))}
            {post.categories.length > 2 && (
              <span className="bg-gray-100/90 dark:bg-gray-800/80 backdrop-blur-sm text-gray-700 dark:text-gray-300 text-xs font-medium px-2.5 py-1 rounded-full">
                +{post.categories.length - 2}
              </span>
            )}
          </div>
        </div>

        <div className="p-5 flex flex-col flex-grow">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white line-clamp-2 group-hover:text-[#EF3866] dark:group-hover:text-[#ff7a9c] transition-colors mb-2">
            {post.title}
          </h3>

          <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-4">
            {post.description}
          </p>

          <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center">
              {post.author.image ? (
                <div className="w-7 h-7 relative rounded-full overflow-hidden mr-2 border border-gray-200 dark:border-gray-700">
                  <Image
                    src={urlFor(post.author.image).width(80).height(80).url()}
                    alt={post.author.name}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-7 h-7 bg-[#EF3866]/10 text-[#EF3866] rounded-full flex items-center justify-center mr-2">
                  <span className="text-xs font-semibold">
                    {post.author.name.charAt(0)}
                  </span>
                </div>
              )}
              <span className="text-xs text-gray-700 dark:text-gray-300">{post.author.name}</span>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">{timeAgo}</span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default NewsTile;