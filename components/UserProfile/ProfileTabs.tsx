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
    <div ref={tabsRef} className="opacity-0">
      <div className="bg-white/80 dark:bg-black/80 backdrop-blur-lg rounded-2xl border border-gray-200/50 dark:border-gray-800/50 p-2 shadow-sm">
        <nav className="flex space-x-2 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`flex items-center space-x-2 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-300 font-sora whitespace-nowrap min-w-fit ${
                  isActive
                    ? 'bg-[#EF3866] text-white shadow-lg shadow-[#EF3866]/20'
                    : 'bg-gray-50/50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 hover:bg-gray-100/70 dark:hover:bg-gray-700/70 hover:text-gray-900 dark:hover:text-white'
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
                        ? 'bg-white/20 text-white backdrop-blur-sm'
                        : 'bg-[#EF3866]/10 text-[#EF3866] dark:bg-[#EF3866]/20'
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