"use client";

import { useEffect, useState, Suspense, useCallback, useRef } from "react";
import { useUser, useAuth, useClerk } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";

interface AuthStatus {
  stage: 'authenticating' | 'syncing' | 'checking' | 'completing' | 'redirecting' | 'error';
  message: string;
  progress: number;
}

// Separate the component that uses useSearchParams
function OAuthCallbackContent() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut, getToken } = useAuth();
  const { setActive } = useClerk();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Use refs to prevent multiple executions
  const processingRef = useRef(false);
  const userProcessedRef = useRef(false);

  const [authStatus, setAuthStatus] = useState<AuthStatus>({
    stage: 'authenticating',
    message: 'Completing your authentication...',
    progress: 0
  });
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  // Get the intended redirect URL from search params
  const getRedirectUrl = useCallback(() => {
    const redirectFromUrl = searchParams.get('redirect_url');
    if (redirectFromUrl && redirectFromUrl !== '/') {
      return redirectFromUrl;
    }
    return '/blog'; // Default fallback
  }, [searchParams]);

  // Fixed session activation with proper timing and error handling
  const activateEmailSession = useCallback(async (sessionId: string): Promise<boolean> => {
    try {
      console.log('🔄 Starting email session activation:', sessionId);

      // Clear any existing session first
      try {
        await signOut();
        console.log('✅ Previous session cleared');
        // Wait for signOut to complete
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (signOutError) {
        console.log('ℹ️ No previous session to clear:', signOutError);
      }

      // Activate the new session
      console.log('🔄 Calling setActive with session ID...');
      await setActive({ session: sessionId });
      console.log('✅ setActive completed successfully');

      // Wait for Clerk's internal state to update - this is crucial
      await new Promise(resolve => setTimeout(resolve, 1500));

      return true;

    } catch (error) {
      console.error('❌ Session activation error:', error);
      return false;
    }
  }, [signOut, setActive]);

  // Improved user state verification with proper type handling
  const waitForUserState = useCallback(async (maxWaitTime = 10000): Promise<boolean> => {
    const startTime = Date.now();
    const checkInterval = 300;

    console.log('⏳ Starting user state verification...');

    while (Date.now() - startTime < maxWaitTime) {
      try {
        // Fix TypeScript error - handle undefined isSignedIn properly
        const currentIsSignedIn = Boolean(isSignedIn);

        // Check if user state is ready
        const userReady = isLoaded && currentIsSignedIn && user?.id;

        // Check if token is available
        let tokenReady = false;
        try {
          const token = await getToken({ skipCache: true });
          tokenReady = Boolean(token);
        } catch (tokenError) {
          console.log('Token check failed:', tokenError);
          tokenReady = false;
        }

        console.log('🔍 State check:', {
          isLoaded,
          isSignedIn: currentIsSignedIn,
          hasUser: Boolean(user?.id),
          hasToken: tokenReady,
          timeElapsed: Date.now() - startTime
        });

        // Success condition: both user and token must be ready
        if (userReady && tokenReady) {
          console.log('✅ User state fully verified');
          return true;
        }

        await new Promise(resolve => setTimeout(resolve, checkInterval));
      } catch (error) {
        console.error('❌ Error during user state check:', error);
        await new Promise(resolve => setTimeout(resolve, checkInterval));
      }
    }

    console.log('❌ User state verification timeout');
    return false;
  }, [isLoaded, isSignedIn, user, getToken]);

  // Check if user is properly signed in with type safety
  const isUserAuthenticated = useCallback(() => {
    const currentIsSignedIn = Boolean(isSignedIn);
    return isLoaded && currentIsSignedIn && Boolean(user?.id);
  }, [isLoaded, isSignedIn, user]);

  // Enhanced sync and profile check function
  const syncUserAndCheckProfile = useCallback(async () => {
    console.log('🔄 Starting user sync and profile check...');
    
    setAuthStatus({
      stage: 'syncing',
      message: 'Synchronizing your account...',
      progress: 65
    });

    // Step 1: Sync user to database (this will determine if profile is complete)
    try {
      const syncResponse = await fetch('/api/sync-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!syncResponse.ok) {
        console.warn('⚠️ User sync failed');
        throw new Error('User sync failed');
      }

      const syncData = await syncResponse.json();
      console.log('✅ User sync response:', syncData);

      setAuthStatus({
        stage: 'checking',
        message: 'Checking your profile...',
        progress: 80
      });

      // Step 2: Wait a moment for database to be consistent
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 3: Check profile completion status
      const profileResponse = await fetch('/api/check-profile', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!profileResponse.ok) {
        console.warn('⚠️ Profile check failed, assuming completion needed');
        throw new Error('Profile check failed');
      }

      const profileData = await profileResponse.json();
      console.log('📊 Profile check response:', profileData);

      const redirectUrl = getRedirectUrl();

      // Step 4: Handle based on profile completion status
      if (profileData.needsCompletion) {
        console.log('📝 Profile needs completion, redirecting to complete-profile');
        console.log('📝 Missing fields:', profileData.missingFields);
        
        setAuthStatus({
          stage: 'completing',
          message: 'Setting up your profile...',
          progress: 95
        });

        const completeProfileUrl = `/authentication/complete-profile${redirectUrl !== '/blog' ? `?redirect_url=${encodeURIComponent(redirectUrl)}` : ''}`;

        userProcessedRef.current = true;
        setTimeout(() => {
          router.replace(completeProfileUrl);
        }, 1500);
      } else {
        console.log('✅ Profile is complete, redirecting to intended destination');
        
        setAuthStatus({
          stage: 'redirecting',
          message: 'Welcome back! Taking you to your destination...',
          progress: 100
        });

        userProcessedRef.current = true;
        setTimeout(() => {
          router.replace(redirectUrl);
        }, 1500);
      }

    } catch (error) {
      console.error('❌ Error in sync and profile check:', error);
      
      // On error, assume profile completion is needed to be safe
      const redirectUrl = getRedirectUrl();
      const completeProfileUrl = `/authentication/complete-profile${redirectUrl !== '/blog' ? `?redirect_url=${encodeURIComponent(redirectUrl)}` : ''}`;

      setAuthStatus({
        stage: 'completing',
        message: 'Setting up your profile...',
        progress: 95
      });

      userProcessedRef.current = true;
      setTimeout(() => {
        router.replace(completeProfileUrl);
      }, 1500);
    }
  }, [getRedirectUrl, router]);

  // Main processing effect
  useEffect(() => {
    if (!isLoaded || processingRef.current || userProcessedRef.current) {
      console.log('⏳ Waiting for conditions:', {
        isLoaded,
        processing: processingRef.current,
        userProcessed: userProcessedRef.current
      });
      return;
    }

    const processAuthentication = async () => {
      if (processingRef.current || userProcessedRef.current) return;
      processingRef.current = true;

      try {
        const source = searchParams.get('source');
        const pendingSessionId = sessionStorage.getItem('pendingSessionId');

        console.log('🔍 Processing authentication:', {
          source,
          hasPendingSession: Boolean(pendingSessionId),
          isSignedIn: Boolean(isSignedIn),
          userId: user?.id,
          isLoaded
        });

        // Handle email/password sign-in that needs session activation
        if (source === 'email-signin' && pendingSessionId) {
          console.log('📧 Processing email sign-in session activation');

          setAuthStatus({
            stage: 'authenticating',
            message: 'Activating your session...',
            progress: 25
          });

          const activationSuccess = await activateEmailSession(pendingSessionId);

          if (!activationSuccess) {
            throw new Error('Session activation failed');
          }

          setAuthStatus({
            stage: 'authenticating',
            message: 'Verifying your account...',
            progress: 50
          });

          // Wait for user state to be ready
          const userStateReady = await waitForUserState(12000);

          if (!userStateReady) {
            throw new Error('User verification failed after session activation');
          }

          // Clean up session storage after successful activation
          sessionStorage.removeItem('pendingSessionId');
          sessionStorage.removeItem('pendingSessionTimestamp');
          console.log('✅ Email session processed successfully');
        }

        // For OAuth or existing sessions, just verify the user is signed in
        if (!isUserAuthenticated()) {
          console.log('⚠️ User not authenticated');

          // For OAuth flows, wait a bit longer as they might still be processing
          if (source?.startsWith('oauth-')) {
            console.log('🔄 Waiting for OAuth completion...');
            await new Promise(resolve => setTimeout(resolve, 2000));

            const finalCheck = await waitForUserState(8000);
            if (!finalCheck) {
              throw new Error('OAuth authentication verification failed');
            }
          } else {
            throw new Error('User authentication verification failed');
          }
        }

        console.log('✅ User authenticated successfully');

        // Now sync user and check profile in the correct order
        await syncUserAndCheckProfile();

      } catch (error) {
        console.error('❌ Error processing authentication:', error);

        // Clean up session storage on error
        if (searchParams.get('source') === 'email-signin') {
          sessionStorage.removeItem('pendingSessionId');
          sessionStorage.removeItem('pendingSessionTimestamp');
        }

        if (retryCount < maxRetries) {
          setRetryCount(prev => prev + 1);
          setAuthStatus({
            stage: 'error',
            message: `Connection issue. Retrying... (${retryCount + 1}/${maxRetries})`,
            progress: 30
          });
          processingRef.current = false;

          setTimeout(() => {
            processingRef.current = false;
          }, 3000);
          return;
        }

        // Final error handling
        setAuthStatus({
          stage: 'error',
          message: error instanceof Error ? error.message : 'Authentication failed. Please try signing in again.',
          progress: 0
        });

        setTimeout(() => {
          const redirectUrl = getRedirectUrl();
          const signInUrl = `/authentication/sign-in${redirectUrl !== '/blog' ? `?redirect_url=${encodeURIComponent(redirectUrl)}` : ''}`;
          const errorParam = error instanceof Error && error.message.includes('activation') ? 'activation_failed' : 'auth_failed';
          router.replace(signInUrl + (signInUrl.includes('?') ? '&' : '?') + `error=${errorParam}`);
        }, 3000);
      } finally {
        processingRef.current = false;
      }
    };

    // Start processing with a small delay to ensure everything is ready
    const timeoutId = setTimeout(() => {
      processAuthentication();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [isLoaded, router, user, retryCount, getRedirectUrl, isUserAuthenticated, searchParams, isSignedIn, activateEmailSession, waitForUserState, syncUserAndCheckProfile]);

  const getStatusIcon = () => {
    const iconProps = "w-8 h-8 text-white";

    switch (authStatus.stage) {
      case 'authenticating':
        return (
          <svg className={`${iconProps} animate-spin`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v4m0 8v4m8-8h-4M4 12h4" />
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
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div
              className="h-full bg-[#EF3866] rounded-full transition-all duration-500 ease-out"
              style={{ width: `${authStatus.progress}%` }}
            />
          </div>
        </div>

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

        {retryCount > 0 && (
          <div className="text-sm text-gray-500">
            Retry attempt: {retryCount}/{maxRetries}
          </div>
        )}

        {searchParams.get('source') === 'email-signin' && authStatus.stage === 'authenticating' && (
          <div className="text-xs text-gray-500 mt-2">
            Email sign-in processing...
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
            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Loading...</h1>
          <p className="text-gray-600 mb-4">Preparing your authentication...</p>

          <div className="w-full bg-gray-200 rounded-full h-2">
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