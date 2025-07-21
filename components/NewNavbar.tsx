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
import { NotificationDot } from './NotificationDot';

// Define the navigation item type with proper typing
interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  showNotification?: boolean;
}

const baseNavItems: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/verify-news", label: "Verify News", icon: Shield },
  { href: "/podcast", label: "Podcast", icon: Mic },
  { href: "/blog", label: "Blog", icon: BookOpen },
  { href: "/aboutus", label: "About Us", icon: Users },
];

const messagesNavItem: NavItem = {
  href: "/messages",
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

  // Handle notification icon click
  const handleNotificationClick = useCallback(() => {
    router.push('/notifications');
  }, [router]);

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
        className={`px-6 md:px-28 h-[92px] flex items-center bg-white/70 backdrop-blur-sm shadow-sm fixed top-0 left-0 w-full transition-transform duration-300 z-50 font-sora ${isVisible ? "translate-y-0" : "-translate-y-full"}`}
      >
        <div className="flex items-center justify-between w-full">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link href="/">
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
                        className="hover:text-[#EF3866] transition font-sora relative flex items-center gap-2"
                      >
                        <span>{item.label}</span>
                        {/* Enhanced notification dot with better visibility */}
                        <div className="relative">
                          <NotificationDot
                            show={hasNewMessages && unreadCount > 0}
                            count={unreadCount > 0 ? unreadCount : undefined}
                            size="small"
                            position="top-right"
                          />
                        </div>
                      </button>
                    </div>
                  ) : (
                    <Link href={item.href} className="hover:text-[#EF3866] transition font-sora">
                      {item.label}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Auth Section */}
          <div className="hidden md:flex items-center gap-6">
            {/* Desktop Search Component */}
            <SearchComponent />

            {/* Show loading state while context is loading */}
            {!isLoaded ? (
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse"></div>
                <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse"></div>
                <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse"></div>
              </div>
            ) : user ? (
              <div className="flex items-center gap-4">
                {/* Notification Icon */}
                <div className="relative">
                  <button
                    onClick={handleNotificationClick}
                    className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <Bell size={20} className="text-gray-600" />
                    {/* Notification dot on bell icon */}
                    <div className="absolute -top-1 -right-1">
                      <NotificationDot
                        show={hasNewMessages && unreadCount > 0}
                        count={unreadCount > 0 ? unreadCount : undefined}
                        size="small"
                        position="top-right"
                        className="border-2 border-white"
                      />
                    </div>
                  </button>
                </div>

                {/* User Button with Custom Menu Items */}
                <UserButton afterSignOutUrl="/">
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
            ) : (
              <Link href="/authentication/sign-up">
                <button className="flex items-center gap-4 bg-[#EF3866] hover:bg-[#d7325a] text-white px-6 py-4 rounded-full transition-all text-xl font-sora">
                  <span className="text-lg font-sora">Sign Up</span>
                  <Image
                    src="/icons/arrow-circle-right.png"
                    alt="arrow"
                    width={30}
                    height={30}
                  />
                </button>
              </Link>
            )}
          </div>

          {/* Mobile Controls */}
          <div className="md:hidden flex items-center gap-3">
            {/* Mobile Search Component */}
            <div className="md:hidden">
              <SearchComponent isMobile={true} />
            </div>

            {/* Mobile Menu Button with notification dot */}
            <div className="relative">
              <button
                onClick={toggleMobileSidebar}
                className="relative flex items-center justify-center w-8 h-8 rounded-md hover:bg-gray-100 transition-all duration-200"
              >
                {isMobileSidebarOpen ? (
                  <X size={18} className="text-gray-600" />
                ) : (
                  <Menu size={18} className="text-gray-600" />
                )}
              </button>
              {/* Enhanced notification dot on mobile menu */}
              {user && (
                <div className="absolute -top-1 -right-1">
                  <NotificationDot
                    show={hasNewMessages && unreadCount > 0}
                    count={unreadCount > 0 ? unreadCount : undefined}
                    size="small"
                    position="top-right"
                    className="border-2 border-white"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Sidebar Integration */}
      <MobileSidebar
        isOpen={isMobileSidebarOpen}
        onClose={closeMobileSidebar}
        hasNewMessages={hasNewMessages}
        unreadCount={unreadCount}
        onMessagesClick={handleMessagesClick}
      />
    </>
  );
};

export default NewNavbar;