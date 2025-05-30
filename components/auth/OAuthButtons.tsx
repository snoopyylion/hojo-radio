"use client";

import { useRef, useEffect, useState } from "react";
import { gsap } from "gsap";

interface OAuthButtonsProps {
  onGoogleSignIn: () => Promise<void>;
  onAppleSignIn: () => Promise<void>;
  disabled?: boolean;
  isLoading?: boolean;
  className?: string;
}

type LoadingState = 'idle' | 'google' | 'apple';

export default function OAuthButtons({ 
  onGoogleSignIn, 
  onAppleSignIn, 
  disabled = false,
  isLoading = false,
  className = "" 
}: OAuthButtonsProps) {
  const appleButtonRef = useRef<HTMLButtonElement>(null);
  const googleButtonRef = useRef<HTMLButtonElement>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');

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
    if (!disabled && !isLoading && loadingState === 'idle') {
      gsap.to(e.currentTarget, {
        scale: 1.02,
        duration: 0.2,
        ease: "power2.out"
      });
    }
  };

  const handleButtonLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled && !isLoading && loadingState === 'idle') {
      gsap.to(e.currentTarget, {
        scale: 1,
        duration: 0.2,
        ease: "power2.out"
      });
    }
  };

  const handleGoogleSignIn = async () => {
    if (disabled || isLoading || loadingState !== 'idle') return;
    
    setLoadingState('google');
    try {
      await onGoogleSignIn();
    } finally {
      setLoadingState('idle');
    }
  };

  const handleAppleSignIn = async () => {
    if (disabled || isLoading || loadingState !== 'idle') return;
    
    setLoadingState('apple');
    try {
      await onAppleSignIn();
    } finally {
      setLoadingState('idle');
    }
  };

  const isButtonDisabled = disabled || isLoading || loadingState !== 'idle';
  const isGoogleLoading = loadingState === 'google' || isLoading;
  const isAppleLoading = loadingState === 'apple' || isLoading;

  const LoadingSpinner = ({ variant = 'dark' }: { variant?: 'dark' | 'light' }) => (
    <div className="relative">
      <div 
        className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 ${
          variant === 'dark' 
            ? 'border-gray-300 border-t-gray-700' 
            : 'border-gray-400 border-t-white'
        } animate-spin`}
      />
      <div 
        className={`absolute inset-0 w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 border-transparent ${
          variant === 'dark' 
            ? 'border-t-gray-700' 
            : 'border-t-white'
        } animate-pulse`}
      />
    </div>
  );

  const AppleIcon = () => (
    <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" viewBox="0 0 24 24">
      <path 
        fill="currentColor" 
        d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" 
      />
    </svg>
  );

  const GoogleIcon = () => (
    <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );

  return (
    <div className={`flex flex-col sm:flex-row gap-2 sm:gap-3 ${className}`}>
      {/* Apple Sign In Button */}
      <button
        ref={appleButtonRef}
        type="button"
        onClick={handleAppleSignIn}
        onMouseEnter={handleButtonHover}
        onMouseLeave={handleButtonLeave}
        className={`
          w-full sm:w-1/2 flex items-center justify-center gap-2 py-3 px-3 
          bg-black text-white border-2 border-black rounded-lg 
          text-xs sm:text-sm font-medium transition-all duration-200
          h-11 sm:h-12 relative overflow-hidden
          ${isButtonDisabled 
            ? 'opacity-60 cursor-not-allowed' 
            : 'hover:bg-gray-800 hover:border-gray-800 cursor-pointer'
          }
          ${isAppleLoading ? 'bg-gray-800 border-gray-800' : ''}
        `}
        style={{ transform: 'translateY(20px)', opacity: 0 }}
        disabled={isButtonDisabled}
      >
        <div className={`flex items-center gap-2 transition-opacity duration-200 ${isAppleLoading ? 'opacity-0' : 'opacity-100'}`}>
          <AppleIcon />
          <span className="hidden sm:inline">Sign in with Apple</span>
          <span className="sm:hidden">Apple</span>
        </div>
        
        {isAppleLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
            <div className="flex items-center gap-2">
              <LoadingSpinner variant="light" />
              <span className="hidden sm:inline text-sm">Connecting...</span>
              <span className="sm:hidden text-xs">Loading...</span>
            </div>
          </div>
        )}
      </button>

      {/* Google Sign In Button */}
      <button
        ref={googleButtonRef}
        type="button"
        onClick={handleGoogleSignIn}
        onMouseEnter={handleButtonHover}
        onMouseLeave={handleButtonLeave}
        className={`
          w-full sm:w-1/2 flex items-center justify-center gap-2 py-3 px-3 
          border-2 border-gray-300 rounded-lg bg-white text-gray-700
          text-xs sm:text-sm font-medium transition-all duration-200
          h-11 sm:h-12 relative overflow-hidden
          ${isButtonDisabled 
            ? 'opacity-60 cursor-not-allowed' 
            : 'hover:border-gray-400 hover:bg-gray-50 cursor-pointer'
          }
          ${isGoogleLoading ? 'bg-gray-50 border-gray-400' : ''}
        `}
        style={{ transform: 'translateY(20px)', opacity: 0 }}
        disabled={isButtonDisabled}
      >
        <div className={`flex items-center gap-2 transition-opacity duration-200 ${isGoogleLoading ? 'opacity-0' : 'opacity-100'}`}>
          <GoogleIcon />
          <span className="hidden sm:inline">Sign in with Google</span>
          <span className="sm:hidden">Google</span>
        </div>
        
        {isGoogleLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <div className="flex items-center gap-2">
              <LoadingSpinner variant="dark" />
              <span className="hidden sm:inline text-sm text-gray-700">Connecting...</span>
              <span className="sm:hidden text-xs text-gray-700">Loading...</span>
            </div>
          </div>
        )}
      </button>
    </div>
  );
}