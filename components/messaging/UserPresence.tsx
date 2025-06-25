// components/UserPresence.tsx
import React from 'react';

interface UserPresenceProps {
    userId: string;
    isOnline: boolean;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
    showOffline?: boolean;
}

const UserPresence: React.FC<UserPresenceProps> = ({
    isOnline,
    size = 'sm',
    className = '',
    showOffline = false
}) => {
    if (!isOnline && !showOffline) {
        return null;
    }

    const sizeClasses = {
        sm: 'w-3 h-3',
        md: 'w-4 h-4',
        lg: 'w-5 h-5'
    };

    const statusColor = isOnline ? 'bg-green-500' : 'bg-gray-400';

    return (
        <div
            className={`
        ${sizeClasses[size]} 
        ${statusColor} 
        rounded-full 
        border-2 
        border-white 
        ${className}
      `}
            title={isOnline ? 'Online' : 'Offline'}
        />
    );
};

export default UserPresence;