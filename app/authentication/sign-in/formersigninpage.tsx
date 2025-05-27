"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSignIn, useUser } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { gsap } from "gsap";

interface FormData {
  emailAddress: string;
  password: string;
}

interface ClerkError {
  code: string;
  message: string;
  longMessage?: string;
  meta?: Record<string, unknown>;
}

interface ErrorState {
  message: string;
  code?: string;
}

// Separate component that uses useSearchParams
function SignInContent() {
  const { isLoaded, signIn } = useSignIn();
  const { isSignedIn } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Animation refs
  const containerRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const imageSliderRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const inputRefs = useRef<(HTMLDivElement | null)[]>([]);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Get redirect URL from search params
  const redirectUrl = searchParams.get('redirect_url') || '/blog';
  const errorParam = searchParams.get('error');

  // State for handling post-signin processing
  const [isProcessingSignIn, setIsProcessingSignIn] = useState(false);
  const processedRef = useRef(false);

  // Memoize the redirect function to avoid useEffect dependency issues
  const redirectToDestination = useCallback(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    console.log('User already signed in, redirecting through oauth-callback to:', redirectUrl);

    // Always redirect through oauth-callback for consistency
    const oauthCallbackUrl = new URL('/authentication/oauth-callback', window.location.origin);

    // Only add redirect_url if it's not the default /blog
    if (redirectUrl && redirectUrl !== '/blog') {
      oauthCallbackUrl.searchParams.set('redirect_url', redirectUrl);
    }

    // Add a parameter to indicate this is an existing session
    oauthCallbackUrl.searchParams.set('source', 'existing-session');

    router.replace(oauthCallbackUrl.toString());
  }, [router, redirectUrl]);

  useEffect(() => {
    // If user is already signed in, redirect through oauth-callback
    if (isSignedIn && !isProcessingSignIn && isLoaded) {
      redirectToDestination();
    }
  }, [isSignedIn, redirectToDestination, isProcessingSignIn, isLoaded]);

  const [formData, setFormData] = useState<FormData>({
    emailAddress: "",
    password: "",
  });
  const [errors, setErrors] = useState<ErrorState | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Handle URL errors
  useEffect(() => {
    if (errorParam) {
      switch (errorParam) {
        case 'activation_failed':
          setErrors({ message: 'Session activation failed. Please try signing in again.' });
          break;
        case 'auth_failed':
          setErrors({ message: 'Authentication failed. Please try again.' });
          break;
        default:
          setErrors({ message: 'An authentication error occurred. Please try again.' });
      }

      // Clear the error from URL after showing it
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('error');
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, [errorParam]);

  // Current slide for image slider
  const [currentSlide, setCurrentSlide] = useState(0);
  const images = [
    "/img/login1.png",
    "/img/login2.png",
    "/img/login3.png",
  ];

  // Initial page load animations - Set initial states immediately
  useEffect(() => {
    // Set initial states immediately (synchronously)
    if (formRef.current && imageSliderRef.current && logoRef.current &&
      titleRef.current && subtitleRef.current) {

      gsap.set([formRef.current, imageSliderRef.current], { opacity: 0 });
      gsap.set(logoRef.current, { scale: 0, rotation: -180 });
      gsap.set([titleRef.current, subtitleRef.current], { y: 30, opacity: 0 });
      gsap.set(inputRefs.current.filter(Boolean), { x: -30, opacity: 0 });
      gsap.set(buttonRefs.current.filter(Boolean), { y: 20, opacity: 0 });

      // Small delay to ensure DOM is ready, then animate
      const tl = gsap.timeline({ delay: 0.1 });

      tl.to([formRef.current, imageSliderRef.current], {
        opacity: 1,
        duration: 0.8,
        ease: "power2.out"
      })
        .to(logoRef.current, {
          scale: 1,
          rotation: 0,
          duration: 0.6,
          ease: "back.out(1.7)"
        }, "-=0.4")
        .to([titleRef.current, subtitleRef.current], {
          y: 0,
          opacity: 1,
          duration: 0.5,
          stagger: 0.1,
          ease: "power2.out"
        }, "-=0.2")
        .to(inputRefs.current.filter(Boolean), {
          x: 0,
          opacity: 1,
          duration: 0.4,
          stagger: 0.1,
          ease: "power2.out"
        }, "-=0.2")
        .to(buttonRefs.current.filter(Boolean), {
          y: 0,
          opacity: 1,
          duration: 0.4,
          stagger: 0.05,
          ease: "power2.out"
        }, "-=0.2");
    }
  }, []); // Empty dependency array to run only once

  // Error animation
  useEffect(() => {
    if (errors?.message) {
      const errorEl = document.querySelector('[data-error]');
      if (errorEl) {
        gsap.fromTo(errorEl,
          { x: -10, opacity: 0 },
          {
            x: 0,
            opacity: 1,
            duration: 0.3,
            ease: "power2.out"
          }
        );

        // Shake animation for emphasis
        gsap.fromTo(errorEl,
          { x: 0 },
          {
            x: 5,
            duration: 0.1,
            delay: 0.1,
            repeat: 5,
            yoyo: true,
            ease: "power2.inOut"
          }
        );
      }
    }
  }, [errors]);

  // Auto-slide functionality
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % images.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [images.length]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    gsap.to(e.target, {
      scale: 1.02,
      duration: 0.2,
      ease: "power2.out"
    });
  };

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    gsap.to(e.target, {
      scale: 1,
      duration: 0.2,
      ease: "power2.out"
    });
  };

  const handleButtonHover = (e: React.MouseEvent<HTMLButtonElement>) => {
    gsap.to(e.currentTarget, {
      scale: 1.05,
      duration: 0.2,
      ease: "power2.out"
    });
  };

  const handleButtonLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    gsap.to(e.currentTarget, {
      scale: 1,
      duration: 0.2,
      ease: "power2.out"
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isLoaded || !signIn) return;

    // Prevent multiple submissions
    if (isLoading || isProcessingSignIn) return;

    // Button loading animation
    const submitBtn = e.currentTarget.querySelector('button[type="submit"]');
    if (submitBtn) {
      gsap.to(submitBtn, {
        scale: 0.95,
        duration: 0.1,
        yoyo: true,
        repeat: 1,
        ease: "power2.inOut"
      });
    }

    setIsLoading(true);
    setErrors(null);

    try {
      console.log('Starting email/password sign-in...');

      const result = await signIn.create({
        identifier: formData.emailAddress,
        password: formData.password,
      });

      console.log('Sign-in result:', result);

      if (result.status === "complete") {
        console.log('✅ Email sign-in successful, session created:', result.createdSessionId);

        // CRITICAL FIX: Store session info more reliably
         if (result.createdSessionId) {
          // Store with longer expiry and better error handling
          try {
            sessionStorage.setItem('pendingSessionId', result.createdSessionId);
            sessionStorage.setItem('pendingSessionTimestamp', Date.now().toString());
            console.log('📝 Stored pending session ID:', result.createdSessionId);
          } catch (storageError) {
            console.warn('⚠️ SessionStorage failed:', storageError);
            // Continue anyway - the session might still work
          }
        }

        // Set processing state to prevent multiple redirects
        setIsProcessingSignIn(true);

        // Create oauth-callback URL with all necessary parameters
        const oauthCallbackUrl = new URL('/authentication/oauth-callback', window.location.origin);

        // Only add redirect_url if it's not the default /blog
        if (redirectUrl && redirectUrl !== '/blog') {
          oauthCallbackUrl.searchParams.set('redirect_url', redirectUrl);
        }

        // Add source parameter to indicate this is from email/password signin
        oauthCallbackUrl.searchParams.set('source', 'email-signin');

        // Add timestamp to prevent caching issues
        oauthCallbackUrl.searchParams.set('t', Date.now().toString());

        console.log('🔄 Redirecting to oauth-callback:', oauthCallbackUrl.toString());

        // INCREASED delay to give Clerk more time to process the session
        setTimeout(() => {
          router.replace(oauthCallbackUrl.toString());
        }, 500); // Increased from 100ms to 300ms
      } else if (result.status === "needs_first_factor") {
        // Handle cases where first factor authentication is needed
        console.log('🔐 First factor authentication required');
        setErrors({
          message: "Additional authentication required. Please complete the sign-in process.",
          code: "needs_first_factor"
        });
      } else if (result.status === "needs_second_factor") {
        // Handle two-factor authentication
        console.log('🔐 Two-factor authentication required');
        setErrors({
          message: "Two-factor authentication required. Please complete the verification.",
          code: "needs_second_factor"
        });
      } else if (result.status === "needs_new_password") {
        // Handle password reset requirement
        console.log('🔑 New password required');
        setErrors({
          message: "A new password is required. Please reset your password.",
          code: "needs_new_password"
        });
      } else {
        console.log("❌ Sign in incomplete:", result);
        setErrors({
          message: "Sign in incomplete. Please check your credentials and try again.",
          code: "incomplete_signin"
        });
      }
    } catch (err) {
      console.error("❌ Sign in error:", err);

      // Reset processing state on error
      setIsProcessingSignIn(false);

      if (err && typeof err === "object" && "errors" in err) {
        const clerkErrors = (err as { errors: ClerkError[] }).errors;
        if (clerkErrors?.length) {
          const error = clerkErrors[0];
          console.error('Clerk error details:', error);

          // Handle specific error codes
          let errorMessage = error.message || "An error occurred during sign in";

          switch (error.code) {
            case 'form_identifier_not_found':
              errorMessage = "No account found with this email address.";
              break;
            case 'form_password_incorrect':
              errorMessage = "Incorrect password. Please try again.";
              break;
            case 'form_identifier_exists_verification_required':
              // This is where verification is actually needed
              errorMessage = "Please check your email and verify your account before signing in.";
              break;
            case 'too_many_requests':
              errorMessage = "Too many attempts. Please wait a moment and try again.";
              break;
            case 'session_exists':
              errorMessage = "You're already signed in. Redirecting...";
              // Redirect if already signed in
              setTimeout(() => redirectToDestination(), 1000);
              break;
          }

          setErrors({
            message: errorMessage,
            code: error.code,
          });
        } else {
          setErrors({ message: "An unexpected error occurred during sign in" });
        }
      } else {
        setErrors({ message: "An unexpected error occurred. Please try again." });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    if (!signIn) return;

    try {
      setErrors(null);
      console.log('🚀 Starting Google OAuth sign in flow with redirect URL:', redirectUrl);

      // Create OAuth callback URL with redirect_url parameter
      const oauthCallbackUrl = new URL('/authentication/oauth-callback', window.location.origin);

      // Only add redirect_url if it's not the default /blog
      if (redirectUrl && redirectUrl !== '/blog') {
        oauthCallbackUrl.searchParams.set('redirect_url', redirectUrl);
      }

      // Add source parameter for OAuth
      oauthCallbackUrl.searchParams.set('source', 'oauth-google');

      const callbackUrlString = oauthCallbackUrl.toString();
      console.log('🔗 Google OAuth callback URL:', callbackUrlString);

      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: callbackUrlString,
        redirectUrlComplete: callbackUrlString,
      });
    } catch (err) {
      console.error("❌ Google sign-in error:", err);
      setErrors({ message: "Google sign-in failed. Please try again." });
    }
  };

  const signInWithApple = async () => {
    if (!signIn) return;

    try {
      setErrors(null);
      console.log('🍎 Starting Apple OAuth sign in flow with redirect URL:', redirectUrl);

      // Create OAuth callback URL with redirect_url parameter
      const oauthCallbackUrl = new URL('/authentication/oauth-callback', window.location.origin);

      // Only add redirect_url if it's not the default /blog
      if (redirectUrl && redirectUrl !== '/blog') {
        oauthCallbackUrl.searchParams.set('redirect_url', redirectUrl);
      }

      // Add source parameter for OAuth
      oauthCallbackUrl.searchParams.set('source', 'oauth-apple');

      const callbackUrlString = oauthCallbackUrl.toString();
      console.log('🔗 Apple OAuth callback URL:', callbackUrlString);

      await signIn.authenticateWithRedirect({
        strategy: "oauth_apple",
        redirectUrl: callbackUrlString,
        redirectUrlComplete: callbackUrlString,
      });
    } catch (err) {
      console.error("❌ Apple sign-in error:", err);
      setErrors({ message: "Apple sign-in failed. Please try again." });
    }
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-white flex flex-col lg:flex-row">
      {/* Left side - Sign In Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div ref={formRef} className="w-full max-w-md bg-white rounded-2xl p-6 sm:p-8 my-4 sm:my-8" style={{ opacity: 0 }}>
          <div className="text-center mb-6">
            <div ref={logoRef} style={{ transform: 'scale(0) rotate(-180deg)' }}>
              <Image src={"/img/logo.png"} alt="logo" width={100} height={100} className="mx-auto" />
            </div>
            <h1 ref={titleRef} className="text-xl sm:text-2xl font-bold leading-tight text-gray-600 mb-2 font-sora" style={{ transform: 'translateY(30px)', opacity: 0 }}>Welcome back</h1>
            <p ref={subtitleRef} className="text-sm font-normal text-[#848484] font-sora" style={{ transform: 'translateY(30px)', opacity: 0 }}>Sign in to your HOJO account</p>
          </div>

          {/* Show redirect destination if not default */}
          {redirectUrl && redirectUrl !== '/blog' && (
            <div className="mb-4 p-3 bg-white border border-[#EF3866] rounded-lg">
              <p className="text-sm text-[#EF3866] text-center">
                You&apos;ll be redirected to <span className="font-medium">{redirectUrl}</span> after signing in
              </p>
            </div>
          )}

          {/* Processing indicator */}
          {isProcessingSignIn && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-600 text-center flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v4m0 8v4m8-8h-4M4 12h4" />
                </svg>
                Processing your sign in...
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div ref={el => { inputRefs.current[0] = el; }} className="flex flex-col gap-2" style={{ transform: 'translateX(-30px)', opacity: 0 }}>
              <label htmlFor="emailAddress" className="text-sm sm:text-base font-medium leading-tight text-gray-700 font-sora">
                Email Address
              </label>
              <input
                id="emailAddress"
                name="emailAddress"
                type="email"
                value={formData.emailAddress}
                onChange={handleInputChange}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                className="text-gray-700 p-3 border border-gray-200 w-full h-10 sm:h-11 rounded-lg text-sm sm:text-base font-normal transition-colors focus:outline-none focus:border-[#EF3866] bg-white"
                placeholder="Email"
                required
                disabled={isProcessingSignIn}
              />
            </div>

            <div ref={el => { inputRefs.current[1] = el; }} className="flex flex-col gap-2" style={{ transform: 'translateX(-30px)', opacity: 0 }}>
              <label htmlFor="password" className="text-sm sm:text-base font-medium leading-tight text-gray-700 font-sora">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                className="text-gray-700 p-3 border border-gray-200 w-full h-10 sm:h-11 rounded-lg text-sm sm:text-base font-normal transition-colors focus:outline-none focus:border-[#EF3866] bg-white"
                placeholder="Enter your password"
                required
                disabled={isProcessingSignIn}
              />
              <div className="text-right">
                <Link
                  href={`/authentication/forgot-password${redirectUrl && redirectUrl !== '/blog' ? `?redirect_url=${encodeURIComponent(redirectUrl)}` : ''}`}
                  className="text-sm text-[#EF3866] hover:underline font-sora"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            {errors?.message && (
              <div data-error className="text-red-600 text-sm text-center py-2 px-4 bg-red-50 rounded border border-red-200">
                {errors.message}
              </div>
            )}

            <div id="clerk-captcha" className="flex justify-center"></div>

            <div className="flex items-center w-full">
              <div className="flex-grow h-px bg-gray-200" />
              <span className="mx-4 text-sm sm:text-base text-gray-700 font-medium font-sora whitespace-nowrap">
                Or
              </span>
              <div className="flex-grow h-px bg-gray-200" />
            </div>

            <div className="flex flex-col gap-3 w-full">
              {/* OAuth Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  ref={el => { buttonRefs.current[0] = el; }}
                  type="button"
                  onClick={signInWithApple}
                  onMouseEnter={handleButtonHover}
                  onMouseLeave={handleButtonLeave}
                  className="w-full sm:w-1/2 flex items-center justify-center gap-2 py-3 px-3 bg-white text-black border-2 border-gray-200 rounded-lg text-xs sm:text-sm font-medium cursor-pointer transition-all hover:border-[#EF3866] h-11 sm:h-12 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ transform: 'translateY(20px)', opacity: 0 }}
                  disabled={isProcessingSignIn}
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" viewBox="0 0 24 24">
                    <path fill="black" d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                  </svg>
                  <span className="hidden sm:inline">Sign in with Apple</span>
                  <span className="sm:hidden">Apple</span>
                </button>

                <button
                  ref={el => { buttonRefs.current[1] = el; }}
                  type="button"
                  onClick={signInWithGoogle}
                  onMouseEnter={handleButtonHover}
                  onMouseLeave={handleButtonLeave}
                  className="w-full sm:w-1/2 flex items-center justify-center gap-2 py-3 px-3 border-2 border-gray-200 rounded-lg bg-white text-xs sm:text-sm font-medium cursor-pointer transition-all hover:border-[#EF3866] hover:bg-gray-50 text-gray-700 h-11 sm:h-12 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ transform: 'translateY(20px)', opacity: 0 }}
                  disabled={isProcessingSignIn}
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  <span className="hidden sm:inline">Sign in with Google</span>
                  <span className="sm:hidden">Google</span>
                </button>
              </div>

              {/* Sign In Button */}
              <button
                ref={el => { buttonRefs.current[2] = el; }}
                type="submit"
                onMouseEnter={handleButtonHover}
                onMouseLeave={handleButtonLeave}
                className="w-full py-3 sm:py-3.5 px-4 bg-[#EF3866] text-white border-none rounded-lg text-sm sm:text-base font-semibold cursor-pointer transition-colors hover:bg-[#D53059] disabled:opacity-60 disabled:cursor-not-allowed h-11 sm:h-12"
                disabled={isLoading || isProcessingSignIn}
                style={{ transform: 'translateY(20px)', opacity: 0 }}
              >
                {isLoading ? "Signing In..." : isProcessingSignIn ? "Processing..." : "Sign In"}
              </button>

              {/* Don't have an account */}
              <div className="text-center text-xs sm:text-sm mt-2">
                <p className="text-gray-600">
                  Don&apos;t have an account?{" "}
                  <Link
                    href={`/authentication/sign-up${redirectUrl && redirectUrl !== '/blog' ? `?redirect_url=${encodeURIComponent(redirectUrl)}` : ''}`}
                    className="text-[#EF3866] hover:underline"
                  >
                    Sign up
                  </Link>
                </p>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Right side - Image Slider */}
      <div className="hidden lg:block w-1/2 p-4 sm:p-6 lg:p-8">
        <div ref={imageSliderRef} className="w-full h-full relative rounded-2xl overflow-hidden shadow-lg" style={{ opacity: 0 }}>
          {images.map((img, index) => (
            <div
              key={index}
              className={`absolute top-0 left-0 w-full h-full transition-opacity duration-500 ease-in-out ${index === currentSlide ? 'opacity-100' : 'opacity-0'
                }`}
            >
              <Image
                fill
                src={img}
                alt={`HOJO Slide ${index + 1}`}
                className="object-cover"
                sizes="50vw"
                priority={index === 0}
              />
            </div>
          ))}
          <div className="absolute bottom-8 left-[80%] transform -translate-x-1/2 flex gap-2">
            {images.map((_, index) => (
              <button
                key={index}
                className={`w-5 h-2  rounded-full border-none cursor-pointer transition-colors duration-300 ${index === currentSlide ? 'bg-white' : 'bg-white/50'
                  }`}
                onClick={() => setCurrentSlide(index)}
                onMouseEnter={(e) => gsap.to(e.currentTarget, { scale: 1.2, duration: 0.2 })}
                onMouseLeave={(e) => gsap.to(e.currentTarget, { scale: 1, duration: 0.2 })}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Loading fallback component
function SignInLoading() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-[#EF3866] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

// Main component with Suspense boundary
export default function SignInPage() {
  return (
    <Suspense fallback={<SignInLoading />}>
      <SignInContent />
    </Suspense>
  );
}