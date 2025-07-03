// components/MobileSidebar.tsx - Updated
'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  Home, Shield, Mic, BookOpen, Users, MessageCircle,
  X, ChevronRight, LayoutDashboard, ArrowRight
} from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { UserButton } from '@clerk/nextjs';
import { NotificationBell } from './NotificationBell';
import { NotificationDot } from './NotificationDot';
import SignOutBtn from './SignOutBtn';

export interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  hasNewMessages?: boolean;
  unreadCount?: number;
  onMessagesClick?: () => void;
}

// Define the navigation item type
interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<any>;
  description: string;
  showNotification?: boolean;
}

const baseNavItems: NavItem[] = [
  { href: '/', label: 'Home', icon: Home, description: 'Latest updates' },
  { href: '/verify-news', label: 'Verify News', icon: Shield, description: 'Fact checking' },
  { href: '/podcast', label: 'Podcast', icon: Mic, description: 'Audio content' },
  { href: '/blog', label: 'Blog', icon: BookOpen, description: 'Read articles' },
  { href: '/aboutus', label: 'About Us', icon: Users, description: 'Our story' },
];

const messagesNavItem: NavItem = {
  href: '/messages',
  label: 'Messages',
  icon: MessageCircle,
  description: 'Your chats',
  showNotification: true
};

const MobileSidebar: React.FC<MobileSidebarProps> = ({
  isOpen,
  onClose,
  hasNewMessages = false,
  unreadCount = 0,
  onMessagesClick
}) => {
  const { user, isLoaded } = useAppContext();
  const pathname = usePathname();

  // Conditionally include Messages button only if user exists
  const navItems = user ? [...baseNavItems, messagesNavItem] : baseNavItems;

  const isDark = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : false;

  const getUserDisplay = () => {
    if (!user) return { name: 'User', role: 'Member' };
    const name = user.supabaseProfile?.first_name || user.firstName || 'User';
    const role = user.supabaseProfile?.role || user.role || 'Member';
    return { name, role };
  };

  const { name, role } = getUserDisplay();

  useEffect(() => {
    if (isOpen) onClose();
  }, [pathname]);

  const handleNavClick = (href: string, showNotification?: boolean) => {
    if (showNotification && onMessagesClick) {
      onMessagesClick();
    } else {
      window.location.href = href;
    }
    onClose();
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed top-4 left-4 right-4 z-[70] max-w-sm mx-auto"
          >
            <div className={`rounded-3xl border shadow-2xl overflow-hidden ${isDark ? 'bg-black/95 border-white/10' : 'bg-white border-black/10'}`}>
              {/* Header */}
              <div className="relative p-6 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 relative">
                      <Image src="/img/logo.png" alt="logo" fill className="object-contain" />
                    </div>
                    <div>
                      <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-black'}`}>Menu</h2>
                      <p className={`text-xs ${isDark ? 'text-white/60' : 'text-black/60'}`}>Navigate anywhere</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {user && (
                      <Link href="/notifications">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-105 ${isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-black/5 hover:bg-black/10'}`}>
                          <NotificationBell />
                        </div>
                      </Link>
                    )}
                    <button onClick={onClose} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-105 ${isDark ? 'bg-white/10 text-white' : 'bg-black/5 text-black'}`}>
                      <X size={18} />
                    </button>
                  </div>
                </div>
                <div className="absolute bottom-0 left-6 right-6 h-px bg-gradient-to-r from-[#EF3866] to-transparent" />
              </div>

              {/* Nav Grid - Dynamic columns based on user */}
              <div className="px-6 pb-6 mt-3">
                <div className={`grid gap-3 ${user ? 'grid-cols-2' : 'grid-cols-2'}`}>
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                      <button
                        key={item.href}
                        onClick={() => handleNavClick(item.href, item.showNotification)}
                        className={`group relative p-4 rounded-2xl transition-all duration-300 text-left
                          ${isActive
                            ? `${isDark ? 'bg-[#EF3866]/20 border-[#EF3866]/30' : 'bg-[#EF3866]/10 border-[#EF3866]/20'} border`
                            : `${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-white hover:bg-black/10'} border border-transparent`}
                          hover:scale-[1.02] hover:shadow-lg w-full`}
                      >
                        <div className="flex flex-col items-center text-center space-y-2">
                          <div className={`p-3 rounded-xl transition-all duration-300 relative
                            ${isActive
                              ? 'bg-[#EF3866] text-white shadow-lg'
                              : `${isDark ? 'bg-white/10 text-white group-hover:bg-[#EF3866]' : 'bg-black/10 text-black group-hover:bg-[#EF3866]'} group-hover:text-white`}`}>
                            <Icon size={20} />
                            {item.showNotification && user && (
                              <NotificationDot
                                show={hasNewMessages && unreadCount > 0}
                                count={unreadCount > 0 ? unreadCount : undefined}
                                size="small"
                                position="top-right"
                              />
                            )}
                          </div>
                          <div>
                            <p className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-black'}`}>{item.label}</p>
                            <p className={`text-xs ${isDark ? 'text-white/60' : 'text-black/60'}`}>{item.description}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* User Section with Loading State */}
              <div className={`mx-6 mb-6 rounded-2xl overflow-hidden border-2 shadow-xl ${isDark ? 'bg-white/5 border-white/15' : 'bg-black/5 border-black/10'}`}>
                {!isLoaded ? (
                  // Loading State
                  <div className="p-5">
                    <div className="flex items-center gap-4">
                      {/* Avatar Skeleton */}
                      <div className="relative shrink-0">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gray-300 to-gray-400 animate-pulse" />
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gray-300 rounded-full animate-pulse" />
                      </div>

                      {/* User Info Skeleton */}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-gray-300 rounded animate-pulse" />
                          <div className="w-24 h-3 bg-gray-300 rounded animate-pulse" />
                        </div>
                        <div className="w-20 h-5 bg-gray-300 rounded animate-pulse" />
                        <div className="w-16 h-4 bg-gray-300 rounded animate-pulse" />
                      </div>

                      {/* Chevron Skeleton */}
                      <div className="w-5 h-5 bg-gray-300 rounded animate-pulse" />
                    </div>
                  </div>
                ) : user ? (
                  // User Authenticated State
                  <div className="space-y-0">
                    <Link href="/hashedpage" className="block group">
                      <div className={`p-5 flex items-center gap-4 transition-all duration-300 ${isDark ? 'hover:bg-white/10 border-b border-white/10' : 'hover:bg-black/5 border-b border-black/10'}`}>
                        <div className="relative shrink-0">
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#EF3866] to-[#EF3866]/70 p-0.5 shadow-lg">
                            <div className={`w-full h-full rounded-2xl flex items-center justify-center overflow-hidden ${isDark ? 'bg-black' : 'bg-white'}`}>
                              <UserButton afterSignOutUrl="/" />
                            </div>
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-[3px] border-white shadow-md" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <LayoutDashboard size={16} className={`transition-colors ${isDark ? 'text-white/80 group-hover:text-[#EF3866]' : 'text-black/80 group-hover:text-[#EF3866]'}`} />
                            <p className={`text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-white/80 group-hover:text-[#EF3866]' : 'text-black/80 group-hover:text-[#EF3866]'}`}>Dashboard Access</p>
                          </div>
                          <p className={`text-lg font-bold capitalize truncate leading-tight ${isDark ? 'text-white' : 'text-black'}`}>{name}</p>
                          <p className={`text-sm font-medium capitalize ${isDark ? 'text-white/60' : 'text-black/60'}`}>{role}</p>
                        </div>

                        <ChevronRight size={20} className={`transition-transform ${isDark ? 'text-white/60 group-hover:text-[#EF3866]' : 'text-black/60 group-hover:text-[#EF3866]'} group-hover:translate-x-1`} />
                      </div>
                      <div className="mt-1 h-0.5 bg-gradient-to-r from-[#EF3866] to-transparent transition-all scale-x-0 group-hover:scale-x-100 origin-left" />
                    </Link>
                    <div className="p-5">
                      <SignOutBtn />
                    </div>
                  </div>
                ) : (
                  // No User State - Show Sign Up Button
                  <div className="p-5">
                    <Link href="/authentication/sign-up">
                      <button className="w-full relative overflow-hidden px-8 py-5 rounded-2xl font-bold text-white bg-gradient-to-r from-[#EF3866] to-[#EF3866]/80 hover:from-[#d7325a] hover:to-[#d7325a]/80 shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300">
                        <div className="flex items-center justify-center gap-3 relative z-10">
                          <span className="text-sm tracking-tight">Get Started Today</span>
                          <ArrowRight size={18} strokeWidth={2.5} className="transition-transform group-hover:translate-x-1" />
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 group-hover:animate-pulse z-0" />
                      </button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default MobileSidebar;