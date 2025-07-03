// components/NotificationDot.tsx
import React from 'react';

interface NotificationDotProps {
  show: boolean;
  count?: number;
  size?: 'small' | 'medium' | 'large';
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  className?: string;
}

export const NotificationDot: React.FC<NotificationDotProps> = ({
  show,
  count,
  size = 'medium',
  position = 'top-right',
  className = ''
}) => {
  // Add debug logging
  console.log('🔴 NotificationDot render:', { show, count, size, position });

  if (!show) {
    console.log('🔴 NotificationDot: NOT SHOWING (show=false)');
    return null;
  }

  const sizeClasses = {
    small: 'w-3 h-3 text-xs min-w-[12px] min-h-[12px]',
    medium: 'w-4 h-4 text-xs min-w-[16px] min-h-[16px]',
    large: 'w-5 h-5 text-sm min-w-[20px] min-h-[20px]'
  };

  const positionClasses = {
    'top-right': '-top-1 -right-1',
    'top-left': '-top-1 -left-1',
    'bottom-right': '-bottom-1 -right-1',
    'bottom-left': '-bottom-1 -left-1'
  };

  console.log('🔴 NotificationDot: SHOWING', { 
    show, 
    count, 
    finalClasses: `absolute ${positionClasses[position]} ${sizeClasses[size]} bg-red-500 rounded-full flex items-center justify-center font-bold text-white z-50 ${className}`
  });

  return (
    <div
      className={`absolute ${positionClasses[position]} ${sizeClasses[size]} bg-red-500 rounded-full flex items-center justify-center font-bold text-white z-50 ${className}`}
      style={{ 
        // Fallback inline styles to ensure visibility
        backgroundColor: '#EF4444',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 'bold',
        color: 'white',
        zIndex: 50
      }}
    >
      {count && count > 0 ? (count > 99 ? '99+' : count.toString()) : ''}
    </div>
  );
};