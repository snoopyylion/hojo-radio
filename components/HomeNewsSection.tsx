"use client";

import React, { useEffect, useState } from "react";
import { client } from "@/sanity/lib/client";
import { ALL_POSTS_QUERY } from "@/sanity/lib/queries";
import { TrendingUp, ArrowRight, Newspaper } from "lucide-react";
import NewsTile from "@/components/NewsTile";
import Link from "next/link";

interface Post {
  _id: string;
  title: string;
  description: string;
  slug: { current: string };
  publishedAt: string;
  author: { name: string };
  categories: { title: string }[];
}

const HomeNewsSection = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [randomCategory, setRandomCategory] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const data = await client.fetch<Post[]>(ALL_POSTS_QUERY);
        setPosts(data);
        const allCategories = [...new Set(data.flatMap(post => post.categories.map(c => c.title)))];
        setCategories(allCategories);
        if (allCategories.length > 0) {
          setRandomCategory(allCategories[Math.floor(Math.random() * allCategories.length)]);
        }
      } catch (error) {
        console.error("Failed to fetch posts", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  const latestPosts = posts
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, 2);

  const randomPosts = posts
    .filter(p => !latestPosts.find(lp => lp._id === p._id))
    .filter(p => p.categories.some(c => c.title === randomCategory))
    .slice(0, 2);

  const renderSection = (title: string, data: Post[], icon: React.ReactNode) => (
    <div className="bg-white dark:bg-black rounded-xl border border-gray-200 dark:border-zinc-800 p-6 flex flex-col space-y-4 shadow-sm transition hover:shadow-lg">
      <h3 className="text-xl font-semibold text-gray-800 dark:text-white flex items-center gap-2">
        {icon}
        {title}
      </h3>
      {data.length > 0 ? (
        data.map(post => <NewsTile key={post._id} post={post} />)
      ) : (
        <p className="text-sm text-gray-400">No posts found in this category.</p>
      )}
    </div>
  );

  return (
    <section className="relative w-full py-20 px-4 md:px-8 lg:px-16 bg-white dark:bg-black">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-light text-gray-900 dark:text-white mb-4">Latest News & Insights</h2>
          <div className="w-16 h-1 bg-[#EF3866] mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300 text-lg max-w-2xl mx-auto">
            Stay updated with our curated selection of news and expert insights.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin h-10 w-10 rounded-full border-4 border-t-[#EF3866] border-gray-300 dark:border-gray-700" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            {renderSection("Latest News", latestPosts, <TrendingUp className="w-5 h-5 text-[#EF3866]" />)}
            {renderSection(randomCategory || "Random Category", randomPosts, <Newspaper className="w-5 h-5 text-[#EF3866]" />)}
          </div>
        )}

        <div className="text-center space-y-12">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 px-6 py-3 border border-[#EF3866] text-[#EF3866] rounded-lg transition hover:bg-[#FFE6EC] dark:hover:bg-zinc-900"
          >
            Explore All News <ArrowRight className="w-4 h-4" />
          </Link>

          <div className="grid grid-cols-3 sm:grid-cols-3 gap-6 pt-8 border-t border-gray-200 dark:border-zinc-800">
            <Stat label="Total Articles" value={posts.length} />
            <Stat label="Categories" value={categories.length} />
            <Stat
              label="Latest Update"
              value={
                latestPosts[0]
                  ? new Date(latestPosts[0].publishedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric"
                  })
                  : "---"
              }
            />
          </div>
        </div>
      </div>
    </section>
  );
};

const Stat = ({ label, value }: { label: string; value: string | number }) => (
  <div className="text-center ">
    <p className="text-2xl font-bold text-[#EF3866]">{value}</p>
    <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
  </div>
);

export default HomeNewsSection;
