import { useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function useAuthRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const processedRef = useRef(false);

  const redirectUrl = searchParams.get('redirect_url') || '/home';
  const errorParam = searchParams.get('error');

  const buildOAuthCallbackUrl = useCallback((source: string, customRedirectUrl?: string) => {
    const oauthCallbackUrl = new URL('/authentication/oauth-callback', window.location.origin);
    
    const targetRedirectUrl = customRedirectUrl || redirectUrl;
    
    // Only add redirect_url if it's not the default /home
    if (targetRedirectUrl && targetRedirectUrl !== '/home') {
      oauthCallbackUrl.searchParams.set('redirect_url', targetRedirectUrl);
    }

    // Add source parameter
    oauthCallbackUrl.searchParams.set('source', source);

    // Add timestamp to prevent caching issues
    oauthCallbackUrl.searchParams.set('t', Date.now().toString());

    return oauthCallbackUrl.toString();
  }, [redirectUrl]);

  const redirectToDestination = useCallback(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    console.log('User already signed in, redirecting through oauth-callback to:', redirectUrl);

    const callbackUrl = buildOAuthCallbackUrl('existing-session');
    router.replace(callbackUrl);
  }, [router, redirectUrl, buildOAuthCallbackUrl]);

  const redirectAfterSignIn = useCallback((sessionId?: string, delay = 500) => {
    // Store session info if available
    if (sessionId) {
      try {
        sessionStorage.setItem('pendingSessionId', sessionId);
        sessionStorage.setItem('pendingSessionTimestamp', Date.now().toString());
        console.log('📝 Stored pending session ID:', sessionId);
      } catch (storageError) {
        console.warn('⚠️ SessionStorage failed:', storageError);
      }
    }

    // For email sign-ins, redirect directly instead of going through OAuth callback
    console.log('🔄 Redirecting directly to:', redirectUrl);

    setTimeout(() => {
      router.replace(redirectUrl);
    }, delay);
  }, [router, redirectUrl]);

  const clearUrlError = useCallback(() => {
    if (errorParam) {
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('error');
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, [errorParam]);

  const buildSignUpUrl = useCallback(() => {
    const signUpUrl = '/authentication/sign-up';
    return redirectUrl && redirectUrl !== '/home' 
      ? `${signUpUrl}?redirect_url=${encodeURIComponent(redirectUrl)}`
      : signUpUrl;
  }, [redirectUrl]);

  const buildForgotPasswordUrl = useCallback(() => {
    const forgotPasswordUrl = '/authentication/forgot-password';
    return redirectUrl && redirectUrl !== '/home'
      ? `${forgotPasswordUrl}?redirect_url=${encodeURIComponent(redirectUrl)}`
      : forgotPasswordUrl;
  }, [redirectUrl]);

  const clearPendingAuthState = useCallback(() => {
    try {
      sessionStorage.removeItem('pendingSessionId');
      sessionStorage.removeItem('pendingSessionTimestamp');
      console.log('🧹 Cleared pending authentication state');
    } catch (error) {
      console.warn('⚠️ Failed to clear session storage:', error);
    }
  }, []);

  const isFirstTimeSignup = useCallback(() => {
    try {
      const pendingSessionId = sessionStorage.getItem('pendingSessionId');
      const pendingTimestamp = sessionStorage.getItem('pendingSessionTimestamp');
      
      // If there's a pending session, it's likely a first-time signup
      if (pendingSessionId && pendingTimestamp) {
        const timestamp = parseInt(pendingTimestamp);
        const now = Date.now();
        const timeDiff = now - timestamp;
        
        // If the session was created within the last 5 minutes, it's likely a first-time signup
        return timeDiff < 5 * 60 * 1000;
      }
      
      return false;
    } catch (error) {
      console.warn('⚠️ Failed to check first-time signup status:', error);
      return false;
    }
  }, []);

  return {
    redirectUrl,
    errorParam,
    buildOAuthCallbackUrl,
    redirectToDestination,
    redirectAfterSignIn,
    clearUrlError,
    buildSignUpUrl,
    buildForgotPasswordUrl,
    clearPendingAuthState,
    isFirstTimeSignup
  };
}