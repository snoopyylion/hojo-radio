'use client'

import Image from 'next/image'
import React, { useState } from 'react'
import LinkButton from './LinkButton'
import { Menu, X } from 'lucide-react'
import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs'

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false)

  const toggleSidebar = () => {
    setIsOpen(!isOpen)
  }

  return (
    <nav className="px-6 md:px-12 pt-4 bg-white shadow-sm relative z-50">
      <div className="flex items-center justify-between">
        {/* Logo */}
        <div className="flex-shrink-0">
          <Image src="/img/logo.png" alt="logo" width={100} height={100} />
        </div>

        {/* Desktop Nav Links */}
        <div className="hidden md:flex space-x-14 text-sm font-medium text-gray-700">
          <ul className="flex space-x-14">
            <li className="cursor-pointer hover:text-blue-600 transition">Home</li>
            <li className="cursor-pointer hover:text-blue-600 transition">About Us</li>
            <li className="cursor-pointer hover:text-blue-600 transition">Blog</li>
            <li className="cursor-pointer hover:text-blue-600 transition">Contact Us</li>
          </ul>
        </div>

       {/* Sign Up / User Button */}
       <div className="hidden md:block">
          <SignedOut>
            <LinkButton title="Sign Up" href="/sign-up" />
          </SignedOut>
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
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
        className={`fixed top-0 right-0 h-full w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out z-50 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-6 flex flex-col space-y-6">
          <button onClick={toggleSidebar} className="self-end">
            <X size={24} />
          </button>
          <a href="/" className="text-gray-700 hover:text-blue-600">Home</a>
          <a href="/about" className="text-gray-700 hover:text-blue-600">About Us</a>
          <a href="/blog" className="text-gray-700 hover:text-blue-600">Blog</a>
          <a href="/contact" className="text-gray-700 hover:text-blue-600">Contact Us</a>
          <SignedOut>
          <LinkButton title="Sign Up" href="/sign-up" />
        </SignedOut>
        <SignedIn>
          <UserButton afterSignOutUrl="/" />
        </SignedIn>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
