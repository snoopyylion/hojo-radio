"use client";

import Image from "next/image";
import React, { useEffect, useState } from "react";
import { Menu, X, Home, Shield, Mic, BookOpen, Users, User } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { useAppContext } from "@/context/AppContext";
import Link from "next/link";
import SignOutBtn from "@/components/SignOutBtn";
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@supabase/supabase-js';
import { usePathname, useRouter } from 'next/navigation';
import MobileSidebar from '@/components/MobileSidebar';
import SearchComponent from '@/components/SearchComponent';

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

// Navigation items with icons
const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/verify-news", label: "Verify News", icon: Shield },
  { href: "/podcast", label: "Podcast", icon: Mic },
  { href: "/blog", label: "Blog", icon: BookOpen },
  { href: "/aboutus", label: "About Us", icon: Users },
];

const NewNavbar = () => {
  const { user } = useAppContext();
  const pathname = usePathname();
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [showSignOut, setShowSignOut] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Mobile sidebar handlers
  const toggleMobileSidebar = () => setIsMobileSidebarOpen(!isMobileSidebarOpen);
  const closeMobileSidebar = () => setIsMobileSidebarOpen(false);

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
          .maybeSingle(); // safer than .single()

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

          {/* Desktop Nav Links with Search */}
          <div className="hidden md:flex items-center space-x-8 text-sm font-medium text-gray-700 font-sora">
            {/* Navigation Links */}
            <div className="flex items-center space-x-14">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} className="hover:text-[#EF3866] transition font-sora">
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Auth Section */}
          <div className="hidden md:flex items-center">
            {/* Desktop Search Component */}
            <SearchComponent />
            {user ? (
              <div className="flex items-center gap-4">
                <div
                  className="relative flex items-center"
                  onMouseEnter={() => setShowSignOut(true)}
                  onMouseLeave={() => setShowSignOut(false)}
                >
                  {/* User Info Section */}
                  <div className="flex items-center gap-[2px] w-[212px] h-[50px]">                    
                    <div className="flex w-[161.5px] h-[50px] gap-[5px] items-center">
                      {/* User Button */}
                      <div className="w-[50px] h-[50px] flex items-center justify-center">
                        <UserButton afterSignOutUrl="/">
                          <UserButton.MenuItems>
                            <UserButton.Action
                              label="Dashboard"
                              labelIcon={<User size={16} />}
                              onClick={() => router.push("/hashedpage")}
                            />
                          </UserButton.MenuItems>
                        </UserButton>
                      </div>

                      {/* User Profile Info */}
                      <Link href="/hashedpage" className="flex flex-col justify-center h-8 text-sm">
                        <span className="text-[#656565] text-[18px] leading-[100%] font-sora font-semibold capitalize">
                          {loading ? 'Loading...' : (userProfile?.role || 'Member')}
                        </span>
                        <span className="text-[#111827] text-[20px] leading-[100%] font-semibold capitalize">
                          {loading ? 'Loading...' : (userProfile?.first_name || user?.firstName || 'User')}
                        </span>
                      </Link>
                    </div>

                  </div>

                  <AnimatePresence>
                    {showSignOut && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute w-[120px] right-14 top-10 mt-5 bg-gray-50 border border-gray-200 shadow-lg rounded-lg p-2 z-50 m-auto"
                      >
                        <SignOutBtn />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
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
            {/* Mobile Search Component - you can pass isMobile prop if needed */}
            <div className="md:hidden">
              <SearchComponent isMobile={true} />
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={toggleMobileSidebar}
              className="relative flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 hover:from-gray-700 hover:to-gray-900 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              {isMobileSidebarOpen ? (
                <X size={24} className="text-white" />
              ) : (
                <Menu size={24} className="text-white" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Sidebar Integration */}
      <MobileSidebar 
        isOpen={isMobileSidebarOpen} 
        onClose={closeMobileSidebar} 
      />
    </>
  );
};

export default NewNavbar;