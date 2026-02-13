"use client";

import React from "react";
import { useAppContext } from "@/context/AppContext";
import CreatePostForm from "@/components/CreatePostForm";
import { redirect } from "next/navigation";

const CreatePostPage = () => {
  const { user } = useAppContext();
  if (!user) redirect("/");

  return (
    <div className="min-h-screen bg-white dark:bg-[#0f0f0f] text-gray-900 dark:text-gray-100">
      {/* Subtle background gradient in light mode, dark solid in dark */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/50 to-transparent dark:from-transparent pointer-events-none" />
      
      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
        <header className="text-center mb-12 md:mb-16">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight bg-gradient-to-r from-[#EF3866] to-[#ff6b81] bg-clip-text text-transparent inline-block">
            Write your story
          </h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Craft something meaningful. Your words matter.
          </p>
        </header>

        <CreatePostForm />
      </div>
    </div>
  );
};

export default CreatePostPage;