'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { BookOpen, Shield, User, Info, BarChart3, TrendingUp, MessageCircle, CheckCircle, Crown } from 'lucide-react';

interface ProfileTabsProps {
  activeTab: 'posts' | 'about' | 'verified' | 'custom';
  onTabChange: (tab: 'posts' | 'about' | 'verified' | 'custom') => void;
  userRole: 'user' | 'author';
  postsCount: number;
}

export const ProfileTabs: React.FC<ProfileTabsProps> = ({
  activeTab,
  onTabChange,
  userRole,
  postsCount
}) => {
  const tabsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tabsRef.current) {
      gsap.fromTo(tabsRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }
      );
    }
  }, []);

  const handleTabClick = (tab: 'posts' | 'about' | 'verified' | 'custom') => {
    onTabChange(tab);
  };

  const tabs = [
    {
      id: 'about' as const,
      label: 'About',
      icon: Info
    },
    ...(userRole === 'author' ? [{
      id: 'posts' as const,
      label: `Posts`,
      count: postsCount,
      icon: BookOpen
    }] : []),
    {
      id: 'verified' as const,
      label: 'Verified News',
      icon: Shield
    },
    ...(userRole === 'user' ? [{
      id: 'custom' as const,
      label: 'Activity',
      icon: User
    }] : []),
  ];

  return (
    <div ref={tabsRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 opacity-0">
      <div className="border-b border-gray-200 dark:border-gray-700 transition-colors">
        <nav className="-mb-px flex space-x-2 sm:space-x-8 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`flex items-center space-x-2 py-4 px-1 sm:px-3 border-b-2 font-medium text-sm transition-colors font-sora whitespace-nowrap ${
                  isActive
                    ? 'border-[#EF3866] text-[#EF3866]'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                
                {/* Count badge */}
                {'count' in tab && tab.count !== undefined && (
                  <span
                    className={`ml-1 px-2 py-0.5 rounded-full text-xs font-semibold transition-all duration-300 ${
                      isActive
                        ? 'bg-[#EF3866]/10 text-[#EF3866]'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};