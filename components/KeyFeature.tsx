"use client";

import Image from 'next/image'
import React, { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// Register the ScrollTrigger plugin
gsap.registerPlugin(ScrollTrigger)

const KeyFeature = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const badgeRef = useRef<HTMLHeadingElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const descriptionRef = useRef<HTMLParagraphElement>(null)
  const cardsRef = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const container = containerRef.current
    const badge = badgeRef.current
    const title = titleRef.current
    const description = descriptionRef.current
    const cards = cardsRef.current.filter((card): card is HTMLDivElement => card !== null)

    if (!container || !badge || !title || !description) return

    // Set initial states
    gsap.set([badge, title, description], { 
      opacity: 0, 
      y: 30,
      visibility: 'visible'
    })
    
    gsap.set(cards, { 
      opacity: 0, 
      y: 50,
      scale: 0.9,
      visibility: 'visible'
    })

    // Create timeline for header animation
    const headerTl = gsap.timeline({
      scrollTrigger: {
        trigger: container,
        start: "top 80%",
        end: "top 50%",
        toggleActions: "play none none reverse"
      }
    })

    headerTl
      .to(badge, {
        opacity: 1,
        y: 0,
        duration: 0.6,
        ease: "power2.out"
      })
      .to(title, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: "power2.out"
      }, "-=0.3")
      .to(description, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: "power2.out"
      }, "-=0.5")

    // Animate cards with stagger
    gsap.to(cards, {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 0.8,
      ease: "power2.out",
      stagger: 0.15,
      scrollTrigger: {
        trigger: container,
        start: "top 70%",
        end: "top 40%",
        toggleActions: "play none none reverse"
      }
    })

    // Add hover animations for cards
    cards.forEach((card) => {
      if (card) {
        const icon = card.querySelector('.feature-icon') as HTMLElement | null
        const line = card.querySelector('.feature-line') as HTMLElement | null
        
        const handleMouseEnter = () => {
          gsap.to(card, {
            y: -8,
            scale: 1.02,
            duration: 0.3,
            ease: "power2.out"
          })
          
          if (icon) {
            gsap.to(icon, {
              rotation: 6,
              scale: 1.1,
              duration: 0.3,
              ease: "power2.out"
            })
          }
          
          if (line) {
            gsap.to(line, {
              width: "4rem",
              duration: 0.3,
              ease: "power2.out"
            })
          }
        }
        
        const handleMouseLeave = () => {
          gsap.to(card, {
            y: 0,
            scale: 1,
            duration: 0.3,
            ease: "power2.out"
          })
          
          if (icon) {
            gsap.to(icon, {
              rotation: 0,
              scale: 1,
              duration: 0.3,
              ease: "power2.out"
            })
          }
          
          if (line) {
            gsap.to(line, {
              width: "3rem",
              duration: 0.3,
              ease: "power2.out"
            })
          }
        }

        card.addEventListener('mouseenter', handleMouseEnter)
        card.addEventListener('mouseleave', handleMouseLeave)
      }
    })

    // Cleanup function
    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill())
      // Remove event listeners
      cards.forEach((card) => {
        if (card) {
          // We need to store references to the functions to remove them properly
          // For now, ScrollTrigger cleanup will handle most of the cleanup
        }
      })
    }
  }, [])

  const setCardRef = (index: number) => (el: HTMLDivElement | null) => {
    if (cardsRef.current) {
      cardsRef.current[index] = el
    }
  }

  return (
    <div 
      ref={containerRef}
      className="relative w-full px-4 md:px-8 lg:px-16 py-16 sm:py-20 bg-white dark:bg-black text-gray-800 dark:text-gray-200 font-sora z-20"
      style={{ isolation: 'isolate' }}
    >
      <div className="max-w-full mx-auto text-center">
        {/* Section Header */}
        <h5 
          ref={badgeRef}
          className="inline-block bg-[#FCE8E9] dark:bg-[#2D1B1E] text-[#B41C45] dark:text-[#EF3866] px-4 py-1.5 rounded-lg text-sm font-medium mb-4 font-sora opacity-0"
        >
          Key Features
        </h5>
        <h2 
          ref={titleRef}
          className="text-3xl sm:text-4xl font-bold mb-3 font-sora opacity-0"
        >
          AI-Powered News Verification
        </h2>
        <p 
          ref={descriptionRef}
          className="max-w-xl mx-auto text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-12 sm:mb-16 font-sora opacity-0"
        >
          Our advanced AI algorithms analyze multiple factors to determine the credibility of news articles.
        </p>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div 
            ref={setCardRef(0)}
            className="bg-white dark:bg-black border border-gray-200 dark:border-gray-700 rounded-xl p-8 sm:p-10 flex flex-col items-center text-center shadow-sm hover:shadow-xl hover:border-pink-100 dark:hover:border-pink-900 transition-all duration-300 relative overflow-hidden opacity-0 cursor-pointer"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-pink-50 to-blue-50 dark:from-pink-950 dark:to-blue-950 opacity-0 hover:opacity-10 transition-opacity duration-300"></div>
            <div className="h-16 w-16 rounded-full bg-pink-50 dark:bg-pink-900/30 flex items-center justify-center mb-6 feature-icon">
              <Image src="/img/mark.png" alt="Credibility Scoring" width={40} height={40} />
            </div>
            <h3 className="text-xl font-semibold mb-3 hover:text-pink-600 dark:hover:text-pink-400 transition-colors duration-300 font-sora">Credibility Scoring</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 font-sora">
              Get instant credibility scores based on source reputation, fact-checking, and content analysis.
            </p>
            <div className="w-12 h-1 bg-pink-200 dark:bg-pink-800 rounded-full mt-6 feature-line"></div>
          </div>

          {/* Feature 2 */}
          <div 
            ref={setCardRef(1)}
            className="bg-white dark:bg-black border border-gray-200 dark:border-gray-700 rounded-xl p-8 sm:p-10 flex flex-col items-center text-center shadow-sm hover:shadow-xl hover:border-blue-100 dark:hover:border-blue-900 transition-all duration-300 relative overflow-hidden opacity-0 cursor-pointer"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 opacity-0 hover:opacity-10 transition-opacity duration-300"></div>
            <div className="h-16 w-16 rounded-full bg-blue-50 dark:bg-black flex items-center justify-center mb-6 feature-icon">
              <Image src="/img/bias.png" alt="Bias Detection" width={40} height={40} />
            </div>
            <h3 className="text-xl font-semibold mb-3 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-300 font-sora">Bias Detection</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 font-sora">
              Identify potential political or ideological bias in news reporting with our advanced language analysis.
            </p>
            <div className="w-12 h-1 bg-blue-200 dark:bg-blue-800 rounded-full mt-6 feature-line"></div>
          </div>

          {/* Feature 3 */}
          <div 
            ref={setCardRef(2)}
            className="bg-white dark:bg-black border border-gray-200 dark:border-gray-700 rounded-xl p-8 sm:p-10 flex flex-col items-center text-center shadow-sm hover:shadow-xl hover:border-purple-100 dark:hover:border-purple-900 transition-all duration-300 relative overflow-hidden opacity-0 cursor-pointer"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950 dark:to-indigo-950 opacity-0 hover:opacity-10 transition-opacity duration-300"></div>
            <div className="h-16 w-16 rounded-full bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center mb-6 feature-icon">
              <Image src="/img/trend.png" alt="Trending Analysis" width={40} height={40} />
            </div>
            <h3 className="text-xl font-semibold mb-3 hover:text-purple-600 dark:hover:text-purple-400 transition-colors duration-300 font-sora">Trending Analysis</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 font-sora">
              See how a story evolves across multiple sources and track its verification status in real-time.
            </p>
            <div className="w-12 h-1 bg-purple-200 dark:bg-purple-800 rounded-full mt-6 feature-line"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default KeyFeature