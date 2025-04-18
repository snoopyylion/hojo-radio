"use client";
import React from "react";
import { urlFor } from "@/sanity/lib/image";
import Link from "next/link";
import Image from "next/image";

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
    slug: { current: string };
    mainImage?: SanityImage;
    publishedAt: string;
    author: {
      name: string;
      image?: SanityImage;
    };
    categories: { title: string }[];
  };
}

const NewsTile: React.FC<NewsTileProps> = ({ post }) => {
  const formattedDate = new Date(post.publishedAt).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <Link href={`/post/${post._id}`} className="block h-full">
      <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 ease-in-out transform hover:-translate-y-1 flex flex-col h-full border border-gray-100 dark:border-gray-700">
        {/* Image container */}
        <div className="relative w-full aspect-[16/9] bg-gray-100 dark:bg-gray-700">
          {post.mainImage ? (
            <>
              <Image
                src={urlFor(post.mainImage).url()}
                alt={post.title}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority={false}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute top-3 right-3 flex flex-wrap gap-2 z-10">
                {post.categories?.map((cat, index) => (
                  <span
                    key={`${cat.title}-${index}`}
                    className="bg-blue-600 text-white text-xs font-semibold px-2 py-1 rounded-full shadow-sm"
                  >
                    {cat.title}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900" />
          )}
        </div>

        {/* Content */}
        <div className="p-4 md:p-5 flex flex-col justify-between flex-grow space-y-3">
          <h3 className="text-lg md:text-xl font-semibold text-gray-800 dark:text-white line-clamp-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            {post.title}
          </h3>

          {/* Author and date */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center">
              {post.author.image ? (
                <div className="w-8 h-8 relative rounded-full overflow-hidden mr-2">
                  <Image
                    src={urlFor(post.author.image).width(80).height(80).url()}
                    alt={post.author.name}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 mr-2 flex items-center justify-center">
                  <span className="text-sm font-semibold text-gray-700 dark:text-white">
                    {post.author.name.charAt(0)}
                  </span>
                </div>
              )}
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{post.author.name}</span>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">{formattedDate}</span>
          </div>
        </div>

        {/* Read more */}
        <div className="px-5 pb-4 mt-auto">
          <div className="text-sm text-blue-600 dark:text-blue-400 font-semibold flex items-center hover:underline">
            Read More
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default NewsTile;
