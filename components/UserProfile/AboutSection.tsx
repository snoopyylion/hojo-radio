// components/UserProfile/AboutSection.tsx
'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { 
  Mail, 
  MapPin, 
  Calendar, 
  Globe, 
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
    <div ref={containerRef} className="space-y-8">
      {/* Basic Information */}
      <div className="about-section bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <User size={20} className="text-[#EF3866]" />
          Basic Information
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Full Name
              </label>
              <p className="text-gray-900 dark:text-white font-medium">
                {profile.first_name} {profile.last_name}
              </p>
            </div>
            
            {profile.username && (
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Username
                </label>
                <p className="text-gray-900 dark:text-white">
                  @{profile.username}
                </p>
              </div>
            )}
            
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Role
              </label>
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${roleInfo.color}`}>
                <RoleIcon size={14} />
                {roleInfo.label}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {roleInfo.description}
              </p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Member Since
              </label>
              <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                <Calendar size={16} className="text-gray-500" />
                {formatDate(profile.created_at)}
              </div>
            </div>
            
            {profile.location && (
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Location
                </label>
                <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                  <MapPin size={16} className="text-gray-500" />
                  {profile.location}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="about-section bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <Mail size={20} className="text-[#EF3866]" />
          Contact Information
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <Mail size={18} className="text-gray-500 dark:text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</p>
              <p className="text-gray-900 dark:text-white">{profile.email}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bio Section */}
      {profile.bio && (
        <div className="about-section bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <BookOpen size={20} className="text-[#EF3866]" />
            About
          </h3>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            {profile.bio}
          </p>
        </div>
      )}

      {/* Statistics */}
      <div className="about-section bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <Award size={20} className="text-[#EF3866]" />
          Profile Statistics
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-2xl font-bold text-[#EF3866] mb-1">
              {profile.followers_count}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Followers
            </div>
          </div>
          
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-2xl font-bold text-[#EF3866] mb-1">
              {profile.following_count}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Following
            </div>
          </div>
          
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-2xl font-bold text-[#EF3866] mb-1">
              {profile.posts_count}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Posts
            </div>
          </div>
          
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-2xl font-bold text-[#EF3866] mb-1">
              {Math.floor(Math.random() * 1000) + 100}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Total Views
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};