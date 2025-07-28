// components/ui/LoadingSpinner.tsx
import React from 'react';
import clsx from 'clsx';

/**
 * Unified Loading System for NewsHojo
 * 
 * Available Components:
 * - LoadingSpinner: Main component with multiple variants
 * - BrandSpinner: Brand-colored spinner (default)
 * - WhiteSpinner: White spinner for dark backgrounds
 * - LoadingDots: Animated dots
 * - LoadingWave: Wave animation
 * 
 * Usage Examples:
 * 
 * // Basic spinner
 * <LoadingSpinner />
 * 
 * // Brand spinner with text
 * <LoadingSpinner size="lg" text="Loading..." showText />
 * 
 * // White spinner for dark buttons
 * <LoadingSpinner variant="white" size="sm" />
 * 
 * // Animated dots
 * <LoadingDots size="md" variant="brand" />
 * 
 * // Wave animation
 * <LoadingWave size="sm" variant="white" />
 * 
 * // With custom text
 * <BrandSpinner size="xl" text="Connecting..." showText />
 */
interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'brand' | 'white' | 'gray' | 'blue' | 'success';
  type?: 'spinner' | 'dots' | 'pulse' | 'wave';
  className?: string;
  text?: string;
  showText?: boolean;
}

const sizeClasses = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12',
};

const variantClasses = {
  default: 'border-gray-300 border-t-gray-600',
  brand: 'border-gray-200 border-t-[#EF3866]',
  white: 'border-gray-300 border-t-white',
  gray: 'border-gray-200 border-t-gray-500',
  blue: 'border-blue-200 border-t-blue-600',
  success: 'border-green-200 border-t-green-600',
};

const textSizes = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-sm',
  lg: 'text-base',
  xl: 'text-lg',
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  variant = 'brand',
  type = 'spinner',
  className = '',
  text,
  showText = false,
}) => {
  const renderSpinner = () => {
    switch (type) {
      case 'dots':
        return (
          <div className="flex space-x-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={clsx(
                  'rounded-full bg-current',
                  sizeClasses[size],
                  'animate-pulse'
                )}
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        );

      case 'pulse':
        return (
          <div
            className={clsx(
              'rounded-full bg-current animate-pulse',
              sizeClasses[size]
            )}
          />
        );

      case 'wave':
        return (
          <div className="flex space-x-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={clsx(
                  'w-1 bg-current rounded-full animate-pulse',
                  size === 'xs' && 'h-2',
                  size === 'sm' && 'h-3',
                  size === 'md' && 'h-4',
                  size === 'lg' && 'h-5',
                  size === 'xl' && 'h-6',
                )}
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
        );

      default:
        return (
          <div
            className={clsx(
              'animate-spin rounded-full border-2 border-t-transparent',
              sizeClasses[size],
              variantClasses[variant],
              className
            )}
          />
        );
    }
  };

  if (showText || text) {
    return (
      <div className="flex flex-col items-center justify-center space-y-2">
        {renderSpinner()}
        {text && (
          <p className={clsx('text-gray-600 font-medium', textSizes[size])}>
            {text}
          </p>
        )}
      </div>
    );
  }

  return renderSpinner();
};

// Convenience components for common use cases
export const BrandSpinner: React.FC<Omit<LoadingSpinnerProps, 'variant'>> = (props) => (
  <LoadingSpinner variant="brand" {...props} />
);

export const WhiteSpinner: React.FC<Omit<LoadingSpinnerProps, 'variant'>> = (props) => (
  <LoadingSpinner variant="white" {...props} />
);

export const LoadingDots: React.FC<Omit<LoadingSpinnerProps, 'type'>> = (props) => (
  <LoadingSpinner type="dots" {...props} />
);

export const LoadingWave: React.FC<Omit<LoadingSpinnerProps, 'type'>> = (props) => (
  <LoadingSpinner type="wave" {...props} />
);
