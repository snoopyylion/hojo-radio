'use client'
import Image from 'next/image'
import Link from 'next/link'
import React, { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

interface LinkButtonProps {
  title: string
  href: string
}

const LinkButton: React.FC<LinkButtonProps> = ({ title, href }) => {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const arrowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const button = buttonRef.current
    const arrow = arrowRef.current

    if (button && arrow) {
      // Initial state - invisible but maintain layout space
      gsap.set(button, { 
        opacity: 0, 
        scale: 0.8,
        rotationY: -15
      })

      // Entrance animation
      const tl = gsap.timeline({ delay: 0.2 })
      
      tl.to(button, {
        opacity: 1,
        scale: 1,
        rotationY: 0,
        duration: 0.6,
        ease: "back.out(1.7)"
      })

      // Hover animations
      const handleMouseEnter = () => {
        gsap.to(arrow, {
          x: 4,
          scale: 1.1,
          duration: 0.3,
          ease: "power2.out"
        })
        gsap.to(button, {
          scale: 1.05,
          duration: 0.3,
          ease: "power2.out"
        })
      }

      const handleMouseLeave = () => {
        gsap.to(arrow, {
          x: 0,
          scale: 1,
          duration: 0.3,
          ease: "power2.out"
        })
        gsap.to(button, {
          scale: 1,
          duration: 0.3,
          ease: "power2.out"
        })
      }

      button.addEventListener('mouseenter', handleMouseEnter)
      button.addEventListener('mouseleave', handleMouseLeave)

      return () => {
        button.removeEventListener('mouseenter', handleMouseEnter)
        button.removeEventListener('mouseleave', handleMouseLeave)
      }
    }
  }, [])

  return (
    <Link href={href}>
      <button 
        ref={buttonRef}
        className="flex items-center gap-2 bg-[#EF3866] hover:bg-[#d7325a] text-white font-semibold px-4 py-2 rounded-full transition-all text-sm md:text-base"
        style={{ fontFamily: 'Sora, sans-serif' }}
      >
        <span style={{ fontFamily: 'Sora, sans-serif' }}>{title}</span>
        <div ref={arrowRef}>
          <Image
            src="/icons/arrow-circle-right.png"
            alt="arrow"
            width={40}
            height={40}
            className="w-6 h-6 md:w-8 md:h-8"
          />
        </div>
      </button>
    </Link>
  )
}

export default LinkButton