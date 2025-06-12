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
        return <BookOpen size={16} className="text-[#EF3866]" />;
      case 'user':
        return <User size={16} className="text-gray-500 dark:text-gray-400" />;
      default:
        return <Shield size={16} className="text-blue-500" />;
    }
  };

  const getRoleStyles = (role: string) => {
    switch (role) {
      case 'author':
        return 'bg-gradient-to-r from-[#EF3866] to-[#d7325a] text-white';
      case 'user':
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
      default:
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
    }
  };

  const handleFollowClick = () => {
  console.log('🔍 Follow button clicked:', {
    currentUserId: currentUserId,
    profileId: profile.id,
    isFollowing: isFollowing,
    followLoading: followLoading,
    canFollow: currentUserId && currentUserId !== profile.id
  });
  
  if (!currentUserId) {
    console.log('❌ No current user ID');
    return;
  }
  
  if (currentUserId === profile.id) {
    console.log('❌ Cannot follow self');
    return;
  }
  
  if (followLoading) {
    console.log('❌ Follow operation in progress');
    return;
  }
  
  console.log('✅ Calling onFollow function');
  onFollow();
};

  return (
    <div 
      ref={headerRef}
      className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg overflow-hidden mb-8 transition-colors duration-300"
    >
      {/* Background Gradient */}
      <div className="h-32 bg-gradient-to-r from-[#EF3866]/10 via-gray-50 to-[#EF3866]/5 dark:from-[#EF3866]/20 dark:via-gray-800 dark:to-[#EF3866]/10"></div>
      
      <div className="px-8 pb-8 -mt-16 relative">
        <div className="flex flex-col lg:flex-row items-start gap-8">
          {/* Avatar */}
          <div ref={avatarRef} className="relative">
            <div className="w-32 h-32 bg-gradient-to-br from-[#EF3866] to-gray-700 rounded-2xl overflow-hidden shadow-xl border-4 border-white dark:border-gray-800">
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
                  <User size={48} className="text-white" />
                </div>
              )}
            </div>
            
            {/* Role Badge */}
            <div className="absolute -bottom-2 -right-2">
              <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold shadow-lg ${getRoleStyles(profile.role)}`}>
                {getRoleIcon(profile.role)}
                <span className="capitalize">{profile.role}</span>
              </div>
            </div>
          </div>

          {/* Profile Info */}
          <div className="flex-1 min-w-0">
            <div ref={infoRef} className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {profile.first_name} {profile.last_name}
                </h1>
                {profile.role === 'author' && (
                  <Verified className="w-6 h-6 text-[#EF3866]" />
                )}
              </div>
              
              {profile.username && (
                <p className="text-gray-600 dark:text-gray-400 mb-2">@{profile.username}</p>
              )}
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
                {profile.location && (
                  <div className="flex items-center gap-1">
                    <MapPin size={16} />
                    <span>{profile.location}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Calendar size={16} />
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
            <div ref={statsRef} className="flex items-center gap-8 mb-6">
              <button
                onClick={onOpenFollowers}
                className="group flex items-center gap-2 hover:text-[#EF3866] transition-colors"
              >
                <Users size={20} className="text-gray-500 group-hover:text-[#EF3866]" />
                <div className="text-left">
                  <div className="font-bold text-lg text-gray-900 dark:text-white">
                    {profile.followers_count}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Followers
                  </div>
                </div>
              </button>

              <button
                onClick={onOpenFollowing}
                className="group flex items-center gap-2 hover:text-[#EF3866] transition-colors"
              >
                <Users size={20} className="text-gray-500 group-hover:text-[#EF3866]" />
                <div className="text-left">
                  <div className="font-bold text-lg text-gray-900 dark:text-white">
                    {profile.following_count}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Following
                  </div>
                </div>
              </button>

              {profile.role === 'author' && (
                <div className="flex items-center gap-2">
                  <BookOpen size={20} className="text-gray-500" />
                  <div className="text-left">
                    <div className="font-bold text-lg text-gray-900 dark:text-white">
                      {profile.posts_count}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Posts
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {currentUserId && currentUserId !== profile.id && (
              <div ref={actionsRef} className="flex gap-4">
                <button
                  onClick={handleFollowClick}
                  disabled={followLoading}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                    isFollowing
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                      : 'bg-gradient-to-r from-[#EF3866] to-[#d7325a] text-white hover:from-[#d7325a] hover:to-[#EF3866] shadow-lg hover:shadow-xl'
                  } ${followLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {followLoading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-current border-t-transparent"></div>
                  ) : isFollowing ? (
                    <UserMinus size={20} />
                  ) : (
                    <UserPlus size={20} />
                  )}
                  <span>{isFollowing ? 'Unfollow' : 'Follow'}</span>
                </button>

                <button className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-300">
                  <Mail size={20} />
                  <span>Message</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
