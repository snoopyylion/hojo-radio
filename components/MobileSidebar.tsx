// components/MobileSidebar.tsx - Perfect Version
'use client';

import { useCallback, useEffect } from "react";
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  Home, Shield, Mic, BookOpen, Users, MessageCircle,
  X, ChevronRight, LayoutDashboard, ArrowRight, LucideIcon,
  LogIn, UserPlus
} from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { UserButton } from '@clerk/nextjs';
import { RealTimeNotificationBell } from './RealTimeNotificationBell';
import { NotificationDot } from './NotificationDot';
import SignOutBtn from './SignOutBtn';

export interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  hasNewMessages?: boolean;
  unreadCount?: number;
  onMessagesClick?: () => void;
}

// Define the navigation item type with proper typing
interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  description: string;
  showNotification?: boolean;
}

const baseNavItems: NavItem[] = [
  { href: '/', label: 'Home', icon: Home, description: 'Latest updates' },
  { href: '/home/verifications', label: 'Verify News', icon: Shield, description: 'Fact checking' },
  { href: '/home/podcast', label: 'Podcast', icon: Mic, description: 'Audio content' },
  { href: '/home/blog', label: 'Blog', icon: BookOpen, description: 'Read articles' },
  { href: '/aboutus', label: 'About Us', icon: Users, description: 'Our story' },
];

const messagesNavItem: NavItem = {
  href: '/home/messaging',
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

  const getUserDisplay = useCallback(() => {
    if (!user) return { name: 'User', role: 'Member' };
    const name = user.supabaseProfile?.first_name || user.firstName || 'User';
    const role = user.supabaseProfile?.role || user.role || 'Member';
    return { name, role };
  }, [user]);

  const { name, role } = getUserDisplay();

  // FIX 1: Only close sidebar on pathname change, not when opening
  // This prevents the immediate open->close cycle
  useEffect(() => {
    // Only close if sidebar is open AND pathname changed
    if (isOpen) {
      console.log('Closing sidebar due to pathname change');
      onClose();
    }
  }, [pathname]); // Removed isOpen and onClose from dependencies
  

  // FIX 2: Stable navigation click handler
  const handleNavClick = useCallback((href: string, showNotification?: boolean) => {
    console.log('Nav click:', { href, showNotification });
    
    if (showNotification && onMessagesClick) {
      // Handle messages click specially
      onMessagesClick();
    } else {
      // Navigate to the href
      window.location.href = href;
    }
    
    // Close sidebar after navigation
    onClose();
  }, [onMessagesClick, onClose]);

  // FIX 3: Prevent backdrop click from bubbling
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    // Only close if clicking the backdrop itself, not child elements
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm"
            onClick={handleBackdropClick}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
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
              <div className="relative p-4 pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 relative">
                      <Image src="/img/logo.png" alt="logo" fill className="object-contain" />
                    </div>
                    <div>
                      <h2 className={`text-base font-bold ${isDark ? 'text-white' : 'text-black'}`}>Menu</h2>
                      <p className={`text-xs ${isDark ? 'text-white/60' : 'text-black/60'}`}>Navigate anywhere</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {user && (
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-105 ${isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-black/5 hover:bg-black/10'}`}>
                        <RealTimeNotificationBell size="sm" showCount={true} />
                      </div>
                    )}
                    <button 
                      onClick={onClose} 
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-105 ${isDark ? 'bg-white/10 text-white' : 'bg-black/5 text-black'}`}
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
                <div className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-[#EF3866] to-transparent" />
              </div>

              {/* Nav Grid - Dynamic columns based on user */}
              <div className="px-4 pb-4 mt-2">
                <div className={`grid gap-2 ${user ? 'grid-cols-2' : 'grid-cols-2'}`}>
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                      <button
                        key={item.href}
                        onClick={() => handleNavClick(item.href, item.showNotification)}
                        className={`group relative p-3 rounded-xl transition-all duration-300 text-left
                          ${isActive
                            ? `${isDark ? 'bg-[#EF3866]/20 border-[#EF3866]/30' : 'bg-[#EF3866]/10 border-[#EF3866]/20'} border`
                            : `${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-white hover:bg-black/10'} border border-transparent`}
                          hover:scale-[1.02] hover:shadow-lg w-full`}
                      >
                        <div className="flex flex-col items-center text-center space-y-1.5">
                          <div className={`p-2.5 rounded-lg transition-all duration-300 relative
                            ${isActive
                              ? 'bg-[#EF3866] text-white shadow-lg'
                              : `${isDark ? 'bg-white/10 text-white group-hover:bg-[#EF3866]' : 'bg-black/10 text-black group-hover:bg-[#EF3866]'} group-hover:text-white`}`}>
                            <Icon size={18} />
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
                            <p className={`font-semibold text-xs ${isDark ? 'text-white' : 'text-black'}`}>{item.label}</p>
                            <p className={`text-[10px] ${isDark ? 'text-white/60' : 'text-black/60'}`}>{item.description}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* User Section with Loading State */}
              <div className={`mx-4 mb-4 rounded-xl overflow-hidden border-2 shadow-xl ${isDark ? 'bg-white/5 border-white/15' : 'bg-black/5 border-black/10'}`}>
                {!isLoaded ? (
                  // Loading State
                  <div className="p-4">
                    <div className="flex items-center gap-3">
                      {/* Avatar Skeleton */}
                      <div className="relative shrink-0">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-300 to-gray-400 animate-pulse" />
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gray-300 rounded-full animate-pulse" />
                      </div>

                      {/* User Info Skeleton */}
                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-gray-300 rounded animate-pulse" />
                          <div className="w-20 h-2.5 bg-gray-300 rounded animate-pulse" />
                        </div>
                        <div className="w-16 h-4 bg-gray-300 rounded animate-pulse" />
                        <div className="w-14 h-3 bg-gray-300 rounded animate-pulse" />
                      </div>

                      {/* Chevron Skeleton */}
                      <div className="w-4 h-4 bg-gray-300 rounded animate-pulse" />
                    </div>
                  </div>
                ) : user ? (
                  // User Authenticated State
                  <div className="space-y-0">
                    <Link href="/hashedpage" className="block group">
                      <div className={`p-4 flex items-center gap-3 transition-all duration-300 ${isDark ? 'hover:bg-white/10 border-b border-white/10' : 'hover:bg-black/5 border-b border-black/10'}`}>
                        <div className="relative shrink-0">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#EF3866] to-[#EF3866]/70 p-0.5 shadow-lg">
                            <div className={`w-full h-full rounded-xl flex items-center justify-center overflow-hidden ${isDark ? 'bg-black' : 'bg-white'}`}>
                              <UserButton afterSignOutUrl="/" />
                            </div>
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-md" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <LayoutDashboard size={14} className={`transition-colors ${isDark ? 'text-white/80 group-hover:text-[#EF3866]' : 'text-black/80 group-hover:text-[#EF3866]'}`} />
                            <p className={`text-[10px] font-semibold uppercase tracking-wide ${isDark ? 'text-white/80 group-hover:text-[#EF3866]' : 'text-black/80 group-hover:text-[#EF3866]'}`}>Dashboard Access</p>
                          </div>
                          <p className={`text-base font-bold capitalize truncate leading-tight ${isDark ? 'text-white' : 'text-black'}`}>{name}</p>
                          <p className={`text-xs font-medium capitalize ${isDark ? 'text-white/60' : 'text-black/60'}`}>{role}</p>
                        </div>

                        <ChevronRight size={18} className={`transition-transform ${isDark ? 'text-white/60 group-hover:text-[#EF3866]' : 'text-black/60 group-hover:text-[#EF3866]'} group-hover:translate-x-1`} />
                      </div>
                      <div className="mt-1 h-0.5 bg-gradient-to-r from-[#EF3866] to-transparent transition-all scale-x-0 group-hover:scale-x-100 origin-left" />
                    </Link>
                    <div className="p-4">
                      <SignOutBtn />
                    </div>
                  </div>
                ) : (
                  // PERFECT AUTH BUTTONS SECTION - COMPACT
                  <div className="p-4 space-y-3">
                    {/* Welcome Message - Compact */}
                    <div className="text-center mb-3">
                      <h3 className={`text-base font-bold mb-1 ${isDark ? 'text-white' : 'text-black'}`}>
                        Welcome!
                      </h3>
                      <p className={`text-xs leading-relaxed ${isDark ? 'text-white/70' : 'text-black/70'}`}>
                        Join our community for exclusive content.
                      </p>
                    </div>

                    {/* Get Started Button - Compact */}
                    <Link href="/authentication/sign-up" className="block">
                      <button className="group relative w-full overflow-hidden px-4 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-[#EF3866] via-[#EF3866] to-[#d7325a] hover:from-[#d7325a] hover:via-[#c42a52] hover:to-[#b22447] shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300">
                        {/* Animated Background Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700 ease-out" />
                        
                        {/* Button Content */}
                        <div className="flex items-center justify-center gap-2 relative z-10">
                          <UserPlus size={16} strokeWidth={2.5} className="transition-transform group-hover:scale-110" />
                          <span className="text-sm font-bold tracking-tight">Get Started</span>
                          <ArrowRight size={14} strokeWidth={2.5} className="transition-transform group-hover:translate-x-1 group-hover:scale-110" />
                        </div>
                      </button>
                    </Link>
                    
                    {/* Divider - Compact */}
                    <div className="relative flex items-center justify-center py-2">
                      <div className={`absolute inset-0 flex items-center ${isDark ? '' : ''}`}>
                        <div className={`w-full border-t ${isDark ? 'border-white/20' : 'border-black/20'}`} />
                      </div>
                      <div className={`relative px-3 text-[10px] font-medium uppercase tracking-wider ${isDark ? 'bg-black/95 text-white/60' : 'bg-white text-black/60'}`}>
                        OR
                      </div>
                    </div>

                    {/* Sign In Button - Compact */}
                    <Link href="/authentication/sign-in" className="block">
                      <button className={`group relative w-full px-4 py-3 rounded-xl font-semibold border-2 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-md hover:shadow-lg overflow-hidden
                        ${isDark 
                          ? 'text-white border-white/30 hover:border-white/50 hover:bg-white/10 hover:shadow-white/20' 
                          : 'text-[#EF3866] border-[#EF3866]/40 hover:border-[#EF3866] hover:bg-[#EF3866]/5 hover:shadow-[#EF3866]/30'
                        }`}>
                        
                        {/* Button Content */}
                        <div className="flex items-center justify-center gap-2 relative z-10">
                          <LogIn size={14} strokeWidth={2.5} className="transition-transform group-hover:scale-110" />
                          <span className="text-sm font-semibold tracking-tight">Sign In</span>
                        </div>
                      </button>
                    </Link>

                    {/* Additional Info - Compact */}
                    <div className="text-center pt-1">
                      <p className={`text-[10px] leading-relaxed ${isDark ? 'text-white/50' : 'text-black/50'}`}>
                        By continuing, you agree to our Terms & Privacy Policy.
                      </p>
                    </div>
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