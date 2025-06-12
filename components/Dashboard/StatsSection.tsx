// Updated Stats Section with Followers/Following integration
import { useState, useEffect, useRef } from 'react';
import { Users, Heart, MessageCircle, Shield, UserPlus } from 'lucide-react';
import { FollowersFollowingSection } from './FollowersFollowingSection';
import { useAppContext } from '@/context/AppContext';
import { useUser } from 'sanity';

const StatsSection = () => {
  const statsRef = useRef(null);
  const [likesLoading, setLikesLoading] = useState(true);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [userLikedPosts, setUserLikedPosts] = useState(0);
  const [totalComments, setTotalComments] = useState(0);
  const [verifiedNewsCount, setVerifiedNewsCount] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followersLoading, setFollowersLoading] = useState(true);
  
  // Modal state
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [modalTab, setModalTab] = useState<'followers' | 'following'>('followers');

  // Fetch followers and following counts
  useEffect(() => {
    const fetchFollowCounts = async () => {
      try {

        if (!user?.id) return;

        const [followersResponse, followingResponse] = await Promise.all([
          fetch(`/api/follow?type=followers&userId=${user.id}`),
          fetch(`/api/follow?type=following&userId=${user.id}`)
        ]);

        if (followersResponse.ok && followingResponse.ok) {
          const followersData = await followersResponse.json();
          const followingData = await followingResponse.json();
          
          setFollowersCount(followersData.users?.length || 0);
          setFollowingCount(followingData.users?.length || 0);
        }
      } catch (error) {
        console.error('Error fetching follow counts:', error);
      } finally {
        setFollowersLoading(false);
      }
    };

    fetchFollowCounts();
  }, []);

  const handleFollowersClick = () => {
    setModalTab('followers');
    setShowFollowersModal(true);
  };

  const handleFollowingClick = () => {
    setModalTab('following');
    setShowFollowersModal(true);
  };

  return (
    <>
      {/* Stats Section */}
      <div ref={statsRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 opacity-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {/* Followers Card */}
          <button
            onClick={handleFollowersClick}
            className="bg-white dark:bg-black rounded-xl p-4 lg:p-6 shadow-sm border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:shadow-md hover:scale-105 group"
          >
            <div className="flex items-center">
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center transition-colors group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50">
                <Users className="w-5 h-5 lg:w-6 lg:h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-3 lg:ml-4 text-left">
                <p className="text-xs lg:text-sm font-medium text-gray-600 dark:text-gray-400 font-sora transition-colors">Followers</p>
                <p className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white font-sora transition-colors">
                  {followersLoading ? (
                    <span className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-6 lg:h-8 w-12 lg:w-16 inline-block"></span>
                  ) : (
                    followersCount.toLocaleString()
                  )}
                </p>
              </div>
            </div>
          </button>

          {/* Following Card */}
          <button
            onClick={handleFollowingClick}
            className="bg-white dark:bg-black rounded-xl p-4 lg:p-6 shadow-sm border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:shadow-md hover:scale-105 group"
          >
            <div className="flex items-center">
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center transition-colors group-hover:bg-green-200 dark:group-hover:bg-green-900/50">
                <UserPlus className="w-5 h-5 lg:w-6 lg:h-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-3 lg:ml-4 text-left">
                <p className="text-xs lg:text-sm font-medium text-gray-600 dark:text-gray-400 font-sora transition-colors">Following</p>
                <p className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white font-sora transition-colors">
                  {followersLoading ? (
                    <span className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-6 lg:h-8 w-12 lg:w-16 inline-block"></span>
                  ) : (
                    followingCount.toLocaleString()
                  )}
                </p>
              </div>
            </div>
          </button>

          {/* Posts Liked Card */}
          <div className="bg-white dark:bg-black rounded-xl p-4 lg:p-6 shadow-sm border border-gray-200 dark:border-gray-700 transition-colors duration-300">
            <div className="flex items-center">
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-pink-100 dark:bg-pink-900/30 rounded-lg flex items-center justify-center transition-colors">
                <Heart className="w-5 h-5 lg:w-6 lg:h-6 text-pink-600 dark:text-pink-400" />
              </div>
              <div className="ml-3 lg:ml-4">
                <p className="text-xs lg:text-sm font-medium text-gray-600 dark:text-gray-400 font-sora transition-colors">Posts Liked</p>
                <p className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white font-sora transition-colors">
                  {likesLoading ? (
                    <span className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-6 lg:h-8 w-12 lg:w-16 inline-block"></span>
                  ) : (
                    userLikedPosts.toLocaleString()
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* My Comments Card */}
          <div className="bg-white dark:bg-black rounded-xl p-4 lg:p-6 shadow-sm border border-gray-200 dark:border-gray-700 transition-colors duration-300">
            <div className="flex items-center">
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center transition-colors">
                <MessageCircle className="w-5 h-5 lg:w-6 lg:h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-3 lg:ml-4">
                <p className="text-xs lg:text-sm font-medium text-gray-600 dark:text-gray-400 font-sora transition-colors">My Comments</p>
                <p className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white font-sora transition-colors">
                  {commentsLoading ? (
                    <span className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-6 lg:h-8 w-12 lg:w-16 inline-block"></span>
                  ) : (
                    totalComments.toLocaleString()
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Verified News Card */}
          <div className="bg-white dark:bg-black rounded-xl p-4 lg:p-6 shadow-sm border border-gray-200 dark:border-gray-700 transition-colors duration-300">
            <div className="flex items-center">
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center transition-colors">
                <Shield className="w-5 h-5 lg:w-6 lg:h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="ml-3 lg:ml-4">
                <p className="text-xs lg:text-sm font-medium text-gray-600 dark:text-gray-400 font-sora transition-colors">Verified News</p>
                <p className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white font-sora transition-colors">
                  {verifiedNewsCount}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Followers/Following Modal */}
      {showFollowersModal && (
        <FollowersFollowingSection
          isModal={true}
          initialTab={modalTab}
          onClose={() => setShowFollowersModal(false)}
        />
      )}
    </>
  );
};

export default StatsSection;