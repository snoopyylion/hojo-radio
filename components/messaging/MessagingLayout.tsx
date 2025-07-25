'use client';

import React, { useState, useEffect, createContext, useContext } from 'react';
import {
  Plus,
  Settings,
  Archive,
  Bell,
  BellOff
} from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

// Create a context for sidebar toggle
const SidebarContext = createContext<{
  toggleSidebar: () => void;
  isSidebarOpen: boolean;
} | null>(null);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within MessagingLayout');
  }
  return context;
};

interface MessagingLayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
  sidebar?: React.ReactNode;
}

export const MessagingLayout: React.FC<MessagingLayoutProps> = ({
  children,
  showSidebar = true,
  sidebar
}) => {
  const { user } = useUser();
  const router = useRouter();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Handle responsive design
  useEffect(() => {
    const checkIsMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      // On mobile, default to closed; on desktop, default to open
      if (mobile) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <SidebarContext.Provider value={{ toggleSidebar, isSidebarOpen }}>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
        {/* Mobile Sidebar Overlay */}
        {isMobile && isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        {showSidebar && (
          <div className={`
            ${isMobile
              ? `fixed left-0 top-0 h-full z-50 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
              }`
              : `relative transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-80' : 'w-0 overflow-hidden'
              }`
            }
            bg-white dark:bg-gray-950 border-r border-gray-200/60 dark:border-gray-800/60 flex flex-col shadow-lg lg:shadow-none
          `}>
            <div className="w-80 flex flex-col h-full">
              {/* Logo Header */}
              <div className="p-4 border-b border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-gray-950 flex-shrink-0">
                <button
                  onClick={() => router.push('/')}
                  className="flex items-center space-x-3 w-full group hover:bg-gray-50 dark:hover:bg-gray-900/50 rounded-xl p-2 -m-2 transition-all duration-200"
                >
                  <div className="w-10 h-10 rounded-xl relative overflow-hidden flex-shrink-0 shadow-md border border-gray-200/60 dark:border-gray-300/20 group-hover:shadow-lg transition-shadow">
                    <Image
                      src="/img/logo.jpg"
                      alt="logo"
                      fill
                      className="object-cover"
                    />
                  </div>

                  <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors">
                      Messages
                    </h1>
                    <p className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
                      Connect & Chat
                    </p>
                  </div>
                </button>
              </div>

              {/* User Profile Section */}
              {user && (
                <div className="p-4 border-b border-gray-200/60 dark:border-gray-800/60 bg-gray-50/50 dark:bg-gray-900/30 flex-shrink-0">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <Image
                        src={user.imageUrl}
                        alt={user.fullName || user.firstName || 'User'}
                        width={48}
                        height={48}
                        className="w-12 h-12 rounded-full ring-2 ring-blue-500/20 dark:ring-blue-400/30 object-cover"
                      />
                      <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 border-2 border-white dark:border-gray-950 rounded-full"></div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {user.fullName || user.firstName || 'User'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Online
                      </p>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                        className={`p-2 rounded-lg transition-all duration-200 ${notificationsEnabled
                          ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50'
                          : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/50'
                          }`}
                        title={notificationsEnabled ? 'Disable notifications' : 'Enable notifications'}
                      >
                        {notificationsEnabled ? <Bell size={16} /> : <BellOff size={16} />}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Actions Row */}
              <div className="p-3 border-b border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-gray-950 flex-shrink-0">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => router.push('/messages/new')}
                    className="flex-1 flex items-center justify-center space-x-2 px-3 py-2.5 rounded-xl bg-[#EF3866] dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 transition-all font-medium duration-200 shadow-md hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98]"
                    title="New conversation"
                  >
                    <Plus size={16} strokeWidth={2} />
                    <span className="font-medium text-sm">New Chat</span>
                  </button>

                  <button
                    onClick={() => router.push('/messages/archived')}
                    className="p-2.5 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white transition-all duration-200 hover:scale-105 active:scale-95"
                    title="Archived messages"
                  >
                    <Archive size={16} />
                  </button>

                  <button
                    onClick={() => router.push('/messages/settings')}
                    className="p-2.5 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white transition-all duration-200 hover:scale-105 active:scale-95"
                    title="Message settings"
                  >
                    <Settings size={16} />
                  </button>
                </div>
              </div>

              {/* Conversations Section */}
              <div className="flex-1 overflow-hidden bg-white dark:bg-gray-950">
                <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent hover:scrollbar-thumb-gray-400 dark:hover:scrollbar-thumb-gray-500">
                  {sidebar}
                </div>
              </div>

              {/* Sidebar Footer */}
              <div className="p-4 border-t border-gray-200/60 dark:border-gray-800/60 bg-gray-50/50 dark:bg-gray-900/30 flex-shrink-0">
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span className="font-medium">© 2025 Hojo Messages</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="font-medium">Connected</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main content area */}
        <div className="flex-1 flex flex-col min-w-0 relative bg-white dark:bg-gray-950 h-screen overflow-hidden">
          <div className="flex-1 flex flex-col min-h-0 h-full">
            {children}
          </div>
        </div>
      </div>
    </SidebarContext.Provider>
  );
};