"use client";

import Image from 'next/image'
import React, { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  Facebook,
  Instagram,
  Twitter as X,
  ArrowUp,
  Mail
} from 'lucide-react'

// Register GSAP plugins
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

const Footer = () => {
  const year = new Date().getFullYear()
  const footerRef = useRef(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && footerRef.current) {
      const ctx = gsap.context(() => {
        // Simple fade-in animation on scroll
        gsap.fromTo(footerRef.current, 
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: "power2.out",
            scrollTrigger: {
              trigger: footerRef.current,
              start: "top 95%",
              once: true
            }
          }
        )
      }, footerRef)

      return () => ctx.revert()
    }
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <footer 
      ref={footerRef}
      className="bg-white dark:bg-black border-t border-gray-200 dark:border-gray-800"
    >
      <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12 lg:py-16">
        
        {/* Main Content */}
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-8 lg:gap-12">
          
          {/* Brand & Description */}
          <div className="flex-1 max-w-md">
            <div className="flex items-center mb-4">
              <Image
                src="/img/footerlogo.png"
                alt="Hojo logo"
                width={32}
                height={32}
                className="mr-3 dark:invert"
                priority
              />
            </div>
            
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
              AI-driven news verification. Real-time analysis of trending stories.
            </p>
          </div>

          {/* Navigation Links */}
          <div className="flex flex-col sm:flex-row gap-8 sm:gap-12 lg:gap-16">
            
            {/* Product Links */}
            <div className="min-w-0">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                Product
              </h3>
              <ul className="space-y-2">
                {['Verify News', 'About', 'FAQ'].map((link, index) => (
                  <li key={index}>
                    <a 
                      href="#" 
                      className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-200"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company Links */}
            <div className="min-w-0">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                Company
              </h3>
              <ul className="space-y-2">
                {['Blog', 'Careers', 'Contact'].map((link, index) => (
                  <li key={index}>
                    <a 
                      href="#" 
                      className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-200"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-200 dark:border-gray-800 mt-8 pt-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            
            {/* Copyright & Legal */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-600 dark:text-gray-400">
              <span>&copy; {year} Hojo. All rights reserved.</span>
              <div className="flex gap-4">
                <a 
                  href="#" 
                  className="hover:text-gray-900 dark:hover:text-white transition-colors duration-200"
                >
                  Privacy
                </a>
                <a 
                  href="#" 
                  className="hover:text-gray-900 dark:hover:text-white transition-colors duration-200"
                >
                  Terms
                </a>
              </div>
            </div>
            
            {/* Social & Actions */}
            <div className="flex items-center gap-4">
              
              {/* Social Icons */}
              <div className="flex gap-3">
                {[
                  { icon: Facebook, href: '#', label: 'Facebook' },
                  { icon: X, href: '#', label: 'X' },
                  { icon: Instagram, href: '#', label: 'Instagram' }
                ].map(({ icon: Icon, href, label }, index) => (
                  <a 
                    key={index}
                    href={href} 
                    aria-label={label} 
                    className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors duration-200 p-1"
                  >
                    <Icon size={18} />
                  </a>
                ))}
              </div>

              {/* Scroll to Top */}
              <button
                onClick={scrollToTop}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors duration-200 p-1 ml-2"
                aria-label="Scroll to top"
              >
                <ArrowUp size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer