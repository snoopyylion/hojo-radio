'use client'
import Image from 'next/image'
import React, { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'
import { SignedIn, SignedOut, UserButton, useClerk } from '@clerk/nextjs'
import { useAppContext } from '@/context/AppContext'

const Navbar = () => {
  const { user } = useAppContext()
  const [isOpen, setIsOpen] = useState(false)
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const { openSignIn } = useClerk()

  const toggleSidebar = () => {
    setIsOpen(!isOpen)
  }

  // Handle click to open sign-in modal
  const handleSignInClick = (event: React.MouseEvent<HTMLDivElement>) => {
    openSignIn()  // No need to pass event or props here
  }

  // Always provide a valid handler, even if it's a no-op (empty function)
  const onClickHandler = user ? () => {} : handleSignInClick;

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
        <div onClick={onClickHandler}>
            <button className="flex items-center gap-4 bg-[#EF3866] hover:bg-[#d7325a] text-white px-6 py-4 rounded-full transition-all text-xl">
              {user ? (
                <>
                  <span className="text-xl">Account</span> {/* More professional word */}
                  <UserButton />
                </>
              ) : (
                <>
                  <span className="text-xl">Sign Up</span>
                  <Image
                    src="/icons/arrow-circle-right.png"
                    alt="arrow"
                    width={50}
                    height={50}
                    className="w-[30px] h-[30px]"  // Adjust icon size
                  />
                </>
              )}
            </button>
        </div>

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
            <a href="/" className="text-gray-300 hover:text-[#d7325a]">Home</a>
            <a href="/about" className="text-gray-300 hover:text-[#d7325a]">About Us</a>
            <a href="/blog" className="text-gray-300 hover:text-[#d7325a]">Blog</a>
            <a href="/contact" className="text-gray-300 hover:text-[#d7325a]">Contact Us</a>
            <div onClick={onClickHandler}>
              <button className="flex items-center gap-3 bg-[#EF3866] hover:bg-[#d7325a] text-white font-semibold px-5 py-2 rounded-full transition-all text-sm md:text-base">
                {user ? (
                  <>
                    <span className="text-lg font-medium">Account</span>
                    <UserButton />
                  </>
                ) : (
                  <>
                    <span className="text-lg font-medium">Sign Up</span>
                    <Image
                      src="/icons/arrow-circle-right.png"
                      alt="arrow"
                      width={20}
                      height={20}
                      className="w-4 h-4 md:w-5 md:h-5"
                    />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

    </nav>
  )
}

export default Navbar
