import { useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function useAuthRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const processedRef = useRef(false);

  const redirectUrl = searchParams.get('redirect_url') || '/blog';
  const errorParam = searchParams.get('error');

  const buildOAuthCallbackUrl = useCallback((source: string, customRedirectUrl?: string) => {
    const oauthCallbackUrl = new URL('/authentication/oauth-callback', window.location.origin);
    
    const targetRedirectUrl = customRedirectUrl || redirectUrl;
    
    // Only add redirect_url if it's not the default /blog
    if (targetRedirectUrl && targetRedirectUrl !== '/blog') {
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

    const callbackUrl = buildOAuthCallbackUrl('email-signin');
    console.log('🔄 Redirecting to oauth-callback:', callbackUrl);

    setTimeout(() => {
      router.replace(callbackUrl);
    }, delay);
  }, [router, buildOAuthCallbackUrl]);

  const clearUrlError = useCallback(() => {
    if (errorParam) {
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('error');
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, [errorParam]);

  const buildSignUpUrl = useCallback(() => {
    const signUpUrl = '/authentication/sign-up';
    return redirectUrl && redirectUrl !== '/blog' 
      ? `${signUpUrl}?redirect_url=${encodeURIComponent(redirectUrl)}`
      : signUpUrl;
  }, [redirectUrl]);

  const buildForgotPasswordUrl = useCallback(() => {
    const forgotPasswordUrl = '/authentication/forgot-password';
    return redirectUrl && redirectUrl !== '/blog'
      ? `${forgotPasswordUrl}?redirect_url=${encodeURIComponent(redirectUrl)}`
      : forgotPasswordUrl;
  }, [redirectUrl]);

  return {
    redirectUrl,
    errorParam,
    buildOAuthCallbackUrl,
    redirectToDestination,
    redirectAfterSignIn,
    clearUrlError,
    buildSignUpUrl,
    buildForgotPasswordUrl
  };
}