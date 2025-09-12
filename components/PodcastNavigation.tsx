'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Radio, Mic, Compass } from 'lucide-react';

export default function PodcastNavigation() {
  const pathname = usePathname();

  const navItems = [
    {
      href: '/home/podcasts',
      label: 'Studio',
      icon: Mic,
      description: 'Create & Record'
    },
    {
      href: '/home/podcasts/discover',
      label: 'Discover',
      icon: Compass,
      description: 'Find Live Shows'
    }
  ];

  return (
    <div className="bg-gray-800 rounded-lg p-4 mb-6">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Radio className="w-5 h-5 text-red-500" />
          <span className="font-semibold text-white">Podcast</span>
        </div>
        
        <nav className="flex gap-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-red-600 text-white'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                <div className="text-sm">
                  <div className="font-medium">{item.label}</div>
                  <div className="text-xs opacity-75">{item.description}</div>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
