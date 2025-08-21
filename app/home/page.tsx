"use client";

import React, { useMemo } from "react";
import { useAppContext } from "@/context/AppContext";

const HomePage = () => {
  const { user } = useAppContext();

  // same fallback logic as in Sidebar
  const name = useMemo(() => {
    if (!user) return "Guest";
    return user.supabaseProfile?.first_name || user.firstName || "User";
  }, [user]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-sora">
        Welcome back, {name}!
      </h1>
      <br />
      <p className="text-gray-700 dark:text-gray-400 font-sora">
        Here&apos;s what&apos;s happening with your content today.
      </p>
    </div>
  );
};

export default HomePage;
