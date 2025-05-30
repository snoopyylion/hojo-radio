"use client";

import Image from "next/image";
import React, { useEffect, useState, useRef } from "react";
import { Menu, X, Bell, Home, Shield, Mic, BookOpen, Users, ArrowRight } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { useAppContext } from "@/context/AppContext";
import Link from "next/link";
import SignOutBtn from "@/components/SignOutBtn";
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@supabase/supabase-js';
import { gsap } from 'gsap';
import {  usePathname } from 'next/navigation';

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

// Custom hook for dark mode detection
const useDarkMode = () => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check initial preference
    const checkDarkMode = () => {
      if (typeof window !== 'undefined') {
        const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setIsDark(isDarkMode);
      }
    };

    checkDarkMode();

    // Listen for changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setIsDark(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return isDark;
};

const NewNavbar = () => {
  const { user } = useAppContext();
  const pathname = usePathname();
  const isDarkMode = useDarkMode();
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [showSignOut, setShowSignOut] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);

  // Refs for GSAP animations
  const navRef = useRef<HTMLElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const navLinksRef = useRef<HTMLUListElement>(null);
  const authSectionRef = useRef<HTMLDivElement>(null);
  const mobileButtonRef = useRef<HTMLDivElement>(null);

  const toggleSidebar = () => setIsOpen(!isOpen);

  // Close sidebar on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // GSAP Animation on component mount
  useEffect(() => {
    const tl = gsap.timeline();

    // Set initial states - but keep nav links visible on desktop
    gsap.set([logoRef.current, authSectionRef.current, mobileButtonRef.current], {
      opacity: 0,
      y: -20
    });

    // Set nav links initial state only if they exist
    if (navLinksRef.current?.children) {
      gsap.set(navLinksRef.current.children, {
        opacity: 0,
        y: -20
      });
    }

    // Animate navbar background
    tl.fromTo(navRef.current, 
      { 
        opacity: 0,
        y: -100 
      },
      { 
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: "power2.out"
      }
    )
    // Animate logo
    .to(logoRef.current, {
      opacity: 1,
      y: 0,
      duration: 0.6,
      ease: "power2.out"
    }, "-=0.4")
    // Animate nav links with stagger
    .to(navLinksRef.current?.children || [], {
      opacity: 1,
      y: 0,
      duration: 0.5,
      stagger: 0.1,
      ease: "power2.out"
    }, "-=0.3")
    // Animate auth section
    .to(authSectionRef.current, {
      opacity: 1,
      y: 0,
      duration: 0.6,
      ease: "power2.out"
    }, "-=0.4")
    // Animate mobile button
    .to(mobileButtonRef.current, {
      opacity: 1,
      y: 0,
      duration: 0.5,
      ease: "power2.out"
    }, "-=0.3");

    return () => {
      tl.kill();
    };
  }, []);

  // Fetch user profile data from Supabase
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user?.id) {
        setLoading(true);
        try {
          console.log('Fetching profile for user ID:', user.id); // Debug log
          
          // Query using the actual database structure
          const { data, error } = await supabase
            .from('users')
            .select('role, first_name')
            .eq('id', user.id) // Using 'id' as shown in your database
            .single();

          console.log('Supabase response:', { data, error }); // Debug log

          if (data && !error) {
            setUserProfile({
              first_name: data.first_name || 'User',
              role: data.role || 'Member'
            });
            console.log('User profile set:', data); // Debug log
          } else {
            console.error('Supabase error:', error);
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        } finally {
          setLoading(false);
        }
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
        setIsOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Dynamic theme classes
  const sidebarBgClass = isDarkMode 
    ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-black' 
    : 'bg-gradient-to-br from-white via-gray-50 to-gray-100';
  
  const sidebarTextClass = isDarkMode ? 'text-white' : 'text-gray-800';
  const sidebarSecondaryTextClass = isDarkMode ? 'text-gray-300' : 'text-gray-600';
  const sidebarBorderClass = isDarkMode ? 'border-gray-600/30' : 'border-gray-300/50';
  const sidebarHoverBgClass = isDarkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100/80';
  const sidebarCardBgClass = isDarkMode ? 'bg-white/5' : 'bg-gray-100/50';

  return (
    <>
      <nav
        ref={navRef}
        className={`px-6 md:px-28 h-[92px] flex items-center bg-white/70 backdrop-blur-sm shadow-sm fixed top-0 left-0 w-full transition-transform duration-300 z-50 font-sora ${isVisible ? "translate-y-0" : "-translate-y-full"}`}
      >
        <div className="flex items-center justify-between w-full">
          {/* Logo */}
          <div ref={logoRef} className="flex-shrink-0 flex items-center">
            <Link href="/">
              <Image src="/img/logo.png" alt="logo" width={100} height={100} />
            </Link>
          </div>

          {/* Desktop Nav Links - Centered vertically */}
          <div className="hidden md:flex items-center space-x-14 text-sm font-medium text-gray-700 font-sora">
            <ul ref={navLinksRef} className="flex items-center space-x-14">
              {navItems.map((item) => (
                <li key={item.href} className="flex items-center">
                  <Link href={item.href} className="hover:text-[#EF3866] transition font-sora">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Sign Up / User Button - Centered vertically */}
          <div ref={authSectionRef} className="hidden md:flex items-center">
            {user ? (
              <div className="flex items-center gap-4">
                <div
                  className="relative flex items-center"
                  onMouseEnter={() => setShowSignOut(true)}
                  onMouseLeave={() => setShowSignOut(false)}
                >
                  {/* User Info Section */}
                  <div className="flex items-center gap-[2px] w-[212px] h-[50px]">
                    {/* Alarm Icon */}
                    <div className="w-[22.5px] h-[25.37px] flex items-center justify-center">
                      <Image 
                        src="/icons/bell.png" 
                        alt="alarm" 
                        width={16} 
                        height={25.37} 
                        className="hover:text-[#EF3866] cursor-pointer transition" 
                      />
                    </div>

                    <div className="flex w-[161.5px] h-[50px] gap-[5px] items-center">
                      {/* User Button */}
                      <div className="w-[50px] h-[50px] flex items-center justify-center">
                        <UserButton />
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

          {/* Mobile Hamburger */}
          <div ref={mobileButtonRef} className="md:hidden flex items-center">
            <button 
              onClick={toggleSidebar} 
              className="relative flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 hover:from-gray-700 hover:to-gray-900 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <motion.div
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              >
                {isOpen ? 
                  <X size={24} className="text-white" /> : 
                  <Menu size={24} className="text-white" />
                }
              </motion.div>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={`fixed inset-0 z-40 ${isDarkMode ? 'bg-black/70' : 'bg-gray-900/50'} backdrop-blur-sm`}
            onClick={toggleSidebar}
          />
        )}
      </AnimatePresence>

      {/* Artistic Mobile Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ 
              type: 'spring', 
              stiffness: 300, 
              damping: 30,
              opacity: { duration: 0.2 }
            }}
            className={`fixed top-0 right-0 h-screen w-80 ${sidebarBgClass} shadow-2xl z-50 overflow-hidden`}
          >
            {/* Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden">
              <motion.div
                animate={{ 
                  rotate: 360,
                  scale: [1, 1.2, 1],
                }}
                transition={{ 
                  rotate: { duration: 20, repeat: Infinity, ease: "linear" },
                  scale: { duration: 4, repeat: Infinity, ease: "easeInOut" }
                }}
                className={`absolute -top-20 -right-20 w-40 h-40 ${isDarkMode ? 'bg-gradient-to-br from-[#EF3866]/30 to-gray-600/20' : 'bg-gradient-to-br from-[#EF3866]/20 to-gray-400/10'} rounded-full blur-xl`}
              />
              <motion.div
                animate={{ 
                  rotate: -360,
                  scale: [1.2, 1, 1.2],
                }}
                transition={{ 
                  rotate: { duration: 15, repeat: Infinity, ease: "linear" },
                  scale: { duration: 5, repeat: Infinity, ease: "easeInOut" }
                }}
                className={`absolute -bottom-16 -left-16 w-32 h-32 ${isDarkMode ? 'bg-gradient-to-br from-white/20 to-gray-500/20' : 'bg-gradient-to-br from-gray-300/30 to-[#EF3866]/10'} rounded-full blur-xl`}
              />
              
              {/* Floating particles */}
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{
                    y: [-20, 20, -20],
                    x: [-10, 10, -10],
                    opacity: [0.3, 0.8, 0.3],
                  }}
                  transition={{
                    duration: 3 + i * 0.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: i * 0.2,
                  }}
                  className={`absolute w-2 h-2 ${isDarkMode ? 'bg-white/40' : 'bg-gray-800/40'} rounded-full`}
                  style={{
                    left: `${20 + i * 12}%`,
                    top: `${30 + i * 8}%`,
                  }}
                />
              ))}
            </div>

            {/* Sidebar Content */}
            <div className="relative z-10 p-8 h-full flex flex-col">
              {/* Header with Logo */}
              <div className="flex items-center justify-between mb-12">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-8 h-8 relative">
                    <Image 
                      src="/img/logo.png" 
                      alt="logo" 
                      fill
                      className="object-contain"
                    />
                  </div>
                  <span className={`${sidebarTextClass} text-xl font-bold font-sora`}>Menu</span>
                </motion.div>
                
                <motion.button
                  initial={{ opacity: 0, rotate: -90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  transition={{ delay: 0.3 }}
                  onClick={toggleSidebar}
                  className={`w-10 h-10 rounded-full ${isDarkMode ? 'bg-white/10 border-gray-600/30 text-white hover:bg-white/20 hover:border-[#EF3866]/50' : 'bg-gray-200/50 border-gray-300/50 text-gray-800 hover:bg-gray-300/70 hover:border-[#EF3866]/50'} backdrop-blur-sm border flex items-center justify-center transition-all duration-300`}
                >
                  <X size={20} />
                </motion.button>
              </div>

              {/* Navigation Links */}
              <div className="flex-1 space-y-2">
                {navItems.map((item, index) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  
                  return (
                    <motion.div
                      key={item.href}
                      initial={{ opacity: 0, x: 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * index + 0.3 }}
                    >
                      <Link
                        href={item.href}
                        className={`group flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 ${sidebarHoverBgClass} backdrop-blur-sm border border-transparent ${sidebarBorderClass} ${
                          isActive ? `${isDarkMode ? 'bg-white/10' : 'bg-gray-100/80'} ${sidebarBorderClass}` : ''
                        }`}
                      >
                        <div className={`p-2 rounded-xl transition-all duration-300 ${
                          isActive 
                            ? 'bg-gradient-to-br from-[#EF3866] to-gray-700' 
                            : `${isDarkMode ? 'bg-white/10' : 'bg-gray-200/50'} group-hover:bg-gradient-to-br group-hover:from-[#EF3866] group-hover:to-gray-700`
                        }`}>
                          <Icon size={20} className={`${isActive || isDarkMode ? 'text-white' : 'text-gray-700 group-hover:text-white'}`} />
                        </div>
                        <span className={`${sidebarTextClass} font-medium font-sora text-lg group-hover:translate-x-1 transition-transform duration-300`}>
                          {item.label}
                        </span>
                        <ArrowRight 
                          size={16} 
                          className={`${sidebarSecondaryTextClass} group-hover:text-[#EF3866] group-hover:translate-x-1 transition-all duration-300 ml-auto`} 
                        />
                      </Link>
                    </motion.div>
                  );
                })}
              </div>

              {/* User Section */}
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className={`mt-8 p-6 rounded-2xl ${sidebarCardBgClass} backdrop-blur-sm border ${sidebarBorderClass}`}
              >
                {user ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#EF3866] to-gray-700 p-0.5">
                          <div className={`w-full h-full rounded-full ${isDarkMode ? 'bg-black/20' : 'bg-white/50'} flex items-center justify-center`}>
                            <UserButton />
                          </div>
                        </div>
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="absolute -top-1 -right-1 w-4 h-4 bg-[#EF3866] rounded-full border-2 border-black"
                        />
                      </div>
                      
                      <div className="flex-1">
                        <Link href="/hashedpage" className="block">
                          <p className={`${sidebarSecondaryTextClass} text-sm font-sora capitalize`}>
                            {loading ? 'Loading...' : (userProfile?.role || 'Member')}
                          </p>
                          <p className={`${sidebarTextClass} font-semibold text-lg font-sora capitalize`}>
                            {loading ? 'Loading...' : (userProfile?.first_name || user?.firstName || 'User')}
                          </p>
                        </Link>
                      </div>
                      
                      <Bell size={20} className={`${sidebarSecondaryTextClass} hover:text-[#EF3866] cursor-pointer transition-colors`} />
                    </div>
                    
                    <div className={`pt-4 border-t ${sidebarBorderClass}`}>
                      <SignOutBtn />
                    </div>
                  </div>
                ) : (
                  <Link href="/authentication/sign-up">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-[#EF3866] to-gray-700 hover:from-[#d7325a] hover:to-gray-600 text-white font-semibold px-6 py-4 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl font-sora"
                    >
                      <span className="text-lg">Sign Up</span>
                      <ArrowRight size={20} />
                    </motion.button>
                  </Link>
                )}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default NewNavbar;