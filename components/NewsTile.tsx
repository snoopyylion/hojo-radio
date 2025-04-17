// components/NewsTile.tsx
import React from "react";
import { urlFor } from "@/sanity/lib/image";
import Link from "next/link";
import Image from "next/image";

interface NewsTileProps {
    post: {
        _id: string;
        title: string;
        slug: { current: string };
        mainImage?: any;
        publishedAt: string;
        author: { name: string; image?: any };
        categories: { title: string }[];
    };
}

const NewsTile: React.FC<{ post: NewsTileProps["post"] }> = ({ post }) => {
    // Format date in a more readable way
    const formattedDate = new Date(post.publishedAt).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });

    return (
        <Link href={`/post/${post._id}`}>
            <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 ease-in-out transform hover:-translate-y-1 flex flex-col h-full border border-gray-100 dark:border-gray-700">
                {/* Image container with overlay gradient */}
                <div className="relative h-52 w-full overflow-hidden">
                    {post.mainImage ? (
                        <div className="relative w-full h-full">
                            <img
                                src={urlFor(post.mainImage).width(800).height(450).url()}
                                alt={post.title}
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-70"></div>
                            
                            {/* Category badges positioned on the image */}
                            <div className="absolute top-3 right-3 flex flex-wrap gap-2 z-10">
                                {post.categories?.map((cat, index) => (
                                    <span 
                                        key={`${cat.title}-${index}`} 
                                        className="bg-blue-600 text-white text-xs font-medium px-2 py-1 rounded"
                                    >
                                        {cat.title}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="w-full h-full bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900"></div>
                    )}
                </div>
                
                {/* Content section */}
                <div className="p-5 flex-grow flex flex-col justify-between">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white line-clamp-2 mb-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                            {post.title}
                        </h3>
                    </div>
                    
                    {/* Author and date info */}
                    <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center">
                            {post.author.image ? (
                                <div className="w-8 h-8 rounded-full overflow-hidden mr-2">
                                    <img 
                                        src={urlFor(post.author.image).width(80).height(80).url()}
                                        alt={post.author.name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 mr-2 flex items-center justify-center">
                                    <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                                        {post.author.name.charAt(0)}
                                    </span>
                                </div>
                            )}
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{post.author.name}</span>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{formattedDate}</span>
                    </div>
                </div>
                
                {/* Read more indicator */}
                <div className="px-5 pb-4">
                    <div className="text-sm text-blue-600 dark:text-blue-400 font-medium flex items-center">
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