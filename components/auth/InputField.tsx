"use client";

import { useRef, useEffect } from "react";
import { gsap } from "gsap";

interface InputFieldProps {
  id: string;
  name: string;
  type: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  disabled?: boolean;
  error?: string | null; // ADD: error prop
  animationDelay?: number;
  className?: string;
}

export default function InputField({
  id,
  name,
  type,
  label,
  placeholder,
  value,
  onChange,
  required = false,
  disabled = false,
  error, // ADD: error prop
  animationDelay = 0,
  className = ""
}: InputFieldProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Initial animation
  useEffect(() => {
    if (containerRef.current) {
      gsap.set(containerRef.current, { x: -30, opacity: 0 });
      
      gsap.to(containerRef.current, {
        x: 0,
        opacity: 1,
        duration: 0.4,
        delay: 0.3 + animationDelay,
        ease: "power2.out"
      });
    }
  }, [animationDelay]);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    gsap.to(e.target, {
      scale: 1.02,
      duration: 0.2,
      ease: "power2.out"
    });
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    gsap.to(e.target, {
      scale: 1,
      duration: 0.2,
      ease: "power2.out"
    });
  };

  return (
    <div 
      ref={containerRef} 
      className={`flex flex-col gap-2 ${className}`} 
      style={{ transform: 'translateX(-30px)', opacity: 0 }}
    >
      <label 
        htmlFor={id} 
        className="text-sm mt-4 sm:text-base font-medium leading-tight text-gray-700 font-sora"
      >
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={`text-gray-700 p-3 border w-full h-10 sm:h-11 rounded-lg text-sm sm:text-base font-normal transition-colors focus:outline-none bg-white ${
          error 
            ? 'border-red-300 focus:border-red-500' 
            : 'border-gray-200 focus:border-[#EF3866]'
        }`}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
      />
      {/* ADD: Display error message */}
      {error && (
        <span className="text-red-600 text-xs mt-1">
          {error}
        </span>
      )}
    </div>
  );
}