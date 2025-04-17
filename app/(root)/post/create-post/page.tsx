"use client";

import React from "react";
import { useAppContext } from "@/context/AppContext";
import CreatePostForm from "@/components/CreatePostForm";
import { redirect } from "next/navigation";

const CreatePostPage = () => {
  const { user } = useAppContext();
  if (!user) redirect("/");

  return (
    <div className="min-h-screen bg-gray-50 pt-32 px-4 md:px-8">
      <section className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-800">Create a New Post</h1>
        <p className="text-gray-500 mt-2">Share your ideas with the world.</p>
      </section>
      <CreatePostForm />
    </div>
  );
};

export default CreatePostPage;
