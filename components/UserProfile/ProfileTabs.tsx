'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { BookOpen, Shield, User, Info } from 'lucide-react';

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
  const indicatorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tabsRef.current) {
      gsap.fromTo(tabsRef.current, 
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }
      );
    }
  }, []);

  useEffect(() => {
    if (indicatorRef.current && tabsRef.current) {
      const activeButton = tabsRef.current.querySelector(`[data-tab="${activeTab}"]`) as HTMLElement;
      if (activeButton) {
        gsap.to(indicatorRef.current, {
          width: activeButton.offsetWidth,
          x: activeButton.offsetLeft,
          duration: 0.3,
          ease: "power2.out"
        });
      }
    }
  }, [activeTab]);

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
    <div className="relative">
      <div ref={tabsRef} className="flex overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              data-tab={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 sm:px-6 py-4 font-semibold text-sm whitespace-nowrap transition-all duration-300 ${
                activeTab === tab.id
                  ? 'text-[#EF3866]'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
              {'count' in tab && tab.count !== undefined && (
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  activeTab === tab.id 
                    ? 'bg-[#EF3866] text-white' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
      
      {/* Animated Indicator */}
      <div
        ref={indicatorRef}
        className="absolute bottom-0 h-0.5 bg-gradient-to-r from-[#EF3866] to-[#d7325a] transition-all duration-300 rounded-full"
      />
    </div>
  );
};