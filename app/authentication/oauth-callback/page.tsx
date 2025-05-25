"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function OAuthCallback() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(true);
  const [statusMessage, setStatusMessage] = useState("Setting up your account...");
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3; // Reduced max retries

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      console.log("User not signed in, redirecting to sign-in");
      router.replace("/authentication/sign-in");
      return;
    }

    const processOAuthUser = async () => {
      try {
        setStatusMessage("Processing your OAuth authentication...");
        console.log('🔄 Processing OAuth user:', user?.id);

        // Give webhook time to process first
        await new Promise(resolve => setTimeout(resolve, 1500));

        setStatusMessage("Syncing your account data...");

        // Try to sync user to ensure they're in the database with latest info
        try {
          const syncResponse = await fetch('/api/sync-user', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (syncResponse.ok) {
            const syncData = await syncResponse.json();
            console.log('✅ Sync response:', syncData);
          } else {
            console.warn('⚠️ Sync failed, will continue with profile check');
          }
        } catch (syncError) {
          console.warn('⚠️ Sync request failed, continuing:', syncError);
        }

        // Additional delay to ensure all processing is complete
        await new Promise(resolve => setTimeout(resolve, 1000));

        setStatusMessage("Checking your profile status...");

        // Check profile completion status
        const profileResponse = await fetch('/api/check-profile', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (profileResponse.ok) {
          const { needsCompletion, userData, missingFields, reason } = await profileResponse.json();
          
          console.log('📊 Profile check result:', { 
            needsCompletion, 
            userData: userData ? {
              ...userData,
              hasFirstName: !!userData.first_name,
              hasLastName: !!userData.last_name,
              hasUsername: !!userData.username
            } : null,
            missingFields,
            reason
          });

          if (needsCompletion) {
            setStatusMessage("Setting up your profile...");
            console.log('📝 Profile incomplete, redirecting to complete-profile');
            setTimeout(() => {
              router.replace("/authentication/complete-profile");
            }, 1000);
          } else {
            setStatusMessage("Welcome! Taking you to our blog...");
            console.log('✅ Profile complete, redirecting to blog');
            setTimeout(() => {
              router.replace("/blog");
            }, 1000);
          }
        } else {
          console.warn('⚠️ Profile check failed, status:', profileResponse.status);
          
          // If we haven't hit max retries, try again
          if (retryCount < maxRetries) {
            setRetryCount(prev => prev + 1);
            setStatusMessage(`Retrying... (${retryCount + 1}/${maxRetries})`);
            setTimeout(() => {
              processOAuthUser();
            }, 2000);
            return;
          }
          
          // Fallback: redirect to profile completion for safety
          console.log('❌ Max retries reached, redirecting to complete-profile as fallback');
          setStatusMessage("Almost there! Completing your setup...");
          setTimeout(() => {
            router.replace("/authentication/complete-profile");
          }, 1500);
        }
      } catch (error) {
        console.error('❌ Error processing OAuth user:', error);
        
        // If we haven't hit max retries, try again
        if (retryCount < maxRetries) {
          setRetryCount(prev => prev + 1);
          setStatusMessage(`Something went wrong, retrying... (${retryCount + 1}/${maxRetries})`);
          setTimeout(() => {
            processOAuthUser();
          }, 3000);
          return;
        }
        
        // Final fallback - always go to complete-profile to ensure user can proceed
        setStatusMessage("Finalizing your account setup...");
        setTimeout(() => {
          router.replace("/authentication/complete-profile");
        }, 2000);
      } finally {
        setIsProcessing(false);
      }
    };

    // Start processing after component mounts
    const timeoutId = setTimeout(() => {
      processOAuthUser();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [isLoaded, isSignedIn, router, user, retryCount]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="max-w-md w-full p-8 text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-[#EF3866] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Almost Ready!</h1>
          <p className="text-gray-600">{statusMessage}</p>
        </div>

        {isProcessing && (
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-gray-200 border-t-[#EF3866] rounded-full animate-spin"></div>
            </div>
          </div>
        )}

        {retryCount > 0 && (
          <div className="mt-4 text-sm text-gray-500">
            Retry attempt: {retryCount}/{maxRetries}
          </div>
        )}
      </div>
    </div>
  );
}