"use client";

import { useRef, useEffect } from "react";
import { gsap } from "gsap";

interface OAuthButtonsProps {
  onGoogleSignIn: () => Promise<void>;
  onAppleSignIn: () => Promise<void>;
  disabled?: boolean;
  isLoading?: boolean; // ADD: isLoading prop
  className?: string;
}

export default function OAuthButtons({ 
  onGoogleSignIn, 
  onAppleSignIn, 
  disabled = false,
  isLoading = false, // ADD: isLoading prop
  className = "" 
}: OAuthButtonsProps) {
  const appleButtonRef = useRef<HTMLButtonElement>(null);
  const googleButtonRef = useRef<HTMLButtonElement>(null);

  // Initial animation
  useEffect(() => {
    const buttons = [appleButtonRef.current, googleButtonRef.current].filter(Boolean);
    
    if (buttons.length > 0) {
      gsap.set(buttons, { y: 20, opacity: 0 });
      
      const tl = gsap.timeline({ delay: 0.4 });
      tl.to(buttons, {
        y: 0,
        opacity: 1,
        duration: 0.4,
        stagger: 0.05,
        ease: "power2.out"
      });
    }
  }, []);

  const handleButtonHover = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled && !isLoading) {
      gsap.to(e.currentTarget, {
        scale: 1.05,
        duration: 0.2,
        ease: "power2.out"
      });
    }
  };

  const handleButtonLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled && !isLoading) {
      gsap.to(e.currentTarget, {
        scale: 1,
        duration: 0.2,
        ease: "power2.out"
      });
    }
  };

  const isButtonDisabled = disabled || isLoading;

  return (
    <div className={`flex flex-col sm:flex-row gap-2 sm:gap-3 ${className}`}>
      {/* Apple Sign In Button */}
      <button
        ref={appleButtonRef}
        type="button"
        onClick={onAppleSignIn}
        onMouseEnter={handleButtonHover}
        onMouseLeave={handleButtonLeave}
        className="w-full sm:w-1/2 flex items-center justify-center gap-2 py-3 px-3 bg-white text-black border-2 border-gray-200 rounded-lg text-xs sm:text-sm font-medium cursor-pointer transition-all hover:border-[#EF3866] h-11 sm:h-12 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ transform: 'translateY(20px)', opacity: 0 }}
        disabled={isButtonDisabled}
      >
        {isLoading ? (
          <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" viewBox="0 0 24 24">
            <path 
              fill="black" 
              d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" 
            />
          </svg>
        )}
        <span className="hidden sm:inline">
          {isLoading ? 'Loading...' : 'Sign in with Apple'}
        </span>
        <span className="sm:hidden">
          {isLoading ? 'Loading...' : 'Apple'}
        </span>
      </button>

      {/* Google Sign In Button */}
      <button
        ref={googleButtonRef}
        type="button"
        onClick={onGoogleSignIn}
        onMouseEnter={handleButtonHover}
        onMouseLeave={handleButtonLeave}
        className="w-full sm:w-1/2 flex items-center justify-center gap-2 py-3 px-3 border-2 border-gray-200 rounded-lg bg-white text-xs sm:text-sm font-medium cursor-pointer transition-all hover:border-[#EF3866] hover:bg-gray-50 text-gray-700 h-11 sm:h-12 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ transform: 'translateY(20px)', opacity: 0 }}
        disabled={isButtonDisabled}
      >
        {isLoading ? (
          <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
        )}
        <span className="hidden sm:inline">
          {isLoading ? 'Loading...' : 'Sign in with Google'}
        </span>
        <span className="sm:hidden">
          {isLoading ? 'Loading...' : 'Google'}
        </span>
      </button>
    </div>
  );
}