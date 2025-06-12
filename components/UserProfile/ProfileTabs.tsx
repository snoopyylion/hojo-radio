// components/UserProfile/ProfileTabs.tsx
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
      label: `Posts (${postsCount})`,
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
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg overflow-hidden transition-colors duration-300">
      <div className="relative">
        <div ref={tabsRef} className="flex border-b border-gray-200 dark:border-gray-700">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                data-tab={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 font-semibold text-sm transition-all duration-300 ${
                  activeTab === tab.id
                    ? 'text-[#EF3866]'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
        
        {/* Animated Indicator */}
        <div
          ref={indicatorRef}
          className="absolute bottom-0 h-0.5 bg-gradient-to-r from-[#EF3866] to-[#d7325a] transition-all duration-300"
        />
      </div>
    </div>
  );
};
