"use client";

import Image from "next/image";
import React, { useEffect, useState } from "react";
import { Menu, X, Bell } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { useAppContext } from "@/context/AppContext";
import Link from "next/link";
import SignOutBtn from "@/components/SignOutBtn";
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@supabase/supabase-js';

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

const NewNavbar = () => {
  const { user } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [showSignOut, setShowSignOut] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);

  const toggleSidebar = () => setIsOpen(!isOpen);

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

  return (
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

        {/* Desktop Nav Links - Centered vertically */}
        <div className="hidden md:flex items-center space-x-14 text-sm font-medium text-gray-700 font-sora">
          <ul className="flex items-center space-x-14">
            <li className="flex items-center">
              <Link href="/" className="hover:text-[#d7325a] transition font-sora">
                Home
              </Link>
            </li>
            <li className="flex items-center">
              <Link href="/verify-news" className="hover:text-[#d7325a] transition font-sora">
                Verify News
              </Link>
            </li>
            <li className="flex items-center">
              <Link href="/" className="hover:text-[#d7325a] transition font-sora">
                Podcast
              </Link>
            </li>
            <li className="flex items-center">
              <Link href="/blog" className="hover:text-[#d7325a] transition font-sora">
                Blog
              </Link>
            </li>
            <li className="flex items-center">
              <Link href="/aboutus" className="hover:text-[#d7325a] transition font-sora">
                About Us
              </Link>
            </li>
          </ul>
        </div>

        {/* Sign Up / User Button - Centered vertically */}
        <div className="hidden md:flex items-center">
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
                    <Image src="/icons/bell.png" alt="alarm" width={16} height={25.37} className=" hover:text-[#d7325a] cursor-pointer transition" />
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
        <div className="md:hidden flex items-center">
          <button onClick={toggleSidebar} className="flex items-center justify-center">
            {isOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed top-0 right-0 h-screen w-64 bg-white dark:bg-black shadow-lg dark:shadow-gray-900/50 z-40"
          >
            <div className="p-6 flex flex-col space-y-6">
              <button
                onClick={toggleSidebar}
                className="self-end text-[#d7325a] hover:text-gray-500 dark:hover:text-gray-300"
              >
                <X size={24} />
              </button>
              <Link href="/" className="text-gray-700 dark:text-gray-300 hover:text-[#d7325a] dark:hover:text-[#d7325a] font-sora">
                Home
              </Link>
              <Link href="/verify-news" className="text-gray-700 dark:text-gray-300 hover:text-[#d7325a] dark:hover:text-[#d7325a] font-sora">
                Verify News
              </Link>
              <Link href="/" className="text-gray-700 dark:text-gray-300 hover:text-[#d7325a] dark:hover:text-[#d7325a] font-sora">
                Podcast
              </Link>
              <Link href="/blog" className="text-gray-700 dark:text-gray-300 hover:text-[#d7325a] dark:hover:text-[#d7325a] font-sora">
                Blog
              </Link>
              <Link href="/aboutus" className="text-gray-700 dark:text-gray-300 hover:text-[#d7325a] dark:hover:text-[#d7325a] font-sora">
                About Us
              </Link>

              <div className="mt-auto pt-[60px] border-t border-gray-200 dark:border-gray-700">
                {user ? (
                  <div className="flex flex-col gap-4 bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-gray-800 dark:text-white">
                    <span className="text-base font-semibold border-b border-gray-300 dark:border-gray-600 pb-2 font-sora">
                      Account
                    </span>
                    <div className="flex items-center gap-3">
                      {/* Alarm Icon */}
                      <div className="w-8 h-8 flex items-center justify-center">
                        <Bell size={20} className="text-gray-600 dark:text-gray-400 hover:text-[#d7325a] cursor-pointer transition" />
                      </div>
                      
                      {/* User Profile Info */}
                      <div className="flex flex-col justify-center h-8 text-sm font-sora flex-1">
                        <span className="text-gray-500 dark:text-gray-400 text-xs leading-tight capitalize">
                          {loading ? 'Loading...' : (userProfile?.role || 'Member')}
                        </span>
                        <span className="text-gray-800 dark:text-white font-medium leading-tight">
                          {loading ? 'Loading...' : (userProfile?.first_name || user?.firstName|| 'User')}
                        </span>
                      </div>
                      
                      {/* User Button */}
                      <div className="w-8 h-8">
                        <UserButton />
                      </div>
                    </div>
                    
                    <div className="mt-2 pt-2 border-t border-gray-300 dark:border-gray-600">
                      <SignOutBtn />
                    </div>
                  </div>
                ) : (
                  <Link href="/authentication/sign-up">
                    <button className="flex items-center gap-3 bg-[#EF3866] hover:bg-[#d7325a] text-white font-semibold px-5 py-2 rounded-full transition-all text-sm md:text-base font-sora">
                      <span className="text-lg font-sora">Sign Up</span>
                      <Image
                        src="/icons/arrow-circle-right.png"
                        alt="arrow"
                        width={20}
                        height={20}
                        className="w-6 h-6 md:w-8 md:h-8"
                      />
                    </button>
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default NewNavbar;