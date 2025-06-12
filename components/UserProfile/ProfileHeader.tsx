// components/UserProfile/ProfileHeader.tsx
'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { gsap } from 'gsap';
import { 
  User, 
  MapPin, 
  Calendar, 
  Users, 
  BookOpen, 
  UserPlus, 
  UserMinus, 
  Mail, 
  Shield,
  Verified
} from 'lucide-react';
import { UserProfile } from '@/types/user';

interface ProfileHeaderProps {
  profile: UserProfile;
  currentUserId?: string;
  isFollowing: boolean;
  followLoading: boolean;
  onFollow: () => void;
  onOpenFollowers: () => void;
  onOpenFollowing: () => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  profile,
  currentUserId,
  isFollowing,
  followLoading,
  onFollow,
  onOpenFollowers,
  onOpenFollowing
}) => {
  const headerRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (headerRef.current) {
      const tl = gsap.timeline();
      
      gsap.set([avatarRef.current, infoRef.current, statsRef.current, actionsRef.current], {
        opacity: 0,
        y: 30
      });

      tl.to(avatarRef.current, {
        opacity: 1,
        y: 0,
        duration: 0.6,
        ease: "power2.out"
      })
      .to(infoRef.current, {
        opacity: 1,
        y: 0,
        duration: 0.5,
        ease: "power2.out"
      }, "-=0.4")
      .to(statsRef.current, {
        opacity: 1,
        y: 0,
        duration: 0.4,
        ease: "power2.out"
      }, "-=0.3")
      .to(actionsRef.current, {
        opacity: 1,
        y: 0,
        duration: 0.4,
        ease: "power2.out"
      }, "-=0.2");
    }
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'author':
        return <BookOpen size={14} className="text-white" />;
      case 'user':
        return <User size={14} className="text-white" />;
      default:
        return <Shield size={14} className="text-white" />;
    }
  };

  const getRoleStyles = (role: string) => {
    switch (role) {
      case 'author':
        return 'bg-gradient-to-r from-[#EF3866] to-[#d7325a] text-white shadow-lg';
      case 'user':
        return 'bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-lg';
      default:
        return 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg';
    }
  };

  const handleFollowClick = () => {
    if (!currentUserId || currentUserId === profile.id || followLoading) return;
    onFollow();
  };

  return (
    <div 
      ref={headerRef}
      className="bg-white dark:bg-black rounded-3xl border border-gray-100 dark:border-gray-800 overflow-hidden"
    >
      {/* Minimal gradient background */}
      <div className="h-24 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800"></div>
      
      <div className="px-6 sm:px-8 pb-8 -mt-12 relative">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          {/* Avatar Section */}
          <div ref={avatarRef} className="relative flex-shrink-0">
            <div className="w-24 h-24 sm:w-28 sm:h-28 bg-gradient-to-br from-[#EF3866] to-gray-700 rounded-2xl overflow-hidden border-4 border-white dark:border-black shadow-xl">
              {profile.image_url ? (
                <Image
                  src={profile.image_url}
                  alt={`${profile.first_name} ${profile.last_name}`}
                  width={112}
                  height={112}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User size={32} className="text-white" />
                </div>
              )}
            </div>
            
            {/* Role Badge */}
            <div className="absolute -bottom-1 -right-1">
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getRoleStyles(profile.role)}`}>
                {getRoleIcon(profile.role)}
                <span className="capitalize">{profile.role}</span>
              </div>
            </div>
          </div>

          {/* Profile Info */}
          <div className="flex-1 min-w-0 w-full">
            <div ref={infoRef} className="mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                      {profile.first_name} {profile.last_name}
                    </h1>
                    {profile.role === 'author' && (
                      <Verified className="w-5 h-5 text-[#EF3866]" />
                    )}
                  </div>
                  
                  {profile.username && (
                    <p className="text-gray-500 dark:text-gray-400 font-medium">@{profile.username}</p>
                  )}
                </div>

                {/* Action Buttons - Mobile optimized */}
                {currentUserId && currentUserId !== profile.id && (
                  <div ref={actionsRef} className="flex gap-3">
                    <button
                      onClick={handleFollowClick}
                      disabled={followLoading}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 ${
                        isFollowing
                          ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                          : 'bg-gradient-to-r from-[#EF3866] to-[#d7325a] text-white hover:shadow-lg hover:scale-105'
                      } ${followLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {followLoading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"></div>
                      ) : isFollowing ? (
                        <UserMinus size={16} />
                      ) : (
                        <UserPlus size={16} />
                      )}
                      <span>{isFollowing ? 'Unfollow' : 'Follow'}</span>
                    </button>

                    <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-300 font-semibold text-sm">
                      <Mail size={16} />
                      <span className="hidden sm:inline">Message</span>
                    </button>
                  </div>
                )}
              </div>
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
                {profile.location && (
                  <div className="flex items-center gap-1.5">
                    <MapPin size={14} />
                    <span>{profile.location}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Calendar size={14} />
                  <span>Joined {formatDate(profile.created_at)}</span>
                </div>
              </div>

              {profile.bio && (
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed max-w-2xl">
                  {profile.bio}
                </p>
              )}
            </div>

            {/* Stats */}
            <div ref={statsRef} className="flex items-center gap-6 sm:gap-8">
              <button
                onClick={onOpenFollowers}
                className="group flex items-center gap-2 hover:scale-105 transition-transform duration-200"
              >
                <Users size={18} className="text-gray-400 group-hover:text-[#EF3866] transition-colors" />
                <div className="text-left">
                  <div className="font-bold text-lg text-gray-900 dark:text-white group-hover:text-[#EF3866] transition-colors">
                    {profile.followers_count}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Followers
                  </div>
                </div>
              </button>

              <button
                onClick={onOpenFollowing}
                className="group flex items-center gap-2 hover:scale-105 transition-transform duration-200"
              >
                <Users size={18} className="text-gray-400 group-hover:text-[#EF3866] transition-colors" />
                <div className="text-left">
                  <div className="font-bold text-lg text-gray-900 dark:text-white group-hover:text-[#EF3866] transition-colors">
                    {profile.following_count}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Following
                  </div>
                </div>
              </button>

              {profile.role === 'author' && (
                <div className="flex items-center gap-2">
                  <BookOpen size={18} className="text-gray-400" />
                  <div className="text-left">
                    <div className="font-bold text-lg text-gray-900 dark:text-white">
                      {profile.posts_count}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Posts
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};