// components/ui/LoadingSpinner.tsx
import React from 'react';
import clsx from 'clsx';

interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  xs: 'h-4 w-4',
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  className = '',
}) => {
  return (
    <div
      className={clsx(
        'animate-spin rounded-full border-2 border-t-transparent border-blue-500',
        sizeClasses[size],
        className
      )}
    />
  );
};
