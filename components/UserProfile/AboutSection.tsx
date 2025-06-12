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
    <div ref={containerRef} className="space-y-4 sm:space-y-6 lg:space-y-8 w-full max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
      {/* Basic Information */}
      <div className="about-section bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-sm dark:shadow-lg transition-all duration-300">
        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6 lg:mb-8">
          <div className="p-1.5 sm:p-2 bg-gradient-to-r from-[#EF3866] to-pink-500 rounded-lg">
            <User size={20} className="sm:hidden text-white" />
            <User size={24} className="hidden sm:block text-white" />
          </div>
          <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
            Basic Information
          </h3>
        </div>
        
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
          <div className="space-y-4 sm:space-y-6">
            <div className="group">
              <label className="text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 sm:mb-2 block">
                Full Name
              </label>
              <p className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 dark:text-white group-hover:text-[#EF3866] dark:group-hover:text-[#EF3866] transition-colors break-words">
                {profile.first_name} {profile.last_name}
              </p>
            </div>
            
            {profile.username && (
              <div className="group">
                <label className="text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 sm:mb-2 block">
                  Username
                </label>
                <p className="text-sm sm:text-base lg:text-lg text-gray-900 dark:text-white font-medium group-hover:text-[#EF3866] dark:group-hover:text-[#EF3866] transition-colors break-all">
                  @{profile.username}
                </p>
              </div>
            )}
            
            <div>
              <label className="text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 sm:mb-3 block">
                Role
              </label>
              <div className={`inline-flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold ${roleInfo.color} shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105`}>
                <RoleIcon size={14} className="sm:hidden" />
                <RoleIcon size={16} className="hidden sm:block" />
                <span className="whitespace-nowrap">{roleInfo.label}</span>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-2 sm:mt-3 leading-relaxed">
                {roleInfo.description}
              </p>
            </div>
          </div>
          
          <div className="space-y-4 sm:space-y-6">
            <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 border-gray-200 dark:bg-gray-900 rounded-lg sm:rounded-xl border dark:border-gray-800 hover:border-[#EF3866] dark:hover:border-[#EF3866] transition-all duration-300">
              <div className="p-1.5 sm:p-2 bg-[#EF3866] text-white bg-opacity-10 dark:bg-[#EF3866] dark:bg-opacity-20 rounded-lg flex-shrink-0">
                <Calendar size={16} className="sm:hidden" />
                <Calendar size={20} className="hidden sm:block" />
              </div>
              <div className="min-w-0 flex-1">
                <label className="text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block">
                  Member Since
                </label>
                <p className="text-sm sm:text-base text-gray-900 dark:text-white font-medium mt-0.5 sm:mt-1 truncate">
                  {formatDate(profile.created_at)}
                </p>
              </div>
            </div>
            
            {profile.location && (
              <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 dark:bg-gray-900 rounded-lg sm:rounded-xl border dark:border-gray-800 hover:border-[#EF3866] dark:hover:border-[#EF3866] transition-all duration-300">
                <div className="p-1.5 sm:p-2 bg-[#EF3866] bg-opacity-10 text-white dark:bg-[#EF3866] dark:bg-opacity-20 rounded-lg flex-shrink-0">
                  <MapPin size={16} className="sm:hidden" />
                  <MapPin size={20} className="hidden sm:block" />
                </div>
                <div className="min-w-0 flex-1">
                  <label className="text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block">
                    Location
                  </label>
                  <p className="text-sm sm:text-base text-gray-900 dark:text-white font-medium mt-0.5 sm:mt-1 break-words">
                    {profile.location}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="about-section bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-sm dark:shadow-lg transition-all duration-300">
        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6 lg:mb-8">
          <div className="p-1.5 sm:p-2 bg-gradient-to-r from-[#EF3866] to-pink-500 rounded-lg">
            <Mail size={20} className="sm:hidden text-white" />
            <Mail size={24} className="hidden sm:block text-white" />
          </div>
          <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
            Contact Information
          </h3>
        </div>
        
        <div className="flex items-center gap-3 sm:gap-4 p-4 sm:p-6 bg-gradient-to-r border-gray-200 from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-lg sm:rounded-xl border dark:border-gray-800 hover:border-[#EF3866] dark:hover:border-[#EF3866] transition-all duration-300 group">
          <div className="p-2 sm:p-3 bg-[#EF3866] text-white bg-opacity-10 dark:bg-[#EF3866] dark:bg-opacity-20 rounded-lg group-hover:bg-[#EF3866] group-hover:bg-opacity-100 transition-all duration-300 flex-shrink-0">
            <Mail size={20} className="sm:hidden group-hover:text-white transition-colors duration-300" />
            <Mail size={24} className="hidden sm:block group-hover:text-white transition-colors duration-300" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Email Address</p>
            <p className="text-sm sm:text-base lg:text-lg font-medium text-gray-900 dark:text-white mt-0.5 sm:mt-1 group-hover:text-[#EF3866] dark:group-hover:text-[#EF3866] transition-colors duration-300 break-all">
              {profile.email}
            </p>
          </div>
        </div>
      </div>

      {/* Bio Section */}
      {profile.bio && (
        <div className="about-section bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-sm dark:shadow-lg transition-all duration-300">
          <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <div className="p-1.5 sm:p-2 bg-gradient-to-r from-[#EF3866] to-pink-500 rounded-lg">
              <BookOpen size={20} className="sm:hidden text-white" />
              <BookOpen size={24} className="hidden sm:block text-white" />
            </div>
            <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
              About Me
            </h3>
          </div>
          <div className="p-4 sm:p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-lg sm:rounded-xl border dark:border-gray-800">
            <p className="text-sm sm:text-base lg:text-lg text-gray-700 dark:text-gray-300 leading-relaxed font-medium break-words">
              {profile.bio}
            </p>
          </div>
        </div>
      )}

      {/* Statistics */}
      <div className="about-section bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-sm dark:shadow-lg transition-all duration-300">
        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6 lg:mb-8">
          <div className="p-1.5 sm:p-2 bg-gradient-to-r from-[#EF3866] to-pink-500 rounded-lg">
            <Award size={20} className="sm:hidden text-white" />
            <Award size={24} className="hidden sm:block text-white" />
          </div>
          <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
            Profile Statistics
          </h3>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <div className="text-center p-3 sm:p-4 lg:p-6 bg-gradient-to-br from-[#EF3866] to-pink-500 rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 group">
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-1 sm:mb-2">
              {profile.followers_count.toLocaleString()}
            </div>
            <div className="text-xs sm:text-sm text-pink-100 font-medium uppercase tracking-wide">
              Followers
            </div>
          </div>
          
          <div className="text-center p-3 sm:p-4 lg:p-6 border-gray-200 bg-gray-50 dark:bg-gray-900 rounded-lg sm:rounded-xl border dark:border-gray-800 hover:border-[#EF3866] dark:hover:border-[#EF3866] transition-all duration-300 transform hover:scale-105 group">
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#EF3866] mb-1 sm:mb-2">
              {profile.following_count.toLocaleString()}
            </div>
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium uppercase tracking-wide group-hover:text-[#EF3866] transition-colors">
              Following
            </div>
          </div>
          
          <div className="text-center p-3 sm:p-4 lg:p-6 border-gray-200 bg-gray-50 dark:bg-gray-900 rounded-lg sm:rounded-xl border dark:border-gray-800 hover:border-[#EF3866] dark:hover:border-[#EF3866] transition-all duration-300 transform hover:scale-105 group">
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#EF3866] mb-1 sm:mb-2">
              {profile.posts_count.toLocaleString()}
            </div>
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium uppercase tracking-wide group-hover:text-[#EF3866] transition-colors">
              Posts
            </div>
          </div>
          
          <div className="text-center p-3 sm:p-4 lg:p-6 border-gray-200 bg-gray-50 dark:bg-gray-900 rounded-lg sm:rounded-xl border dark:border-gray-800 hover:border-[#EF3866] dark:hover:border-[#EF3866] transition-all duration-300 transform hover:scale-105 group">
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#EF3866] mb-1 sm:mb-2">
              {(Math.floor(Math.random() * 1000) + 100).toLocaleString()}
            </div>
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium uppercase tracking-wide group-hover:text-[#EF3866] transition-colors">
              Total Views
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};