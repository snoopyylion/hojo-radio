"use client";

import { useEffect, useState } from 'react';
import PostClient from './PostClient';

interface PostClientWrapperProps {
  id: string;
}

export default function PostClientWrapper({ id }: PostClientWrapperProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-4 border-gray-200 dark:border-gray-800 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-transparent border-t-[#EF3866] rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return <PostClient id={id} />;
}