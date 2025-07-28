"use client";

import { useEffect, useState, Suspense, useCallback, useRef } from "react";
import { useUser, useAuth, useClerk } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { BrandSpinner } from "../../../components/ui/LoadingSpinner";

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

  // Force redirect to complete profile
  const forceCompleteProfile = useCallback((reason: string) => {
    console.log(`📝 Forcing profile completion: ${reason}`);
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
  }, [getRedirectUrl, router]);

  // Enhanced sync and profile check function with better error handling
  const syncUserAndCheckProfile = useCallback(async () => {
    console.log('🔄 Starting user sync and profile check...');

    setAuthStatus({
      stage: 'syncing',
      message: 'Synchronizing your account...',
      progress: 65
    });

    let syncSuccessful = false;
    let syncData = null;

    // Step 0: Check if user exists in database first
    try {
      const checkResponse = await fetch('/api/check-profile', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (checkResponse.ok) {
        const checkData = await checkResponse.json();
        console.log('📊 Initial profile check:', checkData);
        
        // If user exists and profile is complete, we can skip sync
        if (checkData.exists && !checkData.needsCompletion) {
          console.log('✅ User exists and profile is complete, skipping sync');
          const redirectUrl = getRedirectUrl();
          setAuthStatus({
            stage: 'redirecting',
            message: 'Welcome back! Taking you to your destination...',
            progress: 100
          });

          userProcessedRef.current = true;
          setTimeout(() => {
            router.replace(redirectUrl);
          }, 1500);
          return;
        }
      }
    } catch (checkError) {
      console.log('⚠️ Initial profile check failed, proceeding with sync:', checkError);
    }

    // Step 1: Sync user to database with retry logic
    try {
      const syncResponse = await fetch('/api/sync-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!syncResponse.ok) {
        console.error('❌ User sync failed with status:', syncResponse.status);
        const errorText = await syncResponse.text();
        console.error('❌ Sync error details:', errorText);
        
        // Check if this is a first-time signup (user session not ready)
        if (syncResponse.status === 503 && errorText.includes('CLERK_USER_NOT_FOUND')) {
          console.log('🆕 First-time signup detected, redirecting to profile completion');
          
          // Update status to be more specific for first-time signups
          setAuthStatus({
            stage: 'completing',
            message: 'Setting up your profile...',
            progress: 75
          });
          
          forceCompleteProfile('First-time signup - complete your profile');
          return;
        }
        
        throw new Error(`User sync failed: ${syncResponse.status}`);
      }

      syncData = await syncResponse.json();
      console.log('✅ User sync response:', syncData);
      syncSuccessful = true;

    } catch (syncError) {
      console.error('❌ User sync error:', syncError);

      // If sync fails, we MUST go to complete profile to ensure user data integrity
      forceCompleteProfile('User sync failed - ensuring profile setup');
      return;
    }

    // Step 2: If sync was successful, check what it determined about profile completion
    if (syncSuccessful && syncData) {
      // If sync indicates profile needs completion, go directly there
      if (syncData.needsProfileCompletion) {
        console.log('📝 Sync indicates profile needs completion');
        forceCompleteProfile('Profile incomplete per sync response');
        return;
      }

      // If sync indicates profile is complete, double-check with profile API
      setAuthStatus({
        stage: 'checking',
        message: 'Verifying your profile...',
        progress: 80
      });

      // Wait a moment for database consistency
      await new Promise(resolve => setTimeout(resolve, 800));

      try {
        const profileResponse = await fetch('/api/check-profile', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!profileResponse.ok) {
          console.warn('⚠️ Profile check failed, but sync was successful');
          console.warn('⚠️ Sync data suggests profile complete, proceeding to redirect');

          // Trust the sync result if profile check fails but sync succeeded
          const redirectUrl = getRedirectUrl();
          setAuthStatus({
            stage: 'redirecting',
            message: 'Welcome back! Taking you to your destination...',
            progress: 100
          });

          userProcessedRef.current = true;
          setTimeout(() => {
            router.replace(redirectUrl);
          }, 1500);
          return;
        }

        const profileData = await profileResponse.json();
        console.log('📊 Profile check response:', profileData);

        const redirectUrl = getRedirectUrl();

        // Final decision based on profile check
        if (profileData.needsCompletion) {
          console.log('📝 Profile check confirms completion needed');
          console.log('📝 Missing fields:', profileData.missingFields);
          forceCompleteProfile('Profile check confirms completion needed');
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

      } catch (profileError) {
        console.error('❌ Profile check failed:', profileError);

        // If profile check fails but sync succeeded and indicated complete profile,
        // trust the sync result
        if (syncData && !syncData.needsProfileCompletion) {
          console.log('⚠️ Profile check failed but sync indicated complete - proceeding');
          const redirectUrl = getRedirectUrl();

          setAuthStatus({
            stage: 'redirecting',
            message: 'Welcome back! Taking you to your destination...',
            progress: 100
          });

          userProcessedRef.current = true;
          setTimeout(() => {
            router.replace(redirectUrl);
          }, 1500);
        } else {
          // If we're unsure, be safe and complete profile
          forceCompleteProfile('Profile check failed - ensuring profile setup');
        }
      }
    }
  }, [forceCompleteProfile, getRedirectUrl, router]);

  // Early check for unauthenticated users
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      const source = searchParams.get('source');
      const pendingSessionId = sessionStorage.getItem('pendingSessionId');
      
      // If user is not signed in and there's no pending session, redirect immediately
      if (!pendingSessionId && source !== 'existing-session') {
        console.log('⚠️ Unauthenticated user on OAuth callback, redirecting to sign-in');
        setAuthStatus({
          stage: 'authenticating',
          message: 'Redirecting to sign-in...',
          progress: 10
        });
        
        setTimeout(() => {
          const redirectUrl = getRedirectUrl();
          const signInUrl = `/authentication/sign-in${redirectUrl !== '/blog' ? `?redirect_url=${encodeURIComponent(redirectUrl)}` : ''}`;
          router.replace(signInUrl);
        }, 1000);
        return;
      }
      
      // If there's a pending session but user is not signed in, wait a bit longer
      if (pendingSessionId && source === 'email-signin') {
        console.log('⏳ Pending session found, waiting for authentication to complete...');
        setAuthStatus({
          stage: 'authenticating',
          message: 'Completing your sign-in...',
          progress: 20
        });
      }
      
      // For email sign-ins, redirect directly instead of going through complex OAuth callback
      if (source === 'email-signin' && pendingSessionId) {
        console.log('📧 Email sign-in detected, redirecting directly');
        const redirectUrl = getRedirectUrl();
        setAuthStatus({
          stage: 'redirecting',
          message: 'Welcome! Taking you to your destination...',
          progress: 100
        });
        
        setTimeout(() => {
          router.replace(redirectUrl);
        }, 1500);
        return;
      }
    }
  }, [isLoaded, isSignedIn, searchParams, getRedirectUrl, router]);

  // Main authentication processing
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

        // If user is not signed in and there's no pending session, redirect to sign-in
        if (!isSignedIn && !pendingSessionId && source !== 'existing-session') {
          console.log('⚠️ User not signed in and no pending session, redirecting to sign-in');
          const redirectUrl = getRedirectUrl();
          const signInUrl = `/authentication/sign-in${redirectUrl !== '/blog' ? `?redirect_url=${encodeURIComponent(redirectUrl)}` : ''}`;
          router.replace(signInUrl);
          return;
        }

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
          
          // For email sign-ins, skip the complex sync process and redirect directly
          // The sync will happen naturally when the user accesses protected routes
          const redirectUrl = getRedirectUrl();
          setAuthStatus({
            stage: 'redirecting',
            message: 'Welcome! Taking you to your destination...',
            progress: 100
          });

          userProcessedRef.current = true;
          setTimeout(() => {
            router.replace(redirectUrl);
          }, 1500);
          return;
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
            // For non-OAuth flows, redirect to sign-in instead of showing error
            console.log('🔄 Redirecting to sign-in for non-authenticated user');
            const redirectUrl = getRedirectUrl();
            const signInUrl = `/authentication/sign-in${redirectUrl !== '/blog' ? `?redirect_url=${encodeURIComponent(redirectUrl)}` : ''}`;
            router.replace(signInUrl);
            return;
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

        // For certain errors, force profile completion instead of going back to sign-in
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        if (errorMessage.includes('sync') || errorMessage.includes('profile')) {
          console.log('🚨 Sync/profile error detected, forcing profile completion');
          forceCompleteProfile('Authentication error - ensuring profile setup');
          return;
        }

        // Final error handling for other errors
        setAuthStatus({
          stage: 'error',
          message: errorMessage.includes('Authentication failed') ? errorMessage : 'Authentication failed. Please try signing in again.',
          progress: 0
        });

        setTimeout(() => {
          const redirectUrl = getRedirectUrl();
          const signInUrl = `/authentication/sign-in${redirectUrl !== '/blog' ? `?redirect_url=${encodeURIComponent(redirectUrl)}` : ''}`;
          const errorParam = errorMessage.includes('activation') ? 'activation_failed' : 'auth_failed';
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
  }, [isLoaded, router, user, retryCount, getRedirectUrl, isUserAuthenticated, searchParams, isSignedIn, activateEmailSession, waitForUserState, syncUserAndCheckProfile, forceCompleteProfile]);

  const getLogoAnimation = () => {
    switch (authStatus.stage) {
      case 'authenticating':
        return "animate-pulse scale-110";
      case 'syncing':
        return "animate-spin";
      case 'checking':
        return "animate-bounce";
      case 'completing':
        return "animate-pulse";
      case 'redirecting':
        return "animate-none scale-110";
      case 'error':
        return "animate-pulse opacity-75";
      default:
        return "animate-pulse";
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
          {/* Logo 1 3 Container with Professional Animation */}
          <div
            className="w-28 h-28 mx-auto rounded-full shadow-2xl mb-6 flex items-center justify-center relative"
            style={{
              background: `
      radial-gradient(circle at 30% 30%, rgba(239, 56, 102, 0.8) 0%, transparent 50%),
      radial-gradient(circle at 70% 70%, rgba(239, 56, 140, 0.6) 0%, transparent 50%),
      linear-gradient(135deg, #EF3866 0%, #EF5638 25%, #D63866 50%, #EF3884 100%)
    `
            }}
          >
            <Link href="/" className="block">
              <Image
                src="/img/logo.png"
                alt="Logo"
                width={80}
                height={80}
                className={`transition-all duration-700 ease-in-out ${getLogoAnimation()}`}
                priority
              />
            </Link>
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

// Loading fallback component with logo
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="max-w-md w-full p-8 text-center">
        <div className="mb-6">
          {/* Logo Container for Loading State */}
          <div
            className="w-28 h-28 mx-auto rounded-full shadow-2xl mb-6 flex items-center justify-center relative"
            style={{
              background: `
      radial-gradient(circle at 30% 30%, rgba(239, 56, 102, 0.8) 0%, transparent 50%),
      radial-gradient(circle at 70% 70%, rgba(239, 56, 140, 0.6) 0%, transparent 50%),
      linear-gradient(135deg, #EF3866 0%, #EF5638 25%, #D63866 50%, #EF3884 100%)
    `
            }}
          >
            <Link href="/" className="block">
              <Image
                src="/img/logo.png"
                alt="Logo"
                width={80}
                height={80}
                className="animate-pulse transition-all duration-700 ease-in-out"
                priority
              />
            </Link>
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