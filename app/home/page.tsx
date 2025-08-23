"use client";

import React, { useMemo } from "react";
import { useAppContext } from "@/context/AppContext";
import DashboardGrid from "@/components/home/Dashboard/DashboardGrid";

const HomePage = () => {
  const { user } = useAppContext();

  // same fallback logic as in Sidebar
  const name = useMemo(() => {
    if (!user) return "Guest";
    return user.supabaseProfile?.first_name || user.firstName || "User";
  }, [user]);

  return (
    <div className="p-2">
      <div className="first-row">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-sora">
        Welcome back, <span className="font-semibold text-capitalize">{name}</span> !
      </h1>
      <br />
      <p className="text-gray-700 dark:text-gray-400 font-sora">
        Here&apos;s what&apos;s happening with your content today.
      </p>
      </div>
      <div className="cards">
        <DashboardGrid />
      </div>
      <div className="recent-tabs">
        <div className="recent-podcasts"></div>
        <div className="recent-blogs"></div>
      </div>
      <div className="recent-tabs">
        <div className="recent-verifiedNews"></div>
        <div className="recent-bookmarked"></div>
      </div>
    </div>
  );
};

export default HomePage;
