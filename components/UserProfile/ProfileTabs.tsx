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
    const updateIndicator = () => {
      if (!indicatorRef.current || !tabsRef.current) return;
      const activeButton = tabsRef.current.querySelector(`[data-tab="${activeTab}"]`) as HTMLElement;
      if (activeButton) {
        const offsetLeft = activeButton.offsetLeft - tabsRef.current.scrollLeft;
        gsap.to(indicatorRef.current, {
          width: activeButton.offsetWidth,
          x: offsetLeft,
          duration: 0.3,
          ease: "power2.out"
        });
      }
    };

    updateIndicator();

    window.addEventListener("resize", updateIndicator);
    tabsRef.current?.addEventListener("scroll", updateIndicator);

    return () => {
      window.removeEventListener("resize", updateIndicator);
      tabsRef.current?.removeEventListener("scroll", updateIndicator);
    };
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
    <div className="relative bg-white dark:bg-black/70 backdrop-blur-md border border-gray-200/50 dark:border-gray-800/50 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
      <div ref={tabsRef} className="flex overflow-x-auto scrollbar-hide divide-x divide-gray-200/50 dark:divide-gray-800/50">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              data-tab={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex items-center gap-2 sm:gap-3 px-5 sm:px-7 py-4 font-medium text-sm sm:text-base whitespace-nowrap transition-all duration-300 group ${isActive
                  ? 'text-black dark:text-white bg-gray-100 dark:bg-gray-900'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/40'
                }`}
            >
              {/* Icon */}
              <div
                className={`p-2 rounded-xl transition-all duration-300 ${isActive
                    ? 'bg-[#EF3866] text-white'
                    : 'bg-gray-100 dark:bg-gray-800 group-hover:bg-[#EF3866]/10 text-gray-500 dark:text-gray-400'
                  }`}
              >
                <Icon size={18} />
              </div>

              {/* Label */}
              <span className="font-semibold tracking-wide">{tab.label}</span>

              {/* Count badge */}
              {'count' in tab && tab.count !== undefined && (
                <span
                  className={`ml-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all duration-300 ${isActive
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Subtle Pink Indicator */}
      <div
        ref={indicatorRef}
        className="absolute bottom-0 h-1 bg-[#EF3866] transition-all duration-300 rounded-full"
      />
    </div>


  );
};