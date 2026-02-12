"use client";

import React, { useMemo } from "react";
import { useAppContext } from "@/context/AppContext";
import DashboardGrid from "@/components/home/Dashboard/DashboardGrid";
import RecentBlogs from "@/components/home/Blog/RecentBlogs";
import RecentLivePodcasts from "@/components/home/Podcast/RecentLivePodcasts";

const HomePage = () => {
  const { user } = useAppContext();

  // same fallback logic as in Sidebar
  const name = useMemo(() => {
    if (!user) return "Guest";
    return user.supabaseProfile?.first_name || user.firstName || "User";
  }, [user]);

  return (
    // <div className="p-2">
    //   <div className="first-row">
    //     <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-sora">
    //       Welcome back, <span className="font-semibold text-capitalize">{name}</span> !
    //     </h1>
    //     <br />
    //     <p className="text-gray-700 dark:text-gray-400 font-sora">
    //       Here&apos;s what&apos;s happening with your content today.
    //     </p>
    //   </div>
    //   <div className="cards">
    //     <DashboardGrid />
    //   </div>
    //   <div className="recent-tabs">
    //     <div className="recent-blogs">
    //       <RecentBlogs
    //         limit={6}
    //         title="Latest Blog Posts"
    //         showAuthor={true}
    //         showDate={true}
    //       // className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
    //       />
    //     </div>
    //     <div className="recent-podcasts"></div>
    //   </div>
    //   <div className="recent-tabs">
    //     <div className="recent-verifiedNews"></div>
    //     <div className="recent-bookmarked"></div>
    //   </div>
    // </div>

    <div className="p-2 space-y-6">
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
    </div>
  );
};

export default HomePage;
