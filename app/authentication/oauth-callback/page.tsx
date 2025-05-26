"use client";

import { useEffect, useState, Suspense } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";

interface AuthStatus {
  stage: 'authenticating' | 'syncing' | 'checking' | 'completing' | 'redirecting' | 'error';
  message: string;
  progress: number;
}

// Separate the component that uses useSearchParams
function OAuthCallbackContent() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authStatus, setAuthStatus] = useState<AuthStatus>({
    stage: 'authenticating',
    message: 'Completing your authentication...',
    progress: 0
  });
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  // Get the intended redirect URL from search params
  const getRedirectUrl = () => {
    const redirectFromUrl = searchParams.get('redirect_url');
    if (redirectFromUrl && redirectFromUrl !== '/') {
      return redirectFromUrl;
    }
    return '/blog'; // Default fallback
  };

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      console.log("User not signed in, redirecting to sign-in");
      setAuthStatus({
        stage: 'error',
        message: 'Authentication failed. Redirecting to sign in...',
        progress: 0
      });
      setTimeout(() => {
        router.replace("/authentication/sign-in");
      }, 2000);
      return;
    }

    const processOAuthUser = async () => {
      try {
        setAuthStatus({
          stage: 'authenticating',
          message: 'Verifying your authentication...',
          progress: 20
        });
        
        console.log('🔄 Processing OAuth user:', user?.id);

        // Give webhook time to process first
        await new Promise(resolve => setTimeout(resolve, 1500));

        setAuthStatus({
          stage: 'syncing',
          message: 'Synchronizing your account data...',
          progress: 40
        });

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

        setAuthStatus({
          stage: 'checking',
          message: 'Preparing your account...',
          progress: 70
        });

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
            setAuthStatus({
              stage: 'completing',
              message: 'Setting up your profile...',
              progress: 90
            });
            console.log('📝 Profile incomplete, redirecting to complete-profile');
            
            const redirectUrl = getRedirectUrl();
            const completeProfileUrl = `/authentication/complete-profile${redirectUrl !== '/blog' ? `?redirect_url=${encodeURIComponent(redirectUrl)}` : ''}`;
            
            setTimeout(() => {
              router.replace(completeProfileUrl);
            }, 1500);
          } else {
            const redirectUrl = getRedirectUrl();
            setAuthStatus({
              stage: 'redirecting',
              message: 'Welcome back! Taking you to your destination...',
              progress: 100
            });
            console.log('✅ Profile complete, redirecting to:', redirectUrl);
            setTimeout(() => {
              router.replace(redirectUrl);
            }, 1500);
          }
        } else {
          console.warn('⚠️ Profile check failed, status:', profileResponse.status);
          
          // If we haven't hit max retries, try again
          if (retryCount < maxRetries) {
            setRetryCount(prev => prev + 1);
            setAuthStatus({
              stage: 'checking',
              message: `Retrying connection... (${retryCount + 1}/${maxRetries})`,
              progress: 60
            });
            setTimeout(() => {
              processOAuthUser();
            }, 2000);
            return;
          }
          
          // Fallback: redirect to profile completion for safety
          console.log('❌ Max retries reached, redirecting to complete-profile as fallback');
          setAuthStatus({
            stage: 'completing',
            message: 'Finalizing your account setup...',
            progress: 90
          });
          
          const redirectUrl = getRedirectUrl();
          const completeProfileUrl = `/authentication/complete-profile${redirectUrl !== '/blog' ? `?redirect_url=${encodeURIComponent(redirectUrl)}` : ''}`;
          
          setTimeout(() => {
            router.replace(completeProfileUrl);
          }, 2000);
        }
      } catch (error) {
        console.error('❌ Error processing OAuth user:', error);
        
        // If we haven't hit max retries, try again
        if (retryCount < maxRetries) {
          setRetryCount(prev => prev + 1);
          setAuthStatus({
            stage: 'error',
            message: `Connection issue detected. Retrying... (${retryCount + 1}/${maxRetries})`,
            progress: 50
          });
          setTimeout(() => {
            processOAuthUser();
          }, 3000);
          return;
        }
        
        // Final fallback - always go to complete-profile to ensure user can proceed
        setAuthStatus({
          stage: 'completing',
          message: 'Securing your account access...',
          progress: 85
        });
        
        const redirectUrl = getRedirectUrl();
        const completeProfileUrl = `/authentication/complete-profile${redirectUrl !== '/blog' ? `?redirect_url=${encodeURIComponent(redirectUrl)}` : ''}`;
        
        setTimeout(() => {
          router.replace(completeProfileUrl);
        }, 2500);
      }
    };

    // Start processing after component mounts
    const timeoutId = setTimeout(() => {
      processOAuthUser();
    }, 800);

    return () => clearTimeout(timeoutId);
  }, [isLoaded, isSignedIn, router, user, retryCount, searchParams]);

  const getStatusIcon = () => {
    const iconProps = "w-8 h-8 text-white";
    
    switch (authStatus.stage) {
      case 'authenticating':
        return (
          <svg className={`${iconProps} animate-spin`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v4m0 8v4m8-8h-4M4 12h4m11.314-7.314l-2.828 2.828M8.686 8.686L5.858 5.858m12.728 12.728l-2.828-2.828M8.686 15.314l-2.828 2.828" />
          </svg>
        );
      case 'syncing':
        return (
          <svg className={iconProps} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        );
      case 'checking':
        return (
          <svg className={iconProps} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'completing':
        return (
          <svg className={iconProps} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      case 'redirecting':
        return (
          <svg className={iconProps} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'error':
        return (
          <svg className={iconProps} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getTitle = () => {
    switch (authStatus.stage) {
      case 'redirecting': return 'Success!';
      case 'error': return 'Connection Issue';
      default: return 'Almost Ready!';
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="max-w-md w-full p-8 text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-[#EF3866] rounded-full flex items-center justify-center mx-auto mb-4">
            {getStatusIcon()}
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">{getTitle()}</h1>
          <p className="text-gray-600 mb-4">{authStatus.message}</p>
          
          {/* Progress indicator */}
          <div className="w-full bg-gray-200 rounded-full h-1 mb-4">
            <div 
              className="h-full bg-[#EF3866] rounded-full transition-all duration-500 ease-out"
              style={{ width: `${authStatus.progress}%` }}
            />
          </div>
        </div>

        {/* Loading spinner - only show when not completed or errored */}
        {authStatus.stage !== 'error' && authStatus.stage !== 'redirecting' && (
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-gray-200 border-t-[#EF3866] rounded-full animate-spin"></div>
            </div>
          </div>
        )}

        {/* Success animation */}
        {authStatus.stage === 'redirecting' && (
          <div className="mb-4">
            <div className="inline-flex items-center space-x-2 text-[#EF3866] font-medium">
              <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Authentication Complete</span>
            </div>
          </div>
        )}

        {/* Retry information */}
        {retryCount > 0 && (
          <div className="text-sm text-gray-500">
            Retry attempt: {retryCount}/{maxRetries}
          </div>
        )}
      </div>
    </div>
  );
}

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="max-w-md w-full p-8 text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-[#EF3866] rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="w-12 h-12 border-4 border-gray-200 border-t-[#EF3866] rounded-full animate-spin"></div>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Loading...</h1>
          <p className="text-gray-600 mb-4">Preparing your authentication...</p>
          
          <div className="w-full bg-gray-200 rounded-full h-1">
            <div className="h-full bg-[#EF3866] rounded-full w-1/4 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Main component with Suspense wrapper
export default function OAuthCallback() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <OAuthCallbackContent />
    </Suspense>
  );
}