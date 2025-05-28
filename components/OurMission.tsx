'use client'
import Image from 'next/image'
import React, { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// Register ScrollTrigger plugin
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

const OurMission = () => {
  const sectionRef = useRef<HTMLElement>(null)
  const imageRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const descriptionRef = useRef<HTMLParagraphElement>(null)
  const statementRef = useRef<HTMLDivElement>(null)
  const lineRef = useRef<HTMLSpanElement>(null)
  const accentLineRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const section = sectionRef.current
    const image = imageRef.current
    const header = headerRef.current
    const title = titleRef.current
    const description = descriptionRef.current
    const statement = statementRef.current
    const line = lineRef.current
    const accentLine = accentLineRef.current

    if (section && image && header && title && description && statement && line && accentLine) {
      // Initial states - invisible but maintain layout space
      gsap.set([image, header, title, description, statement], { 
        opacity: 0 
      })
      
      gsap.set(image, { 
        x: -100,
        scale: 0.9,
        rotationY: -15
      })
      
      gsap.set(header, { 
        y: -30,
        scale: 0.9
      })
      
      gsap.set(title, { 
        y: 50,
        rotationX: 15
      })
      
      gsap.set(description, { 
        y: 30,
        scale: 0.95
      })
      
      gsap.set(statement, { 
        x: 30,
        scale: 0.95
      })
      
      gsap.set(line, { 
        scaleY: 0,
        transformOrigin: "top"
      })
      
      gsap.set(accentLine, { 
        scaleX: 0,
        transformOrigin: "left"
      })

      // Create scroll-triggered animation
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top 80%",
          end: "bottom 20%",
          toggleActions: "play none none reverse"
        }
      })

      // Animate elements in sequence
      tl.to(image, {
        opacity: 1,
        x: 0,
        scale: 1,
        rotationY: 0,
        duration: 0.8,
        ease: "power3.out"
      })
      .to(accentLine, {
        scaleX: 1,
        duration: 0.5,
        ease: "power2.out"
      }, "-=0.4")
      .to(header, {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.6,
        ease: "back.out(1.7)"
      }, "-=0.3")
      .to(title, {
        opacity: 1,
        y: 0,
        rotationX: 0,
        duration: 0.7,
        ease: "power3.out"
      }, "-=0.2")
      .to(description, {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.6,
        ease: "power2.out"
      }, "-=0.3")
      .to(line, {
        scaleY: 1,
        duration: 0.8,
        ease: "power2.out"
      }, "-=0.4")
      .to(statement, {
        opacity: 1,
        x: 0,
        scale: 1,
        duration: 0.6,
        ease: "power2.out"
      }, "-=0.6")

      // Cleanup function
      return () => {
        ScrollTrigger.getAll().forEach(trigger => trigger.kill())
      }
    }
  }, [])

  return (
    <section 
      ref={sectionRef}
      className="w-full bg-white dark:bg-black transition-colors duration-300 py-16"
      style={{ fontFamily: 'Sora, sans-serif' }}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-12 xl:px-20 2xl:px-32">
        <div className="flex flex-col md:flex-row gap-12 items-center">
          {/* Left: Image */}
          <div ref={imageRef} className="w-full md:w-1/2">
            <Image
              src="/img/mission.png"
              alt="Our mission illustration"
              width={600}
              height={600}
              className="w-full max-w-[600px] h-auto object-cover rounded-3xl border border-gray-200 dark:border-gray-700 shadow-md transition-colors"
            />
          </div>
           
          {/* Right: Text */}
          <div className="w-full md:w-1/2 text-center md:text-left">
            {/* Section Header */}
            <div ref={headerRef} className="flex items-center gap-2 justify-center md:justify-start mb-4">
              <span ref={accentLineRef} className="inline-block w-8 h-1 bg-[#EF3866] dark:bg-[#ff7a9c] transition-colors"></span>
              <h5 className="tracking-wide font-medium text-gray-800 dark:text-gray-200" style={{ fontFamily: 'Sora, sans-serif' }}>
                Our Mission
              </h5>
            </div>
             
            {/* Headline */}
            <h2 
              ref={titleRef}
              className="text-3xl sm:text-4xl font-bold mb-6 leading-snug text-gray-900 dark:text-white transition-colors"
              style={{ fontFamily: 'Sora, sans-serif' }}
            >
              With <span className="text-[#EF3866] dark:text-[#ff7a9c]">HOJO</span>, the truth is always within reach.
            </h2>
             
            {/* Description */}
            <p 
              ref={descriptionRef}
              className="text-base sm:text-lg text-gray-700 dark:text-gray-300 mb-6 max-w-[600px] mx-auto md:mx-0 transition-colors"
              style={{ fontFamily: 'Sora, sans-serif' }}
            >
              In a world overwhelmed by misinformation, we believe everyone deserves access to accurate, verified news.
              Our platform analyzes headlines in real time, separating facts from falsehoods.
            </p>
             
            {/* Final Statement */}
            <div ref={statementRef} className="flex items-start gap-3 max-w-[600px] mx-auto md:mx-0">
              <span ref={lineRef} className="w-2 h-16 bg-[#EF3866] dark:bg-[#ff7a9c] mt-2 rounded transition-colors"></span>
              <p className="text-base sm:text-lg text-gray-700 dark:text-gray-300 transition-colors" style={{ fontFamily: 'Sora, sans-serif' }}>
                We&apos;re not here to tell you what to think — we&apos;re here to give you the tools to think critically. With HOJO, you gain access to credible, transparent insights that help you make informed decisions about the stories that shape our world.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default OurMission