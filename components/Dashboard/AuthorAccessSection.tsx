"use client";

import { useState } from "react";
import { UserResource } from '@clerk/types';
import { useAuth } from "@clerk/nextjs";
import { Crown, User, CheckCircle } from "lucide-react";
import { gsap } from "gsap";
import LinkButton from "@/components/LinkButton";

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
  created_at: string;
  updated_at: string;
  followers_count?: number;
  following_count?: number;
  posts_count?: number;
}

interface AuthorAccessSectionProps {
  userProfile: UserProfile;
  user: UserResource;
}

export default function AuthorAccessSection({ userProfile, user }: AuthorAccessSectionProps) {
  const { getToken } = useAuth();
  const [requestSent, setRequestSent] = useState(false);

  const handleRequestAuthorAccess = async () => {
    if (!user?.id) return;

    try {
      const payload = {
        userId: user.id,
        email: user.emailAddresses?.[0]?.emailAddress
      };

      const res = await fetch("/api/authors/request-author", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setRequestSent(true);
        // Animate success feedback
        const button = document.querySelector('[data-author-request]');
        if (button) {
          gsap.to(button, {
            scale: 0.95,
            duration: 0.1,
            yoyo: true,
            repeat: 1,
            ease: "power2.inOut"
          });
        }
      } else {
        alert("Failed to send request. Please try again.");
      }
    } catch (error) {
      console.error("Request failed:", error);
      alert("Something went wrong. Please try again.");
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white font-sora transition-colors">Author Access</h2>
        <p className="text-gray-600 dark:text-gray-400 font-sora transition-colors">Apply to become a content author on HOJO</p>
      </div>
      <div className="bg-white dark:bg-black rounded-xl p-8 shadow-sm border border-gray-200 dark:border-gray-700 transition-colors duration-300">
        {userProfile.role === 'author' ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors">
              <Crown className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 font-sora transition-colors">You&apos;re an Author!</h3>
            <p className="text-gray-600 dark:text-gray-400 font-sora transition-colors">You can now create and publish posts on HOJO.</p>
            <div className="mt-4 items-center justify-center flex space-x-4">
              <LinkButton title="Create Blog" href="/post/create-post" />
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors">
              <User className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 font-sora transition-colors">Become an Author</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 font-sora transition-colors">
              Join our community of content creators and share your expertise with the world.
            </p>

            {requestSent ? (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 transition-colors">
                <div className="flex items-center justify-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <span className="text-green-800 dark:text-green-400 font-medium font-sora transition-colors">
                    Request submitted successfully! We&apos;ll review your application shortly.
                  </span>
                </div>
              </div>
            ) : (
              <button
                data-author-request
                onClick={handleRequestAuthorAccess}
                className="px-6 py-3 bg-[#EF3866] text-white rounded-lg font-semibold font-sora hover:bg-[#D53059] transition-colors shadow-sm"
              >
                Request Author Access
              </button>
            )}

            <div className="mt-6 text-left">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3 font-sora transition-colors">Author Benefits:</h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400 transition-colors">
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="font-sora">Publish articles and blog posts</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="font-sora">Create podcasts and audio content</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="font-sora">Access to analytics and insights</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="font-sora">Community engagement tools</span>
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}