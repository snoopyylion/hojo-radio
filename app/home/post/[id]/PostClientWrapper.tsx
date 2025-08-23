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
      <div className="min-h-screen w-full bg-white dark:bg-black flex items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-6">
          {/* Multi-layer breathing loader */}
          <div className="relative flex items-center justify-center">
            {/* Outer ring - slow pulse */}
            <div className="absolute w-24 h-24 bg-[#EF3866]/10 dark:bg-[#ff7a9c]/10 rounded-full animate-ping animation-delay-0"></div>
            
            {/* Middle ring - medium pulse */}
            <div className="absolute w-16 h-16 bg-[#EF3866]/20 dark:bg-[#ff7a9c]/20 rounded-full animate-pulse animation-delay-150"></div>
            
            {/* Inner ring - fast pulse */}
            <div className="absolute w-12 h-12 bg-[#EF3866]/40 dark:bg-[#ff7a9c]/40 rounded-full animate-bounce animation-delay-300"></div>
            
            {/* Core - breathing effect */}
            <div className="relative w-8 h-8 bg-gradient-to-r from-[#EF3866] to-pink-500 dark:from-[#ff7a9c] dark:to-pink-400 rounded-full shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-r from-[#EF3866] to-pink-500 dark:from-[#ff7a9c] dark:to-pink-400 rounded-full animate-ping opacity-75"></div>
              <div className="relative w-full h-full bg-gradient-to-r from-[#EF3866] to-pink-500 dark:from-[#ff7a9c] dark:to-pink-400 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
          
          {/* Loading text with breathing animation */}
          <div className="text-center space-y-2">
            <p className="text-lg font-medium text-gray-900 dark:text-white animate-pulse">
              Loading Post
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse animation-delay-500">
              Preparing your reading experience...
            </p>
          </div>
          
          {/* Progress dots */}
          <div className="flex space-x-2">
            <div className="w-2 h-2 bg-[#EF3866] dark:bg-[#ff7a9c] rounded-full animate-bounce animation-delay-0"></div>
            <div className="w-2 h-2 bg-[#EF3866] dark:bg-[#ff7a9c] rounded-full animate-bounce animation-delay-150"></div>
            <div className="w-2 h-2 bg-[#EF3866] dark:bg-[#ff7a9c] rounded-full animate-bounce animation-delay-300"></div>
          </div>
        </div>
        
        {/* Custom styles for animation delays */}
        <style jsx>{`
          .animation-delay-0 {
            animation-delay: 0ms;
          }
          .animation-delay-150 {
            animation-delay: 150ms;
          }
          .animation-delay-300 {
            animation-delay: 300ms;
          }
          .animation-delay-500 {
            animation-delay: 500ms;
          }
          
          @keyframes breathe {
            0%, 100% { 
              transform: scale(1);
              opacity: 1;
            }
            50% { 
              transform: scale(1.1);
              opacity: 0.8;
            }
          }
          
          .animate-breathe {
            animation: breathe 2s ease-in-out infinite;
          }
        `}</style>
      </div>
    );
  }

  return <PostClient id={id} />;
}