// MessagingLayout.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';

interface MessagingLayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
  sidebar?: React.ReactNode;
  showConversationListOnly?: boolean;
  showConversationContent?: boolean;
}

export const MessagingLayout: React.FC<MessagingLayoutProps> = ({
  children,
  showSidebar = true,
  sidebar,
  showConversationListOnly = false,
  showConversationContent = false
}) => {
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
    };
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // ✅ Mobile view keeps Instagram-style behavior
  if (isMobile) {
    if (showConversationListOnly) {
      return (
        <div className="h-[calc(100vh-120px)] bg-white dark:bg-gray-950 flex flex-col overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex-shrink-0 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Messages</h1>
              <button
                onClick={() => router.push('/home/messaging/new')}
                className="p-2 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>
          <div className="flex-1 min-h-0 bg-white dark:bg-gray-950 overflow-y-auto">
            {sidebar}
          </div>
        </div>
      );
    }

    if (showConversationContent) {
      return (
        <div className="h-[calc(100vh-120px)] bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
          {children}
        </div>
      );
    }
  }

  // ✅ Desktop view: Always side-by-side (conversation list + content)
  return (
    <div className="h-[calc(100vh-120px)] bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden flex">
      {/* Sidebar */}
      {showSidebar && (
        <div className="w-80 bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          <div className="flex-shrink-0 p-2 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Messages</h2>
              <button
                onClick={() => router.push('/home/messaging/new')}
                className="p-1.5 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
              {sidebar}
            </div>
          </div>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {showConversationContent ? (
          children
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No chat selected
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md">
              Select a chat to view here
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
