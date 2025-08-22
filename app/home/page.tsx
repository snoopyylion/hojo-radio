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
        <div className="card1">
            <div className="card-left">
                <div>
                    <p>Podcasts Created</p>
                    <h2>12</h2>
                    <p>+3 this week</p>
                </div>

            </div>
            <div className="mic-icon crad-right">

            </div>
        </div>
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
