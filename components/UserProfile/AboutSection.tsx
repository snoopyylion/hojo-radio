// components/UserProfile/AboutSection.tsx
'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { 
  Mail, 
  MapPin, 
  Calendar,
  User, 
  Shield,
  Award,
  BookOpen
} from 'lucide-react';
import { UserProfile } from '@/types/user';

interface AboutSectionProps {
  profile: UserProfile;
}

export const AboutSection: React.FC<AboutSectionProps> = ({ profile }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      const sections = containerRef.current.querySelectorAll('.about-section');
      gsap.fromTo(sections, 
        { opacity: 0, y: 20 },
        { 
          opacity: 1, 
          y: 0, 
          duration: 0.6,
          stagger: 0.15,
          ease: "power2.out"
        }
      );
    }
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getRoleInfo = (role: string) => {
    switch (role) {
      case 'author':
        return {
          icon: BookOpen,
          label: 'Content Author',
          description: 'Verified content creator and writer',
          color: 'text-[#EF3866] bg-[#EF3866]/10'
        };
      case 'admin':
        return {
          icon: Shield,
          label: 'Administrator',
          description: 'Platform administrator with full access',
          color: 'text-blue-600 bg-blue-100'
        };
      default:
        return {
          icon: User,
          label: 'Community Member',
          description: 'Active community participant',
          color: 'text-gray-600 bg-gray-100'
        };
    }
  };

  const roleInfo = getRoleInfo(profile.role);
  const RoleIcon = roleInfo.icon;

  return (
    <div className="space-y-6 sm:space-y-8 lg:space-y-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
  {/* Basic Information */}
  <div className="bg-white/70 dark:bg-black/70 backdrop-blur-md border border-gray-200/50 dark:border-gray-800/50 rounded-2xl p-6 sm:p-8 shadow-sm hover:shadow-md transition-all duration-300">
    <div className="flex items-center gap-3 mb-6">
      <div className="p-2 bg-[#EF3866] text-white rounded-lg shadow">
        <User size={22} />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Basic Information</h3>
    </div>

    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <div className="space-y-6">
        <div className="p-5 bg-white/50 dark:bg-black/50 backdrop-blur-md rounded-xl border border-gray-200/50 dark:border-gray-700/50 transition-all">
          <label className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase block mb-2">
            Full Name
          </label>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {profile.first_name} {profile.last_name}
          </p>
        </div>

        {profile.username && (
          <div className="p-5 bg-white/50 dark:bg-black/50 backdrop-blur-md rounded-xl border border-gray-200/50 dark:border-gray-700/50 transition-all">
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase block mb-2">
              Username
            </label>
            <p className="text-base font-medium text-[#EF3866] break-all">@{profile.username}</p>
          </div>
        )}

        <div className="p-5 bg-white/50 dark:bg-black/50 backdrop-blur-md rounded-xl border border-gray-200/50 dark:border-gray-700/50">
          <label className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase block mb-2">
            Role
          </label>
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${roleInfo.color} shadow-sm`}>
            <RoleIcon size={16} />
            <span>{roleInfo.label}</span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-3 leading-relaxed">
            {roleInfo.description}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center gap-4 p-5 bg-white/50 dark:bg-black/50 backdrop-blur-md rounded-xl border border-gray-200/50 dark:border-gray-700/50">
          <div className="p-3 bg-[#EF3866] text-white rounded-lg shadow">
            <Calendar size={20} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase block mb-1">
              Member Since
            </label>
            <p className="text-base font-semibold text-gray-900 dark:text-white">
              {formatDate(profile.created_at)}
            </p>
          </div>
        </div>

        {profile.location && (
          <div className="flex items-center gap-4 p-5 bg-white/50 dark:bg-black/50 backdrop-blur-md rounded-xl border border-gray-200/50 dark:border-gray-700/50">
            <div className="p-3 bg-[#EF3866] text-white rounded-lg shadow">
              <MapPin size={20} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase block mb-1">
                Location
              </label>
              <p className="text-base font-semibold text-gray-900 dark:text-white break-words">
                {profile.location}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>

  {/* Contact Information */}
  <div className="bg-white/70 dark:bg-black/70 backdrop-blur-md border border-gray-200/50 dark:border-gray-800/50 rounded-2xl p-6 sm:p-8 shadow-sm hover:shadow-md transition-all duration-300">
    <div className="flex items-center gap-3 mb-6">
      <div className="p-2 bg-[#EF3866] text-white rounded-lg shadow">
        <Mail size={22} />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Contact Information</h3>
    </div>

    <div className="flex items-center gap-4 p-5 bg-white/50 dark:bg-black/50 backdrop-blur-md rounded-xl border border-gray-200/50 dark:border-gray-700/50">
      <div className="p-3 bg-[#EF3866] text-white rounded-lg shadow">
        <Mail size={20} />
      </div>
      <div>
        <label className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase block mb-1">
          Email Address
        </label>
        <p className="text-base font-semibold text-gray-900 dark:text-white break-all">
          {profile.email}
        </p>
      </div>
    </div>
  </div>
</div>
  );
};