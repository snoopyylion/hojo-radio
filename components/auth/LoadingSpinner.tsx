"use client";

import { BrandSpinner } from "../ui/LoadingSpinner";

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function LoadingSpinner({ 
  message = "Loading...", 
  size = 'md',
  className = "" 
}: LoadingSpinnerProps) {
  const sizeMap = {
    sm: 'sm' as const,
    md: 'lg' as const,
    lg: 'xl' as const
  };

  return (
    <div className={`min-h-screen bg-white flex items-center justify-center ${className}`}>
      <div className="text-center">
        <BrandSpinner size={sizeMap[size]} className="mx-auto mb-4" />
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  );
}