"use client";

import { useRouter } from 'next/navigation';
import { Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import UserStatsSection from "@/components/Dashboard/UderStatsSection";
import { SmartUserActivityFeed } from '@/components/Dashboard/UserActivityFeed';
import { useUserLikes } from '@/hooks/user-likes/useUserLikes';
import { useUserComments } from '@/hooks/user-comments/useUserComments';
import { useUserCreatedAt, useUserMemberSince } from '@/hooks/user-created/useUserCreatedAt';

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  role: "user" | "author";
  image_url?: string;
  profile_completed?: boolean;
  bio?: string;
  location?: string;
  website?: string;
  phone?: string;
  date_of_birth?: string;
  created_at: string;
  updated_at: string;
  followers_count?: number;
  following_count?: number;
  posts_count?: number;
}

interface OverviewSectionProps {
  userProfile: UserProfile;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  verifiedNewsCount: number;
  loading: boolean;
}

export default function OverviewSection({
  userProfile,
  verifiedNewsCount,
  loading
}: OverviewSectionProps) {
  const router = useRouter();
  const { totalLikes: userLikedPosts } = useUserLikes();
  const { totalComments } = useUserComments();
  const { loading: createdAtLoading } = useUserCreatedAt();
  const { memberSince, daysSinceJoining } = useUserMemberSince();

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-4 lg:px-0 w-full">
      {/* Header Section - Fully responsive */}
      <div className="flex flex-col gap-4 sm:gap-6 p-4 sm:p-6 bg-white dark:bg-black rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
        {/* Profile Info Section */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 w-full">
          {userProfile.image_url && (
            <div className="relative flex-shrink-0">
              <img
                src={userProfile.image_url}
                alt={`${userProfile.first_name} ${userProfile.last_name}`}
                className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-lg sm:rounded-xl object-cover border-2 border-gray-200 dark:border-gray-700 shadow-sm"
              />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 bg-emerald-500 border-2 sm:border-3 border-white dark:border-black rounded-full shadow-sm"></div>
            </div>
          )}
          <div className="flex-1 min-w-0 text-center sm:text-left">
            <h1 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-black dark:text-white tracking-tight leading-tight break-words">
              {userProfile.first_name} {userProfile.last_name}
            </h1>
            <p className="text-gray-600 dark:text-gray-300 font-medium mt-1 sm:mt-2 text-sm sm:text-base lg:text-lg break-all">@{userProfile.username}</p>
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 mt-2 sm:mt-3">
              <span className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${userProfile.profile_completed
                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300'
                  : 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300'
                }`}>
                {userProfile.profile_completed ? 'Profile Complete' : 'Profile Incomplete'}
              </span>
              <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 capitalize">
                {userProfile.role}
              </span>
            </div>
          </div>
        </div>
  
        {/* Edit Profile Button */}
        <div className="flex justify-center sm:justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/hashedpage/profile')}
            className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-white dark:bg-black border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-950 transition-all duration-200 rounded-lg font-medium shadow-sm hover:shadow-md flex-shrink-0 w-full sm:w-auto justify-center text-sm sm:text-base"
          >
            <Edit3 className="w-3 h-3 sm:w-4 sm:h-4" />
            Edit Profile
          </Button>
        </div>
      </div>
  
      {/* Stats Cards - Responsive grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-black rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2 sm:mb-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-gray-100 dark:bg-gray-800 rounded-lg sm:rounded-xl flex items-center justify-center">
              <div className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 bg-gray-600 dark:text-gray-300 rounded"></div>
            </div>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-300 text-xs sm:text-sm font-medium tracking-wide uppercase mb-1 sm:mb-2">Role</p>
            <p className="text-black dark:text-white text-lg sm:text-xl lg:text-2xl font-bold capitalize leading-tight">
              {userProfile.role}
            </p>
          </div>
        </div>
  
        <div className="bg-white dark:bg-black rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2 sm:mb-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-gray-100 dark:bg-gray-800 rounded-lg sm:rounded-xl flex items-center justify-center">
              <div className={`w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 rounded ${userProfile.profile_completed ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
            </div>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-300 text-xs sm:text-sm font-medium tracking-wide uppercase mb-1 sm:mb-2">Status</p>
            <p className="text-black dark:text-white text-lg sm:text-xl lg:text-2xl font-bold leading-tight">
              {userProfile.profile_completed ? 'Complete' : 'Incomplete'}
            </p>
          </div>
        </div>
  
        <div className="bg-white dark:bg-black rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2 sm:mb-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-gray-100 dark:bg-gray-800 rounded-lg sm:rounded-xl flex items-center justify-center">
              <div className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 bg-blue-500 rounded"></div>
            </div>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-300 text-xs sm:text-sm font-medium tracking-wide uppercase mb-1 sm:mb-2">Active Days</p>
            <p className="text-black dark:text-white text-lg sm:text-xl lg:text-2xl font-bold leading-tight">
              {createdAtLoading ? (
                <span className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-6 sm:h-7 lg:h-8 w-12 sm:w-14 lg:w-16 inline-block"></span>
              ) : (
                `${daysSinceJoining}`
              )}
            </p>
          </div>
        </div>
  
        <div className="bg-white dark:bg-black rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2 sm:mb-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-gray-100 dark:bg-gray-800 rounded-lg sm:rounded-xl flex items-center justify-center">
              <div className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 bg-purple-500 rounded"></div>
            </div>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-300 text-xs sm:text-sm font-medium tracking-wide uppercase mb-1 sm:mb-2">Member Since</p>
            <p className="text-black dark:text-white text-sm sm:text-base lg:text-lg font-bold leading-tight">
              {createdAtLoading ? (
                <span className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-5 sm:h-6 w-16 sm:w-20 inline-block"></span>
              ) : (
                memberSince || new Date(userProfile.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  year: 'numeric'
                })
              )}
            </p>
          </div>
        </div>
      </div>
  
      {/* Main Content Grid - Responsive layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
        {/* Account Information - Responsive columns */}
        <div className="xl:col-span-2 space-y-4 sm:space-y-6">
          {/* Personal Information Card */}
          <div className="bg-white dark:bg-black rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
            <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-1.5 sm:w-2 h-6 sm:h-8 bg-gradient-to-b from-[#EF3866] to-[#EF3866]/80 rounded-full"></div>
                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-black dark:text-white tracking-tight">Personal Information</h3>
              </div>
            </div>
  
            <div className="p-4 sm:p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
                <div className="space-y-4 sm:space-y-6">
                  <div className="group">
                    <label className="text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-300 mb-2 sm:mb-3 block tracking-wider uppercase">Email Address</label>
                    <div className="bg-gray-50 dark:bg-gray-950 rounded-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-700 group-hover:border-gray-300 dark:group-hover:border-gray-600 transition-all duration-200">
                      <span className="text-black dark:text-white font-medium text-sm sm:text-base lg:text-lg break-all">{userProfile.email}</span>
                    </div>
                  </div>
  
                  {userProfile.phone && (
                    <div className="group">
                      <label className="text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-300 mb-2 sm:mb-3 block tracking-wider uppercase">Phone Number</label>
                      <div className="bg-gray-50 dark:bg-gray-950 rounded-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-700 group-hover:border-gray-300 dark:group-hover:border-gray-600 transition-all duration-200">
                        <span className="text-black dark:text-white font-medium text-sm sm:text-base lg:text-lg">{userProfile.phone}</span>
                      </div>
                    </div>
                  )}
  
                  {userProfile.location && (
                    <div className="group">
                      <label className="text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-300 mb-2 sm:mb-3 block tracking-wider uppercase">Location</label>
                      <div className="bg-gray-50 dark:bg-gray-950 rounded-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-700 group-hover:border-gray-300 dark:group-hover:border-gray-600 transition-all duration-200">
                        <span className="text-black dark:text-white font-medium text-sm sm:text-base lg:text-lg break-words">{userProfile.location}</span>
                      </div>
                    </div>
                  )}
                </div>
  
                <div className="space-y-4 sm:space-y-6">
                  {userProfile.date_of_birth && (
                    <div className="group">
                      <label className="text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-300 mb-2 sm:mb-3 block tracking-wider uppercase">Date of Birth</label>
                      <div className="bg-gray-50 dark:bg-gray-950 rounded-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-700 group-hover:border-gray-300 dark:group-hover:border-gray-600 transition-all duration-200">
                        <span className="text-black dark:text-white font-medium text-sm sm:text-base lg:text-lg">
                          {new Date(userProfile.date_of_birth).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>
                  )}
  
                  {userProfile.website && (
                    <div className="group">
                      <label className="text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-300 mb-2 sm:mb-3 block tracking-wider uppercase">Website</label>
                      <div className="bg-gray-50 dark:bg-gray-950 rounded-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-700 group-hover:border-gray-300 dark:group-hover:border-gray-600 transition-all duration-200">
                        <a
                          href={userProfile.website.startsWith('http') ? userProfile.website : `https://${userProfile.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-black dark:text-white hover:text-blue-600 dark:hover:text-blue-400 font-medium text-sm sm:text-base lg:text-lg transition-colors underline decoration-gray-400 hover:decoration-blue-600 dark:hover:decoration-blue-400 underline-offset-4 break-all"
                        >
                          {userProfile.website}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
  
              {userProfile.bio && (
                <div className="mt-6 sm:mt-8">
                  <label className="text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-300 mb-2 sm:mb-3 block tracking-wider uppercase">Biography</label>
                  <div className="bg-gray-50 dark:bg-gray-950 rounded-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
                    <p className="text-black dark:text-white leading-relaxed text-sm sm:text-base lg:text-lg break-words">{userProfile.bio}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
  
          {/* Account Timeline Card */}
          <div className="bg-white dark:bg-black rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
            <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-1.5 sm:w-2 h-6 sm:h-8 bg-gradient-to-b from-[#EF3866] to-[#EF3866]/80 rounded-full"></div>
                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-black dark:text-white tracking-tight">Account Timeline</h3>
              </div>
            </div>
  
            <div className="p-4 sm:p-6">
              <div className="space-y-3 sm:space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 sm:p-4 bg-gray-50 dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200">
                  <div className="flex items-center gap-3 sm:gap-4 flex-1">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-gray-400 dark:bg-gray-500 rounded-full flex-shrink-0"></div>
                    <span className="text-black dark:text-white font-semibold text-sm sm:text-base lg:text-lg">Account Created</span>
                  </div>
                  <span className="text-gray-500 dark:text-gray-300 font-medium text-sm sm:text-base ml-5 sm:ml-0">
                    {createdAtLoading ? (
                      <span className="animate-pulse bg-gray-200 dark:bg-gray-600 rounded h-4 sm:h-5 w-20 sm:w-24 inline-block"></span>
                    ) : (
                      memberSince || new Date(userProfile.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                    )}
                  </span>
                </div>
  
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 sm:p-4 bg-gray-50 dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200">
                  <div className="flex items-center gap-3 sm:gap-4 flex-1">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-blue-500 rounded-full flex-shrink-0"></div>
                    <span className="text-black dark:text-white font-semibold text-sm sm:text-base lg:text-lg">Last Profile Update</span>
                  </div>
                  <span className="text-gray-500 dark:text-gray-300 font-medium text-sm sm:text-base ml-5 sm:ml-0">
                    {new Date(userProfile.updated_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
  
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 sm:p-4 bg-gray-50 dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200">
                  <div className="flex items-center gap-3 sm:gap-4 flex-1">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-purple-500 rounded-full flex-shrink-0"></div>
                    <span className="text-black dark:text-white font-semibold text-sm sm:text-base lg:text-lg">Days Active</span>
                  </div>
                  <span className="text-gray-500 dark:text-gray-300 font-medium text-sm sm:text-base ml-5 sm:ml-0">
                    {createdAtLoading ? (
                      <span className="animate-pulse bg-gray-200 dark:bg-gray-600 rounded h-4 sm:h-5 w-12 sm:w-16 inline-block"></span>
                    ) : (
                      `${daysSinceJoining} days`
                    )}
                  </span>
                </div>
  
                {userProfile.role === 'author' && (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 sm:p-4 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                    <div className="flex items-center gap-3 sm:gap-4 flex-1">
                      <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-emerald-500 rounded-full flex-shrink-0"></div>
                      <span className="text-black dark:text-white font-semibold text-sm sm:text-base lg:text-lg">Author Status</span>
                    </div>
                    <span className="text-emerald-800 dark:text-emerald-300 font-bold bg-emerald-100 dark:bg-emerald-800/50 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm ml-5 sm:ml-0 w-fit">
                      Active Author
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
  
        {/* Activity Sidebar - Responsive width */}
        <div className="space-y-4 sm:space-y-6">
          {/* Quick Activity Card */}
          <div className="bg-white dark:bg-black rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
            <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-1.5 sm:w-2 h-6 sm:h-8 bg-gradient-to-b from-[#EF3866] to-[#EF3866]/80 rounded-full"></div>
                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-black dark:text-white tracking-tight">Quick Stats</h3>
              </div>
            </div>
  
            <div className="p-4 sm:p-6">
              <div className="space-y-2 sm:space-y-3">
                {[
                  { label: 'Viewed 5 articles today', color: 'bg-blue-500' },
                  { label: 'Dashboard accessed', color: 'bg-green-500' },
                  { label: 'Profile updated', color: 'bg-purple-500' },
                ].map(({ label, color }, idx) => (
                  <div key={idx} className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-gray-50 dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${color} flex-shrink-0`}></div>
                    <span className="text-gray-700 dark:text-gray-200 font-medium flex-1 text-sm sm:text-base break-words">{label}</span>
                  </div>
                ))}
                <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-gray-50 dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-orange-500 rounded-full flex-shrink-0"></div>
                  <span className="text-gray-700 dark:text-gray-200 font-medium flex-1 text-sm sm:text-base">
                    {createdAtLoading ? (
                      <span className="animate-pulse bg-gray-200 dark:bg-gray-600 rounded h-3 sm:h-4 w-20 sm:w-24 inline-block"></span>
                    ) : (
                      `${daysSinceJoining} days active`
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
  
          {/* Recent Activity Feed */}
          <div className="bg-white dark:bg-black rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
            <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-gray-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-1.5 sm:w-2 h-6 sm:h-8 bg-gradient-to-b from-[#EF3866] to-[#EF3866]/80 rounded-full"></div>
                  <h4 className="text-lg sm:text-xl lg:text-2xl font-bold text-black dark:text-white tracking-tight">Activity Feed</h4>
                </div>
                <button
                  onClick={() => router.push('/notifications')}
                  className="text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white font-medium transition-colors px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-950 text-xs sm:text-sm self-start sm:self-auto"
                >
                  View All
                </button>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              <SmartUserActivityFeed userId={userProfile.id} showFilters={false} limit={5} isOverview={true} />
            </div>
          </div>
        </div>
      </div>
  
      {/* Activity Stats Section */}
      <UserStatsSection
        userLikedPosts={userLikedPosts}
        totalComments={totalComments}
        verifiedNewsCount={verifiedNewsCount}
        likesLoading={loading}
        commentsLoading={loading}
        verifiedLoading={loading}
        className="bg-white dark:bg-black backdrop-blur-lg rounded-2xl border border-gray-200/50 dark:border-gray-800/50 p-6 sm:p-8 shadow-sm w-full"
      />
    </div>
  );
} 