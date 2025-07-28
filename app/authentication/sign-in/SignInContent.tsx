import { useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { useAuthRedirect } from "../../../hooks/auth/useAuthRedirect";
import AuthLayout from "../../../components/auth/AuthLayout";
import { SignInForm } from "./SignInForm";
import AuthError from "../../../components/auth/AuthError";
import Image from "next/image";
import { gsap } from "gsap";
import { useRouter } from "next/navigation";

export function SignInContent() {
  const { isSignedIn } = useUser();
  const searchParams = useSearchParams();
  const { redirectUrl, redirectToDestination, clearPendingAuthState } = useAuthRedirect();
  const processedRef = useRef(false);
  const router = useRouter();
  
  const logoRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  
  // Get error from URL params
  const errorParam = searchParams.get('error');
     
  // Handle URL-based errors
  const getUrlError = () => {
    if (!errorParam) return null;
       
    switch (errorParam) {
      case 'activation_failed':
        return { message: 'Session activation failed. Please try signing in again.' };
      case 'auth_failed':
        return { message: 'Authentication failed. Please try again.' };
      default:
        return { message: 'An authentication error occurred. Please try again.' };
    }
  };
  
  const urlError = getUrlError();
  
  // Clear URL error after showing it
  useEffect(() => {
    if (errorParam) {
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('error');
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, [errorParam]);

  // Clear any pending authentication state when page loads
  useEffect(() => {
    clearPendingAuthState();
  }, [clearPendingAuthState]);
  
  // Handle existing signed-in users
  useEffect(() => {
    if (isSignedIn && !processedRef.current) {
      processedRef.current = true;
      console.log('User already signed in, redirecting to:', redirectUrl);
      // Redirect directly instead of going through oauth-callback
      router.replace(redirectUrl);
    }
  }, [isSignedIn, redirectUrl, router]);
  
  // Logo and text animation effect
  useEffect(() => {
    if (logoRef.current && titleRef.current && subtitleRef.current) {
      // Set initial states immediately
      gsap.set(logoRef.current, { scale: 0, rotation: -180 });
      gsap.set([titleRef.current, subtitleRef.current], { y: 30, opacity: 0 });
      
      // Create animation timeline
      const tl = gsap.timeline({ delay: 0.1 });
      
      tl.to(logoRef.current, {
        scale: 1,
        rotation: 0,
        duration: 0.6,
        ease: "back.out(1.7)"
      })
      .to([titleRef.current, subtitleRef.current], {
        y: 0,
        opacity: 1,
        duration: 0.5,
        stagger: 0.1,
        ease: "power2.out"
      }, "-=0.2"); // Start 0.2 seconds before the logo animation ends
    }
  }, []); // Empty dependency array to run only once on mount
  
  return (
    <AuthLayout>
      <div className="w-full max-w-md bg-white rounded-2xl p-6 sm:p-8 my-4 sm:my-8">
        {/* Logo and Title */}
        <div className="text-center mb-6">
          <div ref={logoRef} style={{ transform: 'scale(0) rotate(-180deg)' }} className="">
            <Image 
              src="/img/logo.png" 
              alt="logo" 
              width={100} 
              height={100} 
              className="mx-auto" 
            />
          </div>
          <h1 ref={titleRef} className="text-xl sm:text-2xl font-bold leading-tight text-gray-600 mb-2 font-sora" style={{ transform: 'translateY(30px)', opacity: 0 }}>
            Welcome back
          </h1>
          <p ref={subtitleRef} className="text-sm font-normal text-[#848484] font-sora" style={{ transform: 'translateY(30px)', opacity: 0 }}>
            Sign in to your HOJO account
          </p>
        </div>
        
        {/* URL Error Display */}
        <AuthError error={urlError} />
        
        {/* Sign In Form */}
        <SignInForm />
      </div>
    </AuthLayout>
  );
}