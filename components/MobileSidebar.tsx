"use client";

import Image from "next/image";
import React, { useEffect, useState } from "react";
import { X, Home, Shield, Mic, BookOpen, Users, ArrowRight, ChevronRight, LayoutDashboard } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { useAppContext } from "@/context/AppContext";
import Link from "next/link";
import SignOutBtn from "@/components/SignOutBtn";
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { NotificationBell } from "./NotificationBell";

const navItems = [
  { href: "/", label: "Home", icon: Home, description: "Latest updates" },
  { href: "/verify-news", label: "Verify News", icon: Shield, description: "Fact checking" },
  { href: "/podcast", label: "Podcast", icon: Mic, description: "Audio content" },
  { href: "/blog", label: "Blog", icon: BookOpen, description: "Read articles" },
  { href: "/aboutus", label: "About Us", icon: Users, description: "Our story" },
];

const useDarkMode = () => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkDarkMode = () => {
      if (typeof window !== 'undefined') {
        setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
      }
    };

    checkDarkMode();
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return isDark;
};

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const MobileSidebar: React.FC<MobileSidebarProps> = ({ isOpen, onClose }) => {
  const { user, isLoaded } = useAppContext();
  const pathname = usePathname();
  const isDarkMode = useDarkMode();

  // Get user display data with fallbacks
  const getUserDisplayData = () => {
    if (!user) return { name: 'User', role: 'Member' };
    
    const name = user.supabaseProfile?.first_name || user.firstName || 'User';
    const role = user.supabaseProfile?.role || user.role || 'Member';
    
    return { name, role };
  };

  const { name: displayName, role: displayRole } = getUserDisplayData();

  useEffect(() => {
    if (isOpen) onClose();
  }, [pathname]);

  const renderUserSection = () => {
    if (!isLoaded) {
      return (
        <div className={`mx-6 mb-6 rounded-2xl overflow-hidden border-2 shadow-xl
          ${isDarkMode ? 'bg-white/5 border-white/15' : 'bg-black/5 border-black/10'}`}>
          <div className="p-5 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gray-300 dark:bg-gray-600 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse" />
              <div className="h-3 w-1/2 bg-gray-300 dark:bg-gray-600 rounded animate-pulse" />
            </div>
          </div>
        </div>
      );
    }

    if (user) {
      return (
        <div className={`mx-6 mb-6 rounded-2xl overflow-hidden border-2 shadow-xl
          ${isDarkMode ? 'bg-white/5 border-white/15' : 'bg-black/5 border-black/10'}`}>
          <div className="space-y-0">
            <Link href="/hashedpage" className="block group">
              <div className={`p-5 flex items-center gap-4 transition-all duration-300
                ${isDarkMode ? 'hover:bg-white/10 border-b border-white/10' : 'hover:bg-black/5 border-b border-black/10'}`}>
                <div className="relative shrink-0">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#EF3866] to-[#EF3866]/70 p-0.5 shadow-lg">
                    <div className={`w-full h-full rounded-2xl flex items-center justify-center overflow-hidden
                      ${isDarkMode ? 'bg-black' : 'bg-white'}`}>
                      <UserButton afterSignOutUrl="/" />
                    </div>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-[3px] border-white shadow-md" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <LayoutDashboard
                      size={16}
                      className={`transition-colors duration-300 
                        ${isDarkMode ? 'text-white/80' : 'text-black/80'} 
                        group-hover:text-[#EF3866]`}
                    />
                    <p className={`text-xs font-semibold uppercase tracking-wide transition-colors duration-300
                      ${isDarkMode ? 'text-white/80' : 'text-black/80'} 
                      group-hover:text-[#EF3866]`}>
                      Dashboard Access
                    </p>
                  </div>

                  <p className={`text-lg font-bold capitalize truncate leading-tight 
                    ${isDarkMode ? 'text-white' : 'text-black'}`}>
                    {displayName}
                  </p>

                  <p className={`text-sm font-medium capitalize
                    ${isDarkMode ? 'text-white/60' : 'text-black/60'}`}>
                    {displayRole}
                  </p>
                </div>

                <div className="flex flex-col items-center gap-2">
                  <ChevronRight
                    size={20}
                    strokeWidth={2.5}
                    className={`transition-transform duration-300 
                      ${isDarkMode ? 'text-white/60 group-hover:text-[#EF3866]' : 'text-black/60 group-hover:text-[#EF3866]'} 
                      group-hover:translate-x-1`}
                  />
                </div>
              </div>
              <div className={`mt-1 h-0.5 bg-gradient-to-r from-[#EF3866] to-transparent
                transition-all duration-300 scale-x-0 group-hover:scale-x-100 origin-left`} />
            </Link>

            <div className="p-5">
              <SignOutBtn />
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className={`mx-6 mb-6 rounded-2xl overflow-hidden border-2 shadow-xl
        ${isDarkMode ? 'bg-white/5 border-white/15' : 'bg-black/5 border-black/10'}`}>
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
    );
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
            className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-sm"
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
            transition={{ type: "spring", stiffness: 300, damping: 30, duration: 0.3 }}
            className="fixed top-4 left-4 right-4 z-[70] max-w-sm mx-auto"
          >
            <div className={`${isDarkMode ? 'bg-black/95 border-white/10' : 'bg-white border-black/10'}
              backdrop-blur-xl rounded-3xl border shadow-2xl overflow-hidden`}>

              <div className="relative p-6 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 relative">
                      <Image src="/img/logo.png" alt="logo" fill className="object-contain" />
                    </div>
                    <div>
                      <h2 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>
                        Menu
                      </h2>
                      <p className={`text-xs ${isDarkMode ? 'text-white/60' : 'text-black/60'}`}>
                        Navigate anywhere
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {user && (
                      <Link href="/notifications">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center
                          transition-all duration-200 hover:scale-105
                          ${isDarkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-black/5 hover:bg-black/10'}`}>
                          <NotificationBell />
                        </div>
                      </Link>
                    )}

                    <button
                      onClick={onClose}
                      className={`w-10 h-10 rounded-full flex items-center justify-center
                        transition-all duration-200 hover:scale-105
                        ${isDarkMode ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-black/5 hover:bg-black/10 text-black'}`}
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
                <div className="absolute bottom-0 left-6 right-6 h-px bg-gradient-to-r from-[#EF3866] to-transparent"></div>
              </div>

              <div className="px-6 pb-6 mt-[10px]">
                <div className="grid grid-cols-2 gap-3">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`group relative p-4 rounded-2xl transition-all duration-300
                          ${isActive
                            ? `${isDarkMode ? 'bg-[#EF3866]/20 border-[#EF3866]/30' : 'bg-[#EF3866]/10 border-[#EF3866]/20'} border`
                            : `${isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-white hover:bg-black/10'} border border-transparent`
                          }
                          hover:scale-[1.02] hover:shadow-lg`}
                      >
                        <div className="flex flex-col items-center text-center space-y-2">
                          <div className={`p-3 rounded-xl transition-all duration-300
                            ${isActive
                              ? 'bg-[#EF3866] text-white shadow-lg shadow-[#EF3866]/25'
                              : `${isDarkMode ? 'bg-white/10 text-white group-hover:bg-[#EF3866] group-hover:text-white' : 'bg-black/10 text-black group-hover:bg-[#EF3866] group-hover:text-white'}`}
                          `}>
                            <Icon size={20} />
                          </div>
                          <div>
                            <p className={`font-semibold text-sm ${isDarkMode ? 'text-white' : 'text-black'}`}>
                              {item.label}
                            </p>
                            <p className={`text-xs ${isDarkMode ? 'text-white/60' : 'text-black/60'}`}>
                              {item.description}
                            </p>
                          </div>
                        </div>
                        {isActive && (
                          <motion.div
                            layoutId="activeIndicator"
                            className="absolute -top-1 -right-1 w-3 h-3 bg-[#EF3866] rounded-full shadow-lg"
                          />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>

              {renderUserSection()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default MobileSidebar;