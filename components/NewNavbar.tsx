// components/NewNavbar.tsx
"use client";

import Image from "next/image";
import React, { useEffect, useState, useCallback } from "react";
import { Menu, X, Home, Shield, Mic, BookOpen, Users, User, MessageCircle, LucideIcon, Bell } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { useAppContext } from "@/context/AppContext";
import Link from "next/link";
import { useRouter } from 'next/navigation';
import MobileSidebar from '@/components/MobileSidebar';
import SearchComponent from '@/components/SearchComponent';
import { useInstantNotifications } from '@/hooks/useInstantNotifications';
import { RealTimeNotificationBell } from './RealTimeNotificationBell';

// Define the navigation item type with proper typing
interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  showNotification?: boolean;
}

const baseNavItems: NavItem[] = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/home/verifications", label: "Verify News", icon: Shield },
  { href: "/home/podcast", label: "Podcast", icon: Mic },
  { href: "/home/blog", label: "Blog", icon: BookOpen },
  { href: "/aboutus", label: "About Us", icon: Users },
];

const messagesNavItem: NavItem = {
  href: "/home/messaging",
  label: "Messages",
  icon: MessageCircle,
  showNotification: true
};

const NewNavbar = () => {
  const { user, isLoaded } = useAppContext();
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Conditionally include Messages button only if user exists
  const navItems = user ? [...baseNavItems, messagesNavItem] : baseNavItems;

  // Use the instant notifications hook
  const {
    hasNewMessages,
    unreadCount,
    markAsViewed
  } = useInstantNotifications();

  // Mobile sidebar handlers
  const toggleMobileSidebar = useCallback(() => setIsMobileSidebarOpen(!isMobileSidebarOpen), [isMobileSidebarOpen]);
  const closeMobileSidebar = useCallback(() => setIsMobileSidebarOpen(false), []);

  // Handle messages link click to mark as viewed
  const handleMessagesClick = useCallback(() => {
    console.log('🔔 Messages clicked, marking as viewed');
    markAsViewed();
    router.push('/messages');
  }, [markAsViewed, router]);


  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY < 10) setIsVisible(true);
      else if (window.scrollY > lastScrollY + 10) setIsVisible(false);
      else if (window.scrollY < lastScrollY - 10) setIsVisible(true);

      setLastScrollY(window.scrollY);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileSidebarOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Enhanced notification logging with proper dependencies
  useEffect(() => {
    console.log('🔔 DEBUG: Notification state in navbar:', {
      hasNewMessages,
      unreadCount,
      user: !!user,
      isLoaded,
      timestamp: new Date().toISOString()
    });
  }, [hasNewMessages, unreadCount, user, isLoaded]);

  return (
    <>
      <nav
        className={`px-6 md:px-28 h-[92px] flex items-center bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-100/50 fixed top-0 left-0 w-full transition-all duration-300 z-50 font-sora ${isVisible ? "translate-y-0" : "-translate-y-full"}`}
      >
        <div className="flex items-center justify-between w-full">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link href="/" className="hover:opacity-80 transition-opacity">
              <Image src="/img/logo.png" alt="logo" width={100} height={100} />
            </Link>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center space-x-8 text-sm font-medium text-gray-700 font-sora">
            {/* Navigation Links */}
            <div className="flex items-center space-x-14">
              {navItems.map((item) => (
                <div key={item.href} className="relative">
                  {item.showNotification && user ? (
                    <div className="relative">
                      <button
                        onClick={handleMessagesClick}
                        className="hover:text-[#EF3866] transition-all duration-200 font-sora relative flex items-center gap-2 py-2 px-1 rounded-lg hover:bg-[#EF3866]/5"
                      >
                        <span className="relative">
                          {item.label}
                          {/* Modern notification indicator */}
                          {hasNewMessages && unreadCount > 0 && (
                            <div className="absolute -top-2 -right-3 flex items-center justify-center">
                              <div className="relative">
                                <div className="w-5 h-5 bg-[#EF3866] rounded-full flex items-center justify-center shadow-lg animate-pulse">
                                  <span className="text-white text-xs font-bold">
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                  </span>
                                </div>
                                <div className="absolute inset-0 w-5 h-5 bg-[#EF3866] rounded-full animate-ping opacity-20"></div>
                              </div>
                            </div>
                          )}
                        </span>
                      </button>
                    </div>
                  ) : (
                    <Link
                      href={item.href}
                      className="hover:text-[#EF3866] transition-all duration-200 font-sora py-2 px-1 rounded-lg hover:bg-[#EF3866]/5 block"
                    >
                      {item.label}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Auth Section */}
          <div className="hidden md:flex items-center gap-4">
            {/* Show loading state while context is loading */}
            {!isLoaded ? (
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-gray-200 animate-pulse"></div>
                <div className="w-10 h-10 rounded-xl bg-gray-200 animate-pulse"></div>
                <div className="w-10 h-10 rounded-xl bg-gray-200 animate-pulse"></div>
              </div>
            ) : user ? (
              <div className="flex items-center gap-3">
                {/* Modern Search Component */}
                <div className="relative">
                  <SearchComponent />
                </div>

                {/* Enhanced Notification Bell - Using RealTimeNotificationBell Component */}
                <RealTimeNotificationBell size="md" showCount={true} />

                {/* Enhanced User Button Container */}
                <div className="relative">
                  <div className="p-1 rounded-xl bg-gradient-to-r from-[#EF3866]/10 to-[#d7325a]/10 hover:from-[#EF3866]/20 hover:to-[#d7325a]/20 transition-all duration-300">
                    <UserButton
                      afterSignOutUrl="/"
                      appearance={{
                        elements: {
                          avatarBox: "w-9 h-9 rounded-lg",
                          userButtonPopoverCard: "rounded-2xl shadow-2xl border border-gray-100",
                          userButtonPopoverActions: "rounded-xl",
                        }
                      }}
                    >
                      <UserButton.MenuItems>
                        <UserButton.Action
                          label="Dashboard"
                          labelIcon={<User size={16} />}
                          onClick={() => router.push("/hashedpage")}
                        />
                        <UserButton.Action
                          label="Notifications"
                          labelIcon={<Bell size={16} />}
                          onClick={() => router.push("/notifications")}
                        />
                      </UserButton.MenuItems>
                    </UserButton>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                {/* Get Started Button */}
                <Link href="/authentication/sign-up" aria-label="Get Started">
                  <button
                    className="relative inline-flex items-center justify-center px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-[#EF3866] to-[#d7325a] rounded-lg shadow-md transition-all duration-300 hover:shadow-lg hover:from-[#d7325a] hover:to-[#c42a52] focus:outline-none focus:ring-2 focus:ring-[#EF3866]/30 active:scale-[0.97]"
                    type="button"
                  >
                    <span className="relative z-10">Get Started</span>
                    {/* subtle gradient shine */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-700 ease-out" />
                  </button>
                </Link>

                {/* Sign In Button */}
                <Link href="/authentication/sign-in" aria-label="Sign In">
                  <button
                    className="relative inline-flex items-center justify-center px-6 py-2.5 text-sm font-medium text-[#EF3866] dark:text-[#ff6b96] bg-white dark:bg-black border border-[#EF3866]/20 rounded-lg transition-all duration-300 hover:border-[#EF3866]/40 hover:bg-[#EF3866]/5 dark:hover:bg-[#EF3866]/10 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#EF3866]/20 active:scale-[0.97]"
                    type="button"
                  >
                    <span className="relative flex items-center gap-1.5">
                      Sign In
                      <svg
                        className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </span>
                  </button>
                </Link>
              </div>

            )}
          </div>

          {/* Mobile Controls */}
          <div className="md:hidden flex items-center gap-3">
            {/* Mobile Search Component */}
            <div className="md:hidden">
              <SearchComponent isMobile={true} />
            </div>

            {/* Enhanced Mobile Menu Button with notification */}
            <div className="relative group">
              <button
                onClick={toggleMobileSidebar}
                className="relative flex items-center justify-center w-10 h-10 rounded-xl hover:bg-gray-100/80 transition-all duration-300 hover:scale-105 active:scale-95"
              >
                {isMobileSidebarOpen ? (
                  <X size={20} className="text-gray-600" />
                ) : (
                  <Menu size={20} className="text-gray-600" />
                )}
              </button>

              {/* Mobile notification indicator */}
              {user && hasNewMessages && unreadCount > 0 && (
                <div className="absolute -top-1 -right-1">
                  <div className="relative">
                    <div className="w-5 h-5 bg-gradient-to-r from-[#EF3866] to-[#d7325a] rounded-full flex items-center justify-center shadow-lg">
                      <span className="text-white text-xs font-bold">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    </div>
                    <div className="absolute inset-0 w-5 h-5 bg-[#EF3866] rounded-full animate-ping opacity-20"></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modern progress bar for scroll */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#EF3866] to-transparent opacity-50"></div>
      </nav>

      {/* Mobile Sidebar Integration */}
      <MobileSidebar
        isOpen={isMobileSidebarOpen}
        onClose={closeMobileSidebar}
        hasNewMessages={hasNewMessages}
        unreadCount={unreadCount}
        onMessagesClick={handleMessagesClick}
      />

      {/* Custom Styles for Enhanced Effects */}
      <style jsx>{`
        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 5px rgba(239, 56, 102, 0.5);
          }
          50% {
            box-shadow: 0 0 20px rgba(239, 56, 102, 0.8), 0 0 30px rgba(239, 56, 102, 0.4);
          }
        }
        
        .animate-pulse-glow {
          animation: pulse-glow 2s ease-in-out infinite;
        }
      `}</style>
    </>
  );
};

export default NewNavbar;