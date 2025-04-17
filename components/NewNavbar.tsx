"use client";

import Image from "next/image";
import React, { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { useAppContext } from "@/context/AppContext";
import Link from "next/link";
import SignOutBtn from "@/components/SignOutBtn";
import { motion, AnimatePresence } from 'framer-motion'
import LinkButton from "./LinkButton";

const NewNavbar = () => {
  const { user } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [showSignOut, setShowSignOut] = useState(false);

  const toggleSidebar = () => setIsOpen(!isOpen);

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
      className={`px-6 md:px-28 pt-4 bg-white/70 backdrop-blur-sm shadow-sm fixed top-0 left-0 w-full transition-transform duration-300 z-50 ${isVisible ? "translate-y-0" : "-translate-y-full"}`}
    >

      <div className="flex items-center justify-between">
        {/* Logo */}
        <div className="flex-shrink-0">
          <Link href="/">
            <Image src="/img/logo.png" alt="logo" width={100} height={100} />
          </Link>
        </div>

        {/* Desktop Nav Links */}
        <div className="hidden md:flex space-x-14 text-sm font-medium text-gray-700">
          <ul className="flex space-x-14">
            <li>
              <Link href="/" className="hover:text-[#d7325a] transition">
                Home
              </Link>
            </li>
            <li>
              <Link href="/aboutus" className="hover:text-[#d7325a] transition">
                About Us
              </Link>
            </li>
            <li>
              <Link href="/blog" className="hover:text-[#d7325a] transition">
                Blog
              </Link>
            </li>
            <li>
              <Link href="/contactus" className="hover:text-[#d7325a] transition">
                Contact Us
              </Link>
            </li>
            <li>
              <Link href="/hashedpage" className="hover:text-[#d7325a] transition">
                Dashboard
              </Link>
            </li>
          </ul>
        </div>

        {/* Sign Up / User Button */}
        <div className="hidden md:block">
          {user ? (
            <div className="flex items-center gap-4">
              <div
                className="relative"
                onMouseEnter={() => setShowSignOut(true)}
                onMouseLeave={() => setShowSignOut(false)}
              >
                <UserButton />
                <AnimatePresence>
                  {showSignOut && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="absolute w-[120px] right-0 mt-2 bg-gray-50 border border-gray-200 shadow-lg rounded-lg p-2 z-50 m-auto"
                    >
                      <SignOutBtn />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {user?.role === "author" && (
                <LinkButton title="Create post" href="/create-post" />
              )}
            </div>
          ) : (
            <Link href="/sign-up">
              <button className="flex items-center gap-4 bg-[#EF3866] hover:bg-[#d7325a] text-white px-6 py-4 rounded-full transition-all text-xl">
                <span className="text-lg">Sign Up</span>
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
        <div className="md:hidden">
          <button onClick={toggleSidebar}>
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
            className="fixed top-0 right-0 h-screen w-64 bg-[#333333] shadow-lg z-40"
          >
            <div className="p-6 flex flex-col space-y-6">
              <button
                onClick={toggleSidebar}
                className="self-end text-[#d7325a] hover:text-gray-300"
              >
                <X size={24} />
              </button>
              <Link href="/" className="text-gray-300 hover:text-[#d7325a]">
                Home
              </Link>
              <Link href="/aboutus" className="text-gray-300 hover:text-[#d7325a]">
                About Us
              </Link>
              <Link href="/blog" className="text-gray-300 hover:text-[#d7325a]">
                Blog
              </Link>
              <Link href="/contactus" className="text-gray-300 hover:text-[#d7325a]">
                Contact Us
              </Link>
              <Link href="/hashedpage" className="text-gray-300 hover:text-[#d7325a]">
                Dashboard
              </Link>
              {user?.role === "author" && (
                <LinkButton title="Create post" href="/create-post" />
              )}

              <div className="mt-52">
                {user ? (
                  <div className="flex flex-col gap-4 bg-[#444] rounded-lg p-4 text-white">
                    <span className="text-base font-semibold border-b border-gray-500 pb-2">
                      Account
                    </span>
                    <div className="flex items-center justify-between">
                      <UserButton />
                      <SignOutBtn />
                    </div>
                  </div>
                ) : (
                  <Link href="/sign-up">
                    <button className="flex items-center gap-3 bg-[#EF3866] hover:bg-[#d7325a] text-white font-semibold px-5 py-2 rounded-full transition-all text-sm md:text-base">
                      <span className="text-lg">Sign Up</span>
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