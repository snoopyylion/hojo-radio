"use client";

import { useRef, useEffect, useState } from "react";
import Image from "next/image";
import { gsap } from "gsap";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageSliderRef = useRef<HTMLDivElement>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  const images = [
    "/img/loginimg1.png",
    "/img/loginimg2.png",
    "/img/loginimg3.png",
  ];

  // Initial animation for image slider
  useEffect(() => {
    if (imageSliderRef.current) {
      gsap.set(imageSliderRef.current, { opacity: 0 });
      
      const tl = gsap.timeline({ delay: 0.1 });
      tl.to(imageSliderRef.current, {
        opacity: 1,
        duration: 0.8,
        ease: "power2.out"
      });
    }
  }, []);

  // Auto-slide functionality
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % images.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [images.length]);

  const handleDotHover = (e: React.MouseEvent<HTMLButtonElement>) => {
    gsap.to(e.currentTarget, { scale: 1.2, duration: 0.2 });
  };

  const handleDotLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    gsap.to(e.currentTarget, { scale: 1, duration: 0.2 });
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-white flex flex-col lg:flex-row">
      {/* Left side - Form Content */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        {children}
      </div>

      {/* Right side - Image Slider */}
      <div className="hidden lg:block w-1/2 p-4 sm:p-6 lg:p-8">
        <div 
          ref={imageSliderRef} 
          className="w-full h-full relative rounded-2xl overflow-hidden shadow-lg" 
          style={{ opacity: 0 }}
        >
          {images.map((img, index) => (
            <div
              key={index}
              className={`absolute top-0 left-0 w-full h-full transition-opacity duration-500 ease-in-out ${
                index === currentSlide ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <Image
                fill
                src={img}
                alt={`HOJO Slide ${index + 1}`}
                className="object-cover"
                sizes="50vw"
                priority={index === 0}
              />
            </div>
          ))}
          
          {/* Slide indicators */}
          <div className="absolute bottom-8 left-[80%] transform -translate-x-1/2 flex gap-2">
            {images.map((_, index) => (
              <button
                key={index}
                className={`h-2 rounded-full border-none cursor-pointer transition-all duration-300 ${
                  index === currentSlide 
                    ? 'w-8 bg-white' 
                    : 'w-5 bg-white/50'
                }`}
                onClick={() => setCurrentSlide(index)}
                onMouseEnter={handleDotHover}
                onMouseLeave={handleDotLeave}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}