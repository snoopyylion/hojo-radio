'use client'

import Image from 'next/image'
import React, { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'
import { UserButton } from '@clerk/nextjs'
import { useAppContext } from '@/context/AppContext'
import Link from 'next/link'

const NewNavbar = () => {
  const { user } = useAppContext()
  const [isOpen, setIsOpen] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)

  const toggleSidebar = () => setIsOpen(!isOpen)

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY < 10) setIsVisible(true)
      else if (window.scrollY > lastScrollY + 10) setIsVisible(false)
      else if (window.scrollY < lastScrollY - 10) setIsVisible(true)

      setLastScrollY(window.scrollY)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [lastScrollY])

  return (
    <nav className={`px-6 md:px-28 pt-4 bg-white shadow-sm relative transition-transform duration-300 z-50 ${isVisible ? "translate-y-0" : "-translate-y-full"}`}>
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
            <li><Link href="/" className="hover:text-[#d7325a] transition">Home</Link></li>
            <li><Link href="/about" className="hover:text-[#d7325a] transition">About Us</Link></li>
            <li><Link href="/blog" className="hover:text-[#d7325a] transition">Blog</Link></li>
            <li><Link href="/contact" className="hover:text-[#d7325a] transition">Contact Us</Link></li>
          </ul>
        </div>

        {/* Sign Up / User Button */}
        <div className="hidden md:block">
          {user ? (
            <div className="flex items-center gap-4">
              <span className="text-lg font-medium text-gray-700">Account</span>
              <UserButton />
            </div>
          ) : (
            <Link href="/sign-up">
              <button className="flex items-center gap-4 bg-[#EF3866] hover:bg-[#d7325a] text-white px-6 py-4 rounded-full transition-all text-xl">
                <span className="text-lg">Sign Up</span>
                <Image src="/icons/arrow-circle-right.png" alt="arrow" width={30} height={30} />
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
      <div className={`fixed top-0 right-0 h-screen w-64 bg-[#333333] shadow-lg transform transition-transform duration-300 ease-in-out z-40 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-6 flex flex-col space-y-6">
          <button onClick={toggleSidebar} className="self-end text-[#d7325a] hover:text-gray-300">
            <X size={24} />
          </button>
          <Link href="/" className="text-gray-300 hover:text-[#d7325a]">Home</Link>
          <Link href="/about" className="text-gray-300 hover:text-[#d7325a]">About Us</Link>
          <Link href="/blog" className="text-gray-300 hover:text-[#d7325a]">Blog</Link>
          <Link href="/contact" className="text-gray-300 hover:text-[#d7325a]">Contact Us</Link>

          <div className="mt-72">
            {user ? (
              <div className="flex items-center gap-3 text-white">
                <span className="text-lg">Account:</span>
                <UserButton />
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
      </div>
    </nav>
  )
}

export default NewNavbar
