import { useState } from "react";
import { useSignIn, useSignUp } from "@clerk/nextjs";
import { useAuthRedirect } from "./useAuthRedirect";

interface ErrorState {
  message: string;
  code?: string;
}

export function useOAuth() {
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const { buildOAuthCallbackUrl } = useAuthRedirect();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ErrorState | null>(null);

  // Sign In Functions
  const signInWithGoogle = async () => {
    if (!signIn) return;

    try {
      setError(null);
      setIsLoading(true);
      
      console.log('🚀 Starting Google OAuth sign in flow');
      const callbackUrl = buildOAuthCallbackUrl('oauth-google');
      console.log('🔗 Google OAuth callback URL:', callbackUrl);

      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: callbackUrl,
        redirectUrlComplete: callbackUrl,
      });
    } catch (err) {
      console.error("❌ Google sign-in error:", err);
      setError({ message: "Google sign-in failed. Please try again." });
      setIsLoading(false);
    }
  };

  const signInWithApple = async () => {
    if (!signIn) return;

    try {
      setError(null);
      setIsLoading(true);
      
      console.log('🍎 Starting Apple OAuth sign in flow');
      const callbackUrl = buildOAuthCallbackUrl('oauth-apple');
      console.log('🔗 Apple OAuth callback URL:', callbackUrl);

      await signIn.authenticateWithRedirect({
        strategy: "oauth_apple",
        redirectUrl: callbackUrl,
        redirectUrlComplete: callbackUrl,
      });
    } catch (err) {
      console.error("❌ Apple sign-in error:", err);
      setError({ message: "Apple sign-in failed. Please try again." });
      setIsLoading(false);
    }
  };

  // Sign Up Functions
  const signUpWithGoogle = async () => {
    if (!signUp) return;

    try {
      setError(null);
      setIsLoading(true);
      
      console.log('🚀 Starting Google OAuth sign up flow');
      const callbackUrl = buildOAuthCallbackUrl('oauth-google');
      console.log('🔗 Google OAuth callback URL:', callbackUrl);

      await signUp.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: callbackUrl,
        redirectUrlComplete: callbackUrl,
      });
    } catch (err) {
      console.error("❌ Google sign-up error:", err);
      setError({ message: "Google sign-up failed. Please try again." });
      setIsLoading(false);
    }
  };

  const signUpWithApple = async () => {
    if (!signUp) return;

    try {
      setError(null);
      setIsLoading(true);
      
      console.log('🍎 Starting Apple OAuth sign up flow');
      const callbackUrl = buildOAuthCallbackUrl('oauth-apple');
      console.log('🔗 Apple OAuth callback URL:', callbackUrl);

      await signUp.authenticateWithRedirect({
        strategy: "oauth_apple",
        redirectUrl: callbackUrl,
        redirectUrlComplete: callbackUrl,
      });
    } catch (err) {
      console.error("❌ Apple sign-up error:", err);
      setError({ message: "Apple sign-up failed. Please try again." });
      setIsLoading(false);
    }
  };

  return {
    // Sign In functions
    signInWithGoogle,
    signInWithApple,
    // Sign Up functions
    signUpWithGoogle,
    signUpWithApple,
    // Shared state
    isLoading,
    error,
    clearError: () => setError(null)
  };
}