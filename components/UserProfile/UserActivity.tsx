// components/UserProfile/UserActivity.tsx
'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Bookmark, 
  TrendingUp,
  Calendar,
  User
} from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'like' | 'comment' | 'share' | 'bookmark' | 'follow';
  title: string;
  description: string;
  timestamp: string;
  target_id?: string;
  target_type?: 'post' | 'user';
  image_url?: string;
  author_name?: string;
}

interface UserActivityProps {
  activities: ActivityItem[];
  loading?: boolean;
}

export const UserActivity: React.FC<UserActivityProps> = ({ 
  activities, 
  loading = false 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && !loading) {
      const items = containerRef.current.querySelectorAll('.activity-item');
      gsap.fromTo(items, 
        { opacity: 0, y: 30 },
        { 
          opacity: 1, 
          y: 0, 
          duration: 0.5,
          stagger: 0.1,
          ease: "power2.out"
        }
      );
    }
  }, [activities, loading]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = diffInMs / (1000 * 60);
    const diffInHours = diffInMs / (1000 * 60 * 60);
    const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

    if (diffInMinutes < 60) {
      return `${Math.floor(diffInMinutes)} minutes ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInDays < 7) {
      return `${Math.floor(diffInDays)}d ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart size={16} className="text-red-500" />;
      case 'comment':
        return <MessageCircle size={16} className="text-blue-500" />;
      case 'share':
        return <Share2 size={16} className="text-green-500" />;
      case 'bookmark':
        return <Bookmark size={16} className="text-yellow-500" />;
      case 'follow':
        return <User size={16} className="text-purple-500" />;
      default:
        return <TrendingUp size={16} className="text-gray-500" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'like':
        return 'bg-red-50 border-red-200';
      case 'comment':
        return 'bg-blue-50 border-blue-200';
      case 'share':
        return 'bg-green-50 border-green-200';
      case 'bookmark':
        return 'bg-yellow-50 border-yellow-200';
      case 'follow':
        return 'bg-purple-50 border-purple-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse bg-gray-100 dark:bg-gray-800 rounded-xl p-4">
            <div className="flex gap-3">
              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-16">
        <TrendingUp size={64} className="text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          No activity yet
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          User activity will appear here once they start engaging with content.
        </p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="space-y-4">
      {activities.map((activity) => (
        <div
          key={activity.id}
          className={`activity-item group border rounded-xl p-4 transition-all duration-300 hover:shadow-md ${getActivityColor(activity.type)} dark:bg-gray-800 dark:border-gray-700`}
        >
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-white dark:bg-gray-700 rounded-full flex items-center justify-center shadow-sm">
                {getActivityIcon(activity.type)}
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                    {activity.title}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {activity.description}
                  </p>
                  
                  {activity.author_name && (
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      by {activity.author_name}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center gap-2 ml-4">
                  <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-500">
                    <Calendar size={12} />
                    <span>{formatDate(activity.timestamp)}</span>
                  </div>
                  
                  {activity.image_url && (
                    <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
                      <Image
                        src={activity.image_url}
                        alt=""
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>
              
              {activity.target_id && (
                <div className="mt-3">
                  <Link
                    href={`/${activity.target_type}/${activity.target_id}`}
                    className="text-sm text-[#EF3866] hover:text-[#d7325a] font-medium transition-colors"
                  >
                    View {activity.target_type} →
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};