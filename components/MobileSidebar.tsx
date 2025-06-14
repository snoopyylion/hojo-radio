"use client";

import Image from "next/image";
import React, { useEffect, useState } from "react";
import { X, Bell, Home, Shield, Mic, BookOpen, Users, ArrowRight, User, ChevronRight, LayoutDashboard } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { useAppContext } from "@/context/AppContext";
import Link from "next/link";
import SignOutBtn from "@/components/SignOutBtn";
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@supabase/supabase-js';
import { usePathname, useRouter } from 'next/navigation';

// Initialize Supabase client with proper type checking
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Define the user profile type
interface UserProfile {
  role: string;
  first_name: string;
}

// Navigation items with icons and descriptions
const navItems = [
  { 
    href: "/", 
    label: "Home", 
    icon: Home, 
    description: "Latest updates" 
  },
  { 
    href: "/verify-news", 
    label: "Verify News", 
    icon: Shield, 
    description: "Fact checking" 
  },
  { 
    href: "/podcast", 
    label: "Podcast", 
    icon: Mic, 
    description: "Audio content" 
  },
  { 
    href: "/blog", 
    label: "Blog", 
    icon: BookOpen, 
    description: "Read articles" 
  },
  { 
    href: "/aboutus", 
    label: "About Us", 
    icon: Users, 
    description: "Our story" 
  },
];

// Custom hook for dark mode detection
const useDarkMode = () => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkDarkMode = () => {
      if (typeof window !== 'undefined') {
        const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setIsDark(isDarkMode);
      }
    };

    checkDarkMode();

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setIsDark(e.matches);
    };

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
  const { user } = useAppContext();
  const pathname = usePathname();
  const router = useRouter();
  const isDarkMode = useDarkMode();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);

  // Close sidebar on route change
  useEffect(() => {
    if (isOpen) {
      onClose();
    }
  }, [pathname]);

  // Fetch user profile data from Supabase
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.id) return;

      setLoading(true);

      try {
        console.log('🔍 Fetching profile for user ID:', user.id);

        const { data, error, status } = await supabase
          .from('users')
          .select('role, first_name')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.error('❌ Supabase error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
            status: status
          });
        } else if (!data) {
          console.warn('⚠️ No user profile found for ID:', user.id);
        } else {
          setUserProfile({
            first_name: data.first_name || 'User',
            role: data.role || 'Member',
          });
          console.log('✅ User profile loaded:', data);
        }
      } catch (err) {
        console.error('❌ Unexpected error fetching user profile:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [user?.id]);

  return (
    <>
      {/* Backdrop Overlay */}
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

      {/* Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ 
              type: "spring", 
              stiffness: 300, 
              damping: 30,
              duration: 0.3 
            }}
            className="fixed top-4 left-4 right-4 z-[70] max-w-sm mx-auto"
          >
            <div className={`
              ${isDarkMode 
                ? 'bg-black/95 border-white/10' 
                : 'bg-white border-black/10'
              }
              backdrop-blur-xl rounded-3xl border shadow-2xl overflow-hidden
            `}>
              
              {/* Header */}
              <div className="relative p-6 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 relative">
                      <Image
                        src="/img/logo.png"
                        alt="logo"
                        fill
                        className="object-contain"
                      />
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

                  <button
                    onClick={onClose}
                    className={`
                      w-10 h-10 rounded-full flex items-center justify-center
                      transition-all duration-200 hover:scale-105
                      ${isDarkMode 
                        ? 'bg-white/10 hover:bg-white/20 text-white' 
                        : 'bg-black/5 hover:bg-black/10 text-black'
                      }
                    `}
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Decorative accent line */}
                <div className="absolute bottom-0 left-6 right-6 h-px bg-gradient-to-r from-[#EF3866] to-transparent"></div>
              </div>

              {/* Navigation Grid */}
              <div className="px-6 pb-6 mt-[10px]">
                <div className="grid grid-cols-2 gap-3">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`
                          group relative p-4 rounded-2xl transition-all duration-300
                          ${isActive 
                            ? `${isDarkMode ? 'bg-[#EF3866]/20 border-[#EF3866]/30' : 'bg-[#EF3866]/10 border-[#EF3866]/20'} border`
                            : `${isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-white hover:bg-black/10'} border border-transparent`
                          }
                          hover:scale-[1.02] hover:shadow-lg
                        `}
                      >
                        <div className="flex flex-col items-center text-center space-y-2">
                          <div className={`
                            p-3 rounded-xl transition-all duration-300
                            ${isActive 
                              ? 'bg-[#EF3866] text-white shadow-lg shadow-[#EF3866]/25'
                              : `${isDarkMode ? 'bg-white/10 text-white group-hover:bg-[#EF3866] group-hover:text-white' : 'bg-black/10 text-black group-hover:bg-[#EF3866] group-hover:text-white'}`
                            }
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

                        {/* Active indicator */}
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

              {/* User Section */}
              {/* Enhanced User Section */}
              <div className={`
                mx-6 mb-6 rounded-2xl overflow-hidden
                ${isDarkMode ? 'bg-white/8 border-white/20' : 'bg-black/5 border-black/10'}
                border-2 shadow-lg
              `}>
                {user ? (
                  <div className="space-y-0">
                    {/* Dashboard Link Section */}
                    <Link href="/hashedpage" className="block group">
                      <div className={`
                        p-5 transition-all duration-300
                        ${isDarkMode 
                          ? 'hover:bg-white/10 border-b border-white/10' 
                          : 'hover:bg-black/5 border-b border-black/10'
                        }
                      `}>
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#EF3866] to-[#EF3866]/70 p-0.5 shadow-lg">
                              <div className={`
                                w-full h-full rounded-2xl flex items-center justify-center overflow-hidden
                                ${isDarkMode ? 'bg-black' : 'bg-white'}
                              `}>
                                <UserButton>
                                  <UserButton.MenuItems>
                                    <UserButton.Action
                                      label="Dashboard"
                                      labelIcon={<User size={16} />}
                                      onClick={() => router.push("/hashedpage")}
                                    />
                                  </UserButton.MenuItems>
                                </UserButton>
                              </div>
                            </div>
                            
                            {/* Enhanced online indicator */}
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-3 border-white shadow-lg"></div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <LayoutDashboard 
                                size={16} 
                                className={`
                                  ${isDarkMode ? 'text-white/80' : 'text-black/80'}
                                  group-hover:text-[#EF3866] transition-colors duration-300
                                `} 
                              />
                              <p className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-white/80' : 'text-black/80'} group-hover:text-[#EF3866] transition-colors duration-300`}>
                                Dashboard Access
                              </p>
                            </div>
                            <p className={`font-bold text-lg leading-tight ${isDarkMode ? 'text-white' : 'text-black'} truncate`}>
                              {loading ? 'Loading...' : (userProfile?.first_name || user?.firstName || 'User')}
                            </p>
                            <p className={`text-sm font-medium ${isDarkMode ? 'text-white/70' : 'text-black/70'}`}>
                              {loading ? 'Loading...' : (userProfile?.role || 'Member')}
                            </p>
                          </div>

                          <div className="flex flex-col items-center gap-2">
                            <ChevronRight 
                              size={20} 
                              className={`
                                ${isDarkMode ? 'text-white/60 group-hover:text-[#EF3866]' : 'text-black/60 group-hover:text-[#EF3866]'}
                                transition-all duration-300 group-hover:translate-x-1
                              `} 
                              strokeWidth={2.5}
                            />
                            <Bell 
                              size={16} 
                              className={`
                                cursor-pointer transition-colors duration-300
                                ${isDarkMode ? 'text-white/50 hover:text-[#EF3866]' : 'text-black/50 hover:text-[#EF3866]'}
                              `} 
                            />
                          </div>
                        </div>

                        {/* Subtle hover indicator */}
                        <div className={`
                          mt-3 h-0.5 bg-gradient-to-r from-[#EF3866] to-transparent
                          transition-all duration-300 scale-x-0 group-hover:scale-x-100
                          origin-left
                        `}></div>
                      </div>
                    </Link>

                    {/* Sign Out Section */}
                    <div className="p-5">
                      <SignOutBtn />
                    </div>
                  </div>
                ) : (
                  /* Enhanced Sign Up CTA */
                  <Link href="/authentication/sign-up">
                    <button className="w-full group relative overflow-hidden bg-gradient-to-r from-[#EF3866] to-[#EF3866]/80 hover:from-[#d7325a] hover:to-[#d7325a]/80 text-white font-bold px-8 py-5 rounded-2xl transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-[1.02] transform-gpu">
                      <div className="flex items-center justify-center gap-3">
                        <span className="text-sm font-bold tracking-tight">Get Started Today</span>
                        <ArrowRight size={18} strokeWidth={2.5} className="transition-transform group-hover:translate-x-1" />
                      </div>
                      
                      {/* Enhanced shimmer effect */}
                      <div className="absolute inset-0 -top-2 -bottom-2 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 group-hover:animate-pulse"></div>
                    </button>
                  </Link>
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