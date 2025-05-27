"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

interface ErrorObject {
  message: string;
  code?: string;
}

interface AuthErrorProps {
  // Support both direct props and error object
  message?: string;
  code?: string;
  error?: ErrorObject | null;
  className?: string;
  variant?: 'default' | 'modal'; // For different styling contexts
}

export default function AuthError({
  message,
  code,
  error,
  className = "",
  variant = 'default'
}: AuthErrorProps) {
  const errorRef = useRef<HTMLDivElement>(null);
  
  // Determine the actual message and code to display
  const displayMessage = message || error?.message || '';

  useEffect(() => {
    if (errorRef.current && displayMessage) {
      // Entry animation
      gsap.fromTo(errorRef.current,
        { x: -10, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.3,
          ease: "power2.out"
        }
      );

      // Shake animation for emphasis
      gsap.fromTo(errorRef.current,
        { x: 0 },
        {
          x: 5,
          duration: 0.1,
          delay: 0.1,
          repeat: 5,
          yoyo: true,
          ease: "power2.inOut"
        }
      );
    }
  }, [displayMessage]);

  if (!displayMessage) return null;

  const baseClasses = "text-red-600 text-sm text-center py-2 px-4 rounded border";
  const variantClasses = variant === 'modal' 
    ? "bg-red-100/30 border-red-300 text-red-700" 
    : "bg-red-50 border-red-200";

  return (
    <div
      ref={errorRef}
      data-error
      className={`${baseClasses} ${variantClasses} ${className}`}
    >
      {displayMessage}
    </div>
  );
}