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
      className="bg-white/70 dark:bg-black/70 backdrop-blur-md rounded-2xl border border-gray-200/50 dark:border-gray-800/50 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300"
    >
      {/* Subtle gradient background */}
      <div className="h-20 bg-gradient-to-r from-gray-50/50 to-gray-100/50 dark:from-gray-900/30 dark:to-gray-800/30"></div>

      <div className="px-8 sm:px-12 pb-10 -mt-10 relative">
        <div className="flex flex-col lg:flex-row items-start gap-8">
          {/* Avatar Section */}
          <div ref={avatarRef} className="relative flex-shrink-0">
            <div className="w-28 h-28 sm:w-32 sm:h-32 bg-gradient-to-br from-[#EF3866] to-gray-700 rounded-3xl overflow-hidden border-4 border-white dark:border-black shadow-xl hover:shadow-2xl transition-all duration-300">
              {profile.image_url ? (
                <Image
                  src={profile.image_url}
                  alt={`${profile.first_name} ${profile.last_name}`}
                  width={128}
                  height={128}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User size={40} className="text-white" />
                </div>
              )}
            </div>

            {/* Role Badge */}
            <div className="absolute -bottom-2 -right-2">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium shadow-lg ${getRoleStyles(profile.role)}`}>
                {getRoleIcon(profile.role)}
                <span className="capitalize font-semibold">{profile.role}</span>
              </div>
            </div>
          </div>

          {/* Profile Info */}
          <div className="flex-1 min-w-0 w-full">
            <div ref={infoRef} className="mb-8">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <h1 className="text-3xl sm:text-4xl font-light text-gray-900 dark:text-white tracking-tight">
                      {profile.first_name} {profile.last_name}
                    </h1>
                    {profile.role === 'author' && (
                      <Verified className="w-6 h-6 text-[#EF3866]" />
                    )}
                  </div>

                  {/* Accent line */}
                  <div className="w-16 h-0.5 bg-[#EF3866]"></div>

                  {profile.username && (
                    <p className="text-gray-500 dark:text-gray-400 font-medium text-lg">
                      @{profile.username}
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                {currentUserId && currentUserId !== profile.id && (
                  <div ref={actionsRef} className="flex gap-3">
                    <button
                      onClick={handleFollowClick}
                      disabled={followLoading}
                      className={`group inline-flex items-center gap-3 px-6 py-3 rounded-lg font-medium transition-all duration-300 transform hover:scale-105 ${isFollowing
                          ? 'border border-gray-300 dark:border-gray-600 bg-white dark:bg-black text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 hover:shadow-lg'
                          : 'border border-[#EF3866] bg-[#EF3866] text-white hover:bg-[#d7325a] hover:shadow-lg'
                        } ${followLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {followLoading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"></div>
                      ) : isFollowing ? (
                        <UserMinus size={18} />
                      ) : (
                        <UserPlus size={18} />
                      )}
                      <span>{isFollowing ? 'Unfollow' : 'Follow'}</span>
                    </button>

                    <button className="group inline-flex items-center gap-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-black text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 font-medium px-6 py-3 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg">
                      <Mail size={18} />
                      <span className="hidden sm:inline">Message</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Meta Info */}
              <div className="flex flex-wrap items-center gap-6 text-gray-600 dark:text-gray-400 mb-6">
                {profile.location && (
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-[#EF3866]" />
                    <span className="font-light">{profile.location}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-[#EF3866]" />
                  <span className="font-light">Joined {formatDate(profile.created_at)}</span>
                </div>
              </div>

              {profile.bio && (
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed max-w-3xl font-light text-lg">
                  {profile.bio}
                </p>
              )}
            </div>

            {/* Stats Section */}
            <div ref={statsRef} className="border-t border-gray-200/50 dark:border-gray-800/50 pt-8">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-8">
                <button
                  onClick={onOpenFollowers}
                  className="group text-center hover:scale-105 transition-all duration-300"
                >
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Users size={20} className="text-gray-400 group-hover:text-[#EF3866] transition-colors" />
                  </div>
                  <div className="font-light text-2xl sm:text-3xl text-gray-900 dark:text-white group-hover:text-[#EF3866] transition-colors tracking-tight">
                    {profile.followers_count}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 font-medium uppercase tracking-wide">
                    Followers
                  </div>
                </button>

                <button
                  onClick={onOpenFollowing}
                  className="group text-center hover:scale-105 transition-all duration-300"
                >
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Users size={20} className="text-gray-400 group-hover:text-[#EF3866] transition-colors" />
                  </div>
                  <div className="font-light text-2xl sm:text-3xl text-gray-900 dark:text-white group-hover:text-[#EF3866] transition-colors tracking-tight">
                    {profile.following_count}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 font-medium uppercase tracking-wide">
                    Following
                  </div>
                </button>

                {profile.role === 'author' && (
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <BookOpen size={20} className="text-gray-400" />
                    </div>
                    <div className="font-light text-2xl sm:text-3xl text-gray-900 dark:text-white tracking-tight">
                      {profile.posts_count}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 font-medium uppercase tracking-wide">
                      Posts
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};