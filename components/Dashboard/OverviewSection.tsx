"use client";

import { useRouter } from 'next/navigation';
import { Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SmartUserActivityFeed } from '@/components/Dashboard/UserActivityFeed';
import { useUserCreatedAt, useUserMemberSince } from '@/hooks/user-created/useUserCreatedAt';
import Image from 'next/image';

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
}: OverviewSectionProps) {
  const router = useRouter();
  const { loading: createdAtLoading } = useUserCreatedAt();
  const { memberSince, daysSinceJoining } = useUserMemberSince();

  return (
    <div className="space-y-6 px-4 w-full max-w-7xl mx-auto">
      {/* Header Section - Matches Profile Header Styling */}
      <div className="flex flex-col gap-6 p-6 bg-white dark:bg-black rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
        {/* Profile Info Section */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 w-full">
          {userProfile.image_url && (
            <div className="relative flex-shrink-0">
              <Image
                fill
                src={userProfile.image_url}
                alt={`${userProfile.first_name} ${userProfile.last_name}`}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover border-4 border-white dark:border-black shadow-lg"
              />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-white dark:border-black rounded-full shadow-sm"></div>
            </div>
          )}
          <div className="flex-1 min-w-0 text-center sm:text-left">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
              {userProfile.first_name} {userProfile.last_name}
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400 font-medium mt-2">@{userProfile.username}</p>
            <div className="flex flex-col sm:flex-row items-center gap-3 mt-3">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${userProfile.profile_completed
                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300'
                  : 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300'
                }`}>
                {userProfile.profile_completed ? 'Profile Complete' : 'Profile Incomplete'}
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 capitalize">
                {userProfile.role}
              </span>
            </div>
          </div>
        </div>
  
        {/* Edit Profile Button */}
        <div className="flex justify-center sm:justify-end">
          <Button
            variant="outline"
            onClick={() => router.push('/curr-profile/profile')}
            className="flex items-center gap-2 px-6 py-2 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-950 transition-all duration-200 rounded-full font-medium shadow-sm hover:shadow-md"
          >
            <Edit3 className="w-4 h-4" />
            Edit Profile
          </Button>
        </div>
      </div>
  
      {/* Stats Cards - Responsive grid with matching styling */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-black rounded-xl p-4 border border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-neutral-100 dark:bg-neutral-800 rounded-lg flex items-center justify-center">
              <div className="w-5 h-5 bg-neutral-600 dark:bg-neutral-300 rounded"></div>
            </div>
          </div>
          <div>
            <p className="text-neutral-600 dark:text-neutral-300 text-xs font-medium uppercase mb-1">Role</p>
            <p className="text-black dark:text-white text-xl font-bold capitalize">
              {userProfile.role}
            </p>
          </div>
        </div>
  
        <div className="bg-white dark:bg-black rounded-xl p-4 border border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-neutral-100 dark:bg-neutral-800 rounded-lg flex items-center justify-center">
              <div className={`w-5 h-5 rounded ${userProfile.profile_completed ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
            </div>
          </div>
          <div>
            <p className="text-neutral-600 dark:text-neutral-300 text-xs font-medium uppercase mb-1">Status</p>
            <p className="text-black dark:text-white text-xl font-bold">
              {userProfile.profile_completed ? 'Complete' : 'Incomplete'}
            </p>
          </div>
        </div>
  
        <div className="bg-white dark:bg-black rounded-xl p-4 border border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-neutral-100 dark:bg-neutral-800 rounded-lg flex items-center justify-center">
              <div className="w-5 h-5 bg-blue-500 rounded"></div>
            </div>
          </div>
          <div>
            <p className="text-neutral-600 dark:text-neutral-300 text-xs font-medium uppercase mb-1">Active Days</p>
            <p className="text-black dark:text-white text-xl font-bold">
              {createdAtLoading ? (
                <span className="animate-pulse bg-neutral-200 dark:bg-neutral-700 rounded h-7 w-14 inline-block"></span>
              ) : (
                `${daysSinceJoining}`
              )}
            </p>
          </div>
        </div>
  
        <div className="bg-white dark:bg-black rounded-xl p-4 border border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-neutral-100 dark:bg-neutral-800 rounded-lg flex items-center justify-center">
              <div className="w-5 h-5 bg-purple-500 rounded"></div>
            </div>
          </div>
          <div>
            <p className="text-neutral-600 dark:text-neutral-300 text-xs font-medium uppercase mb-1">Member Since</p>
            <p className="text-black dark:text-white text-sm font-bold">
              {createdAtLoading ? (
                <span className="animate-pulse bg-neutral-200 dark:bg-neutral-700 rounded h-5 w-20 inline-block"></span>
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
  
      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Account Information */}
        <div className="xl:col-span-2 space-y-6">
          {/* Personal Information Card */}
          <div className="bg-white dark:bg-black rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <div className="p-6 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-3">
                <div className="w-2 h-8 bg-gradient-to-b from-[#EF3866] to-[#EF3866]/80 rounded-full"></div>
                <h3 className="text-xl font-bold text-black dark:text-white">Personal Information</h3>
              </div>
            </div>
  
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <div className="group">
                    <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-2 block uppercase">Email Address</label>
                    <div className="bg-neutral-50 dark:bg-neutral-950 rounded-lg p-4 border border-neutral-200 dark:border-neutral-700 group-hover:border-neutral-300 dark:group-hover:border-neutral-600 transition-all duration-200">
                      <span className="text-black dark:text-white font-medium text-sm break-all">{userProfile.email}</span>
                    </div>
                  </div>
  
                  {userProfile.phone && (
                    <div className="group">
                      <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-2 block uppercase">Phone Number</label>
                      <div className="bg-neutral-50 dark:bg-neutral-950 rounded-lg p-4 border border-neutral-200 dark:border-neutral-700 group-hover:border-neutral-300 dark:group-hover:border-neutral-600 transition-all duration-200">
                        <span className="text-black dark:text-white font-medium text-sm">{userProfile.phone}</span>
                      </div>
                    </div>
                  )}
  
                  {userProfile.location && (
                    <div className="group">
                      <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-2 block uppercase">Location</label>
                      <div className="bg-neutral-50 dark:bg-neutral-950 rounded-lg p-4 border border-neutral-200 dark:border-neutral-700 group-hover:border-neutral-300 dark:group-hover:border-neutral-600 transition-all duration-200">
                        <span className="text-black dark:text-white font-medium text-sm break-words">{userProfile.location}</span>
                      </div>
                    </div>
                  )}
                </div>
  
                <div className="space-y-6">
                  {userProfile.date_of_birth && (
                    <div className="group">
                      <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-2 block uppercase">Date of Birth</label>
                      <div className="bg-neutral-50 dark:bg-neutral-950 rounded-lg p-4 border border-neutral-200 dark:border-neutral-700 group-hover:border-neutral-300 dark:group-hover:border-neutral-600 transition-all duration-200">
                        <span className="text-black dark:text-white font-medium text-sm">
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
                      <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-2 block uppercase">Website</label>
                      <div className="bg-neutral-50 dark:bg-neutral-950 rounded-lg p-4 border border-neutral-200 dark:border-neutral-700 group-hover:border-neutral-300 dark:group-hover:border-neutral-600 transition-all duration-200">
                        <a
                          href={userProfile.website.startsWith('http') ? userProfile.website : `https://${userProfile.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-black dark:text-white hover:text-[#EF3866] dark:hover:text-[#EF3866] font-medium text-sm transition-colors underline decoration-neutral-400 hover:decoration-[#EF3866] underline-offset-4 break-all"
                        >
                          {userProfile.website}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
  
              {userProfile.bio && (
                <div className="mt-8">
                  <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-2 block uppercase">Biography</label>
                  <div className="bg-neutral-50 dark:bg-neutral-950 rounded-lg p-4 border border-neutral-200 dark:border-neutral-700">
                    <p className="text-black dark:text-white leading-relaxed text-sm break-words">{userProfile.bio}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
  
          {/* Account Timeline Card */}
          <div className="bg-white dark:bg-black rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <div className="p-6 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-3">
                <div className="w-2 h-8 bg-gradient-to-b from-[#EF3866] to-[#EF3866]/80 rounded-full"></div>
                <h3 className="text-xl font-bold text-black dark:text-white">Account Timeline</h3>
              </div>
            </div>
  
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-neutral-50 dark:bg-neutral-950 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 transition-all duration-200">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-3 h-3 bg-neutral-400 dark:bg-neutral-500 rounded-full flex-shrink-0"></div>
                    <span className="text-black dark:text-white font-semibold text-sm">Account Created</span>
                  </div>
                  <span className="text-neutral-600 dark:text-neutral-300 font-medium text-sm ml-7 sm:ml-0">
                    {createdAtLoading ? (
                      <span className="animate-pulse bg-neutral-200 dark:bg-neutral-600 rounded h-4 w-24 inline-block"></span>
                    ) : (
                      memberSince || new Date(userProfile.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                    )}
                  </span>
                </div>
  
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-neutral-50 dark:bg-neutral-950 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 transition-all duration-200">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-3 h-3 bg-blue-500 rounded-full flex-shrink-0"></div>
                    <span className="text-black dark:text-white font-semibold text-sm">Last Profile Update</span>
                  </div>
                  <span className="text-neutral-600 dark:text-neutral-300 font-medium text-sm ml-7 sm:ml-0">
                    {new Date(userProfile.updated_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
  
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-neutral-50 dark:bg-neutral-950 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 transition-all duration-200">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-3 h-3 bg-purple-500 rounded-full flex-shrink-0"></div>
                    <span className="text-black dark:text-white font-semibold text-sm">Days Active</span>
                  </div>
                  <span className="text-neutral-600 dark:text-neutral-300 font-medium text-sm ml-7 sm:ml-0">
                    {createdAtLoading ? (
                      <span className="animate-pulse bg-neutral-200 dark:bg-neutral-600 rounded h-4 w-16 inline-block"></span>
                    ) : (
                      `${daysSinceJoining} days`
                    )}
                  </span>
                </div>
  
                {userProfile.role === 'author' && (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-3 h-3 bg-emerald-500 rounded-full flex-shrink-0"></div>
                      <span className="text-black dark:text-white font-semibold text-sm">Author Status</span>
                    </div>
                    <span className="text-emerald-800 dark:text-emerald-300 font-bold bg-emerald-100 dark:bg-emerald-800/50 px-3 py-1 rounded-full text-xs w-fit">
                      Active Author
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
  
        {/* Activity Sidebar */}
        <div className="space-y-6">
          {/* Quick Activity Card */}
          <div className="bg-white dark:bg-black rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <div className="p-6 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-3">
                <div className="w-2 h-8 bg-gradient-to-b from-[#EF3866] to-[#EF3866]/80 rounded-full"></div>
                <h3 className="text-xl font-bold text-black dark:text-white">Quick Stats</h3>
              </div>
            </div>
  
            <div className="p-6">
              <div className="space-y-3">
                {[
                  { label: 'Viewed 5 articles today', color: 'bg-blue-500' },
                  { label: 'Dashboard accessed', color: 'bg-green-500' },
                  { label: 'Profile updated', color: 'bg-purple-500' },
                ].map(({ label, color }, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-950 rounded-lg border border-neutral-200 dark:border-neutral-700">
                    <div className={`w-2 h-2 rounded-full ${color} flex-shrink-0`}></div>
                    <span className="text-neutral-700 dark:text-neutral-200 font-medium flex-1 text-sm break-words">{label}</span>
                  </div>
                ))}
                <div className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-950 rounded-lg border border-neutral-200 dark:border-neutral-700">
                  <div className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0"></div>
                  <span className="text-neutral-700 dark:text-neutral-200 font-medium flex-1 text-sm">
                    {createdAtLoading ? (
                      <span className="animate-pulse bg-neutral-200 dark:bg-neutral-600 rounded h-3 w-24 inline-block"></span>
                    ) : (
                      `${daysSinceJoining} days active`
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
  
          {/* Recent Activity Feed */}
          <div className="bg-white dark:bg-black rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <div className="p-6 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-8 bg-gradient-to-b from-[#EF3866] to-[#EF3866]/80 rounded-full"></div>
                  <h4 className="text-xl font-bold text-black dark:text-white">Activity Feed</h4>
                </div>
                <button
                  onClick={() => router.push('/notifications')}
                  className="text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white font-medium transition-colors px-3 py-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-950 text-xs self-start sm:self-auto"
                >
                  View All
                </button>
              </div>
            </div>
            <div className="p-6">
              <SmartUserActivityFeed userId={userProfile.id} showFilters={false} limit={5} isOverview={true} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}