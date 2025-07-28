'use client'
import Image from 'next/image'
import React, { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'
import { UserButton, useClerk } from '@clerk/nextjs'
import { useAppContext } from '@/context/AppContext'
import Link from 'next/link'

const Navbar = () => {
  const { user } = useAppContext()
  const [isOpen, setIsOpen] = useState(false)
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const { openSignIn } = useClerk();

  const toggleSidebar = () => {
    setIsOpen(!isOpen)
  }

  // Handle click to open sign-in modal
  const handleSignInClick = () => {
    if (!user) {
      openSignIn();
    }
  };
  

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY < 10) {
        // Always show navbar when at the top
        setIsVisible(true);
      } else if (window.scrollY > lastScrollY + 10) {
        // Scrolling down, hide navbar
        setIsVisible(false);
      } else if (window.scrollY < lastScrollY - 10) {
        // Scrolling up, show navbar
        setIsVisible(true);
      }

      setLastScrollY(window.scrollY);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  return (
    <nav className={`px-6 md:px-28 pt-4 bg-white shadow-sm relative transition-transform duration-300 z-50 ${
        isVisible ? "translate-y-0" : "-translate-y-full"
      }`}>
      <div className="flex items-center justify-between">
        {/* Logo */}
        <div className="flex-shrink-0">
          <Image src="/img/logo.png" alt="logo" width={100} height={100} />
        </div>

        {/* Desktop Nav Links */}
        <div className="hidden md:flex space-x-14 text-sm font-medium text-gray-700">
          <ul className="flex space-x-14">
            <li className="cursor-pointer hover:text-[#d7325a] transition">Home</li>
            <li className="cursor-pointer hover:text-[#d7325a] transition">About Us</li>
            <li className="cursor-pointer hover:text-[#d7325a] transition">Blog</li>
            <li className="cursor-pointer hover:text-[#d7325a] transition">Contact Us</li>
          </ul>
        </div>

        {/* Sign Up / User Button */}
        <div className="hidden md:block">
          {user ? (
            <div onClick={handleSignInClick}>
              <button className="flex items-center gap-4 bg-[#EF3866] hover:bg-[#d7325a] text-white px-6 py-4 rounded-full transition-all text-xl">
                <span className="text-lg">Account</span>
                <UserButton />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              {/* Login Button */}
              <button 
                onClick={handleSignInClick}
                className="flex items-center gap-2 px-6 py-3 text-[#EF3866] border-2 border-[#EF3866] rounded-full transition-all hover:bg-[#EF3866] hover:text-white font-semibold"
              >
                <span className="text-lg">Login</span>
              </button>
              
              {/* Get Started Button */}
              <Link href="/authentication/sign-up">
                <button className="flex items-center gap-3 bg-[#EF3866] hover:bg-[#d7325a] text-white px-6 py-3 rounded-full transition-all font-semibold">
                  <span className="text-lg">Get Started</span>
                  <Image
                    src="/icons/arrow-circle-right.png"
                    alt="arrow"
                    width={50}
                    height={50}
                    className="w-[24px] h-[24px]"
                  />
                </button>
              </Link>
            </div>
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
      <div
          className={`fixed top-0 right-0 h-screen w-64 bg-[#333333] shadow-lg transform transition-transform duration-300 ease-in-out z-40 ${
            isOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="p-6 flex flex-col space-y-6">
            <button onClick={toggleSidebar} className="self-end text-gray-300 hover:text-[#d7325a]">
              <X size={24} />
            </button>
            <Link href="/" className="text-gray-300 hover:text-[#d7325a]">Home</Link>
            <Link href="/about" className="text-gray-300 hover:text-[#d7325a]">About Us</Link>
            <Link href="/blog" className="text-gray-300 hover:text-[#d7325a]">Blog</Link>
            <Link href="/contact" className="text-gray-300 hover:text-[#d7325a]">Contact Us</Link>
            
            {user ? (
              <div onClick={handleSignInClick} className='flex mt-72'>
                <button className="flex items-center gap-3 bg-[#EF3866] hover:bg-[#d7325a] text-white font-semibold px-5 py-2 rounded-full transition-all text-sm md:text-base">
                  <span className="text-lg">Account</span>
                  <UserButton />
                </button>
              </div>
            ) : (
              <div className='flex flex-col gap-3 mt-72'>
                {/* Login Button */}
                <button 
                  onClick={handleSignInClick}
                  className="flex items-center justify-center gap-2 px-5 py-3 text-[#EF3866] border-2 border-[#EF3866] rounded-full transition-all hover:bg-[#EF3866] hover:text-white font-semibold"
                >
                  <span className="text-lg">Login</span>
                </button>
                
                {/* Get Started Button */}
                <Link href="/authentication/sign-up">
                  <button className="flex items-center justify-center gap-3 bg-[#EF3866] hover:bg-[#d7325a] text-white font-semibold px-5 py-3 rounded-full transition-all text-sm md:text-base w-full">
                    <span className="text-lg">Get Started</span>
                    <Image
                      src="/icons/arrow-circle-right.png"
                      alt="arrow"
                      width={20}
                      height={20}
                      className="w-6 h-6 md:w-8 md:h-8"
                    />
                  </button>
                </Link>
              </div>
            )}
          </div>
        </div>

    </nav>
  )
}

export default Navbar
