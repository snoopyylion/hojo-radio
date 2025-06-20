"use client";

import { MessageCircle } from "lucide-react";
import { useUserComments } from '../../hooks/user-comments/useUserComments';

interface Comment {
  id: string;
  comment: string;
  post_title?: string; // Make it optional with ?
  created_at: string;
}

export default function CommentsSection() {
  const {
    totalComments,
    commentsThisMonth,
    commentsToday,
    recentComments,
    loading: commentsLoading
  } = useUserComments();

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white font-sora transition-colors">My Comments</h2>
        <p className="text-gray-600 dark:text-gray-400 font-sora transition-colors">All your comments across the platform</p>
      </div>

      {/* Comment Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-black rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 transition-colors duration-300">
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-900 dark:text-white font-sora transition-colors">
              {commentsLoading ? (
                <span className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-8 w-16 inline-block"></span>
              ) : (
                totalComments
              )}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 font-sora transition-colors">Total Comments</p>
          </div>
        </div>

        <div className="bg-white dark:bg-black rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 transition-colors duration-300">
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-900 dark:text-white font-sora transition-colors">
              {commentsLoading ? (
                <span className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-8 w-16 inline-block"></span>
              ) : (
                commentsThisMonth
              )}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 font-sora transition-colors">This Month</p>
          </div>
        </div>

        <div className="bg-white dark:bg-black rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 transition-colors duration-300">
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-900 dark:text-white font-sora transition-colors">
              {commentsLoading ? (
                <span className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-8 w-16 inline-block"></span>
              ) : (
                commentsToday
              )}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 font-sora transition-colors">Today</p>
          </div>
        </div>
      </div>

      {/* Recent Comments */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white font-sora transition-colors">Recent Comments</h3>
        {commentsLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-black rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 transition-colors duration-300">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                </div>
              </div>
            ))}
          </div>
        ) : recentComments.length > 0 ? (
          <div className="space-y-4">
            {recentComments.map((comment: Comment) => (
              <div key={comment.id} className="bg-white dark:bg-black rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 transition-colors duration-300 hover:shadow-md">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-gray-900 dark:text-white font-sora transition-colors mb-2">
                      {comment.comment}
                    </p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400 transition-colors">
                      <span className="font-sora">On: {comment.post_title || 'Unknown Post'}</span>
                      <span className="font-sora">
                        {new Date(comment.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <MessageCircle className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 font-sora transition-colors">
              You haven&apos;t made any comments yet. Start engaging with posts to see your comments here!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}