// components/ui/Avatar.tsx
import React, { useState } from 'react';
import Image from 'next/image';

interface AvatarProps {
  src?: string;
  alt: string;
  size?: number;
  className?: string;
  fallbackText?: string;
  showOnlineIndicator?: boolean;
  isOnline?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt,
  size = 40,
  className = '',
  fallbackText,
  showOnlineIndicator = false,
  isOnline = false
}) => {
  const [imageError, setImageError] = useState(false);

  const getFallbackText = () => {
    if (fallbackText) return fallbackText;
    return alt.charAt(0).toUpperCase();
  };

  return (
    <div className={`relative inline-block ${className}`}>
      {src && !imageError ? (
        <Image
          src={src}
          alt={alt}
          width={size}
          height={size}
          className={`rounded-full object-cover`}
          style={{ width: size, height: size }}
          onError={() => setImageError(true)}
        />
      ) : (
        <div
          className={`rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center`}
          style={{ width: size, height: size }}
        >
          <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">
            {getFallbackText()}
          </span>
        </div>
      )}
      
      {showOnlineIndicator && isOnline && (
        <div 
          className="absolute bg-green-500 border-2 border-white dark:border-gray-950 rounded-full"
          style={{
            width: size * 0.3,
            height: size * 0.3,
            bottom: -2,
            right: -2
          }}
        />
      )}
    </div>
  );
};

// Usage in ConversationHeader.tsx:
// <Avatar
//   src={otherParticipant?.user?.imageUrl}
//   alt={getConversationTitle()}
//   size={40}
//   className="ring-2 ring-[#EF3866]/20"
//   showOnlineIndicator={true}
//   isOnline={isOtherUserOnline}
// />

// Usage in MessageBubble.tsx:
// <Avatar
//   src={message.sender?.imageUrl}
//   alt={getDisplayName()}
//   size={28}
//   className="shadow-sm"
//   showOnlineIndicator={true}
//   isOnline={true} // You can determine this based on your online users data
// />