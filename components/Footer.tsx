"use client";

import Image from 'next/image'
import React, { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ScrollToPlugin } from 'gsap/ScrollToPlugin'
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
  gsap.registerPlugin(ScrollTrigger, ScrollToPlugin)
}

const Footer = () => {
  const year = new Date().getFullYear()
  const footerRef = useRef(null)
  const logoRef = useRef<HTMLDivElement>(null)
  const linksRef = useRef<HTMLElement[]>([])
  const socialRef = useRef<HTMLElement[]>([])
  const dividerRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Logo animation
      gsap.fromTo(logoRef.current, 
        {
          opacity: 0,
          y: 30,
          scale: 0.8
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: footerRef.current,
            start: "top 80%",
            toggleActions: "play none none reverse"
          }
        }
      )

      // Links animation
      gsap.fromTo(linksRef.current,
        {
          opacity: 0,
          y: 40,
          stagger: 0.1
        },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.15,
          ease: "power2.out",
          scrollTrigger: {
            trigger: footerRef.current,
            start: "top 70%",
            toggleActions: "play none none reverse"
          }
        }
      )

      // Social icons animation
      gsap.fromTo(socialRef.current,
        {
          opacity: 0,
          scale: 0,
          rotation: -180
        },
        {
          opacity: 1,
          scale: 1,
          rotation: 0,
          duration: 0.6,
          stagger: 0.1,
          ease: "back.out(1.7)",
          scrollTrigger: {
            trigger: footerRef.current,
            start: "top 60%",
            toggleActions: "play none none reverse"
          }
        }
      )

      // Divider animation
      gsap.fromTo(dividerRef.current,
        {
          scaleX: 0,
          opacity: 0
        },
        {
          scaleX: 1,
          opacity: 1,
          duration: 1.2,
          ease: "power2.out",
          scrollTrigger: {
            trigger: footerRef.current,
            start: "top 50%",
            toggleActions: "play none none reverse"
          }
        }
      )

      // Bottom section animation
      gsap.fromTo(bottomRef.current,
        {
          opacity: 0,
          y: 20
        },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power2.out",
          scrollTrigger: {
            trigger: footerRef.current,
            start: "top 40%",
            toggleActions: "play none none reverse"
          }
        }
      )

      // Hover animations for social icons
      socialRef.current.forEach((icon: HTMLElement | null) => {
        if (icon) {
          const handleMouseEnter = () => {
            gsap.to(icon, {
              scale: 1.2,
              y: -5,
              duration: 0.3,
              ease: "power2.out"
            })
          }
          
          const handleMouseLeave = () => {
            gsap.to(icon, {
              scale: 1,
              y: 0,
              duration: 0.3,
              ease: "power2.out"
            })
          }

          icon.addEventListener('mouseenter', handleMouseEnter)
          icon.addEventListener('mouseleave', handleMouseLeave)

          // Cleanup function
          return () => {
            icon.removeEventListener('mouseenter', handleMouseEnter)
            icon.removeEventListener('mouseleave', handleMouseLeave)
          }
        }
      })

    }, footerRef)

    return () => ctx.revert()
  }, [])

  const scrollToTop = () => {
    gsap.to(window, {
      duration: 1.2,
      scrollTo: { y: 0 },
      ease: "power2.inOut"
    })
  }

  const addToRefs = (el: HTMLElement | null, refsArray: React.MutableRefObject<HTMLElement[]>) => {
    if (el && !refsArray.current.includes(el)) {
      refsArray.current.push(el)
    }
  }

  return (
    <footer 
      ref={footerRef}
      className="font-sora bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-black border-t border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 px-4 py-12 sm:px-6 sm:py-16 relative overflow-hidden"
    >
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5 dark:opacity-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-[#EF3866] to-pink-400 rounded-full filter blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-blue-400 to-purple-400 rounded-full filter blur-3xl"></div>
      </div>

      <div className="w-full max-w-7xl mx-auto relative z-10">
        {/* Footer Top */}
        <div className="flex flex-col lg:flex-row justify-between items-start gap-8 sm:gap-12 mb-12 lg:mb-16">
          {/* Left Section */}
          <div 
            ref={logoRef}
            className="flex flex-col items-center lg:items-start w-full lg:w-2/5 text-center lg:text-left"
          >
            <div className="relative mb-6">
              <Image
                src="/img/footerlogo.png"
                alt="Hojo logo"
                width={100}
                height={100}
                className="mb-4 block dark:hidden drop-shadow-lg"
              />
              <Image
                src="/img/footerlogo.png"
                alt="Hojo logo"
                width={100}
                height={100}
                className="mb-4 hidden dark:block dark:invert dark:brightness-200 dark:contrast-200 drop-shadow-lg"
              />
              <div className="absolute -inset-4 bg-gradient-to-r from-[#EF3866]/20 to-pink-400/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
            
            <p className="font-sora leading-relaxed max-w-md text-sm md:text-base text-gray-600 dark:text-gray-400 mb-6">
              Cutting through misinformation with AI-driven analysis, providing real-time verification on trending news.
            </p>

            {/* Contact info */}
            <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <Mail size={16} className="text-[#EF3866]" />
                <span>contact@hojo.news</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-[#EF3866]" />
                <span>Lagos, Nigeria</span>
              </div>
            </div>
          </div>

          {/* Right Section */}
          <div className="flex flex-row sm:flex-row justify-between gap-8 sm:gap-12 lg:gap-16 w-full lg:w-3/5">
            <div 
              ref={el => addToRefs(el, linksRef)}
              className="min-w-32"
            >
              <h3 className="font-sora text-lg font-bold mb-4 text-gray-900 dark:text-white">Quick Links</h3>
              <ul className="space-y-3 text-sm">
                {['Home', 'Verify News', 'About', 'FAQ'].map((link, index) => (
                  <li key={index} className="group">
                    <a 
                      href="#" 
                      className="font-sora hover:text-[#EF3866] dark:hover:text-[#ff7a9c] transition-colors duration-300 relative"
                    >
                      <span className="relative z-10">{link}</span>
                      <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-[#EF3866] to-pink-400 group-hover:w-full transition-all duration-300"></span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div 
              ref={el => addToRefs(el, linksRef)}
              className="min-w-32"
            >
              <h3 className="font-sora text-lg font-bold mb-4 text-gray-900 dark:text-white">Company</h3>
              <ul className="space-y-3 text-sm">
                {['About Us', 'Blog', 'Careers', 'Contact', 'Press'].map((link, index) => (
                  <li key={index} className="group">
                    <a 
                      href="#" 
                      className="font-sora hover:text-[#EF3866] dark:hover:text-[#ff7a9c] transition-colors duration-300 relative"
                    >
                      <span className="relative z-10">{link}</span>
                      <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-[#EF3866] to-pink-400 group-hover:w-full transition-all duration-300"></span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div 
              ref={el => addToRefs(el, linksRef)}
              className="min-w-32"
            >
              <h3 className="font-sora text-lg font-bold mb-4 text-gray-900 dark:text-white">Legal</h3>
              <ul className="space-y-3 text-sm">
                {['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'Disclaimer'].map((link, index) => (
                  <li key={index} className="group">
                    <a 
                      href="#" 
                      className="font-sora hover:text-[#EF3866] dark:hover:text-[#ff7a9c] transition-colors duration-300 relative"
                    >
                      <span className="relative z-10">{link}</span>
                      <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-[#EF3866] to-pink-400 group-hover:w-full transition-all duration-300"></span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Animated Divider */}
        <div 
          ref={dividerRef}
          className="h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent mb-8"
        ></div>

        {/* Footer Bottom */}
        <div 
          ref={bottomRef}
          className="flex flex-col sm:flex-row justify-between items-center gap-6 text-sm"
        >
          <div className="font-sora text-gray-600 dark:text-gray-400">
            &copy; {year} Hojo. All rights reserved.
          </div>
          
          <div className="flex items-center gap-6">
            {/* Social Icons */}
            <div className="flex gap-4">
              {[
                { icon: Facebook, color: 'hover:text-blue-600', label: 'Facebook' },
                { icon: X, color: 'hover:text-black dark:hover:text-white', label: 'X (Twitter)' },
                { icon: Instagram, color: 'hover:text-pink-500', label: 'Instagram' }
              ].map(({ icon: Icon, color, label }, index) => (
                <a 
                  key={index}
                  ref={el => addToRefs(el, socialRef)}
                  href="#" 
                  aria-label={label} 
                  className={`p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 ${color} transition-all duration-300 hover:shadow-lg hover:shadow-gray-200 dark:hover:shadow-gray-800`}
                >
                  <Icon size={18} />
                </a>
              ))}
            </div>

            {/* Scroll to top button */}
            <button
              onClick={scrollToTop}
              className="p-2 rounded-full bg-gradient-to-r from-[#EF3866] to-pink-400 text-white hover:shadow-lg hover:shadow-pink-200 dark:hover:shadow-pink-900 transition-all duration-300 group"
              aria-label="Scroll to top"
            >
              <ArrowUp size={18} className="group-hover:-translate-y-1 transition-transform duration-300" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer