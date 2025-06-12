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
  Mail,
  MapPin
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
          { opacity: 0 },
          {
            opacity: 1,
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
      className="bg-white dark:bg-black border-t border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300"
    >
      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <div className="flex items-center mb-4">
              <Image
                src="/img/footerlogo.png"
                alt="Hojo logo"
                width={40}
                height={40}
                className="mr-3 dark:invert"
                priority
              />
            </div>
            
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 max-w-md leading-relaxed">
              Cutting through misinformation with AI-driven analysis, providing real-time verification on trending news.
            </p>

            {/* Contact Info */}
            <div className="space-y-2">
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <Mail size={16} className="mr-2 text-gray-500" />
                <span>contact@hojo.news</span>
              </div>
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <MapPin size={16} className="mr-2 text-gray-500" />
                <span>Lagos, Nigeria</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 uppercase tracking-wide">
              Quick Links
            </h3>
            <ul className="space-y-2">
              {['Home', 'Verify News', 'About', 'FAQ'].map((link, index) => (
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
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 uppercase tracking-wide">
              Company
            </h3>
            <ul className="space-y-2">
              {['About Us', 'Blog', 'Careers', 'Contact'].map((link, index) => (
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

        {/* Divider */}
        <div className="border-t border-gray-200 dark:border-gray-800 mt-12 pt-8">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
            
            {/* Copyright */}
            <div className="text-sm text-gray-600 dark:text-gray-400">
              &copy; {year} Hojo. All rights reserved.
            </div>
            
            {/* Social Links & Scroll to Top */}
            <div className="flex items-center space-x-4">
              
              {/* Social Icons */}
              <div className="flex space-x-3">
                {[
                  { icon: Facebook, href: '#', label: 'Facebook' },
                  { icon: X, href: '#', label: 'X (Twitter)' },
                  { icon: Instagram, href: '#', label: 'Instagram' }
                ].map(({ icon: Icon, href, label }, index) => (
                  <a 
                    key={index}
                    href={href} 
                    aria-label={label} 
                    className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors duration-200"
                  >
                    <Icon size={20} />
                  </a>
                ))}
              </div>

              {/* Divider */}
              <div className="h-5 w-px bg-gray-300 dark:bg-gray-700"></div>

              {/* Scroll to Top */}
              <button
                onClick={scrollToTop}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors duration-200 p-1"
                aria-label="Scroll to top"
              >
                <ArrowUp size={20} />
              </button>
              
              {/* Legal Links */}
              <div className="hidden sm:flex space-x-4 ml-4">
                {['Privacy', 'Terms'].map((link, index) => (
                  <a 
                    key={index}
                    href="#" 
                    className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors duration-200"
                  >
                    {link}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Mobile Legal Links */}
          <div className="flex justify-center space-x-6 mt-4 sm:hidden">
            {['Privacy Policy', 'Terms of Service'].map((link, index) => (
              <a 
                key={index}
                href="#" 
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors duration-200"
              >
                {link}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer