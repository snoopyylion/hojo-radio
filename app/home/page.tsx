"use client";

import React, { useMemo } from "react";
import { useAppContext } from "@/context/AppContext";
import DashboardGrid from "@/components/home/Dashboard/DashboardGrid";
import RecentBlogs from "@/components/home/Blog/RecentBlogs";
import RecentLivePodcasts from "@/components/home/Podcast/RecentLivePodcasts";
import Link from "next/link";

const HomePage = () => {
  const { user } = useAppContext();

  // same fallback logic as in Sidebar
  const name = useMemo(() => {
    if (!user) return "Guest";
    return user.supabaseProfile?.first_name || user.firstName || "User";
  }, [user]);

  // Adjust according to your actual user/role structure
  const isAuthor = user?.role === "author" || user?.supabaseProfile?.role === "author";

  return (
    <div className="p-2 space-y-6 relative min-h-screen">
      <div className="first-row p-4">
        <div className="first-row">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-sora">
            Welcome back, <span className="font-semibold text-capitalize">{name}</span> !
          </h1>
          <br />
          <p className="text-gray-700 dark:text-gray-400 font-sora">
            Here&apos;s what&apos;s happening with your content today.
          </p>
        </div>
      </div>

      <div className="cards p-4">
        <DashboardGrid />
      </div>

      <div className="p-4">
        <RecentBlogs
          limit={3}
          title="Latest Blog Posts"
          showAuthor={true}
          showDate={true}
        />
      </div>
      <div className="p-4">
        <RecentLivePodcasts
          limit={4}
          title="Live Podcasts Right Now"
        />
      </div>

      {/* Floating Create Button - only for authors */}
      {isAuthor && (
        <Link
          href="/home/post/create-post"
          className={`
            fixed bottom-6 right-6 z-50
            flex items-center justify-center gap-2
            w-14 h-14 md:w-auto md:h-12 md:px-6
            rounded-full md:rounded-xl
            bg-[#EF3866] hover:bg-[#d32f5a] active:bg-[#b92b51]
            text-white font-medium text-base
            shadow-lg hover:shadow-xl active:shadow-md
            transition-all duration-200
            group
          `}
          aria-label="Create new blog post"
        >
          <svg
            className="w-6 h-6 md:w-5 md:h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M12 4v16m8-8H4"
            />
          </svg>
          <span className="hidden md:inline">Create Post</span>
        </Link>
      )}
    </div>
  );
};

export default HomePage;