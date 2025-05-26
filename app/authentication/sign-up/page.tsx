"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSignUp, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { gsap } from "gsap";

interface FormData {
  firstName: string;
  lastName: string;
  emailAddress: string;
  password: string;
  username?: string;
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

interface SignUpData {
  emailAddress: string;
  password: string;
  unsafeMetadata: {
    firstName: string;
    lastName: string;
  };
}

export default function SignUpPage() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const { isSignedIn } = useUser();
  const router = useRouter();

  // Animation refs
  const containerRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const imageSliderRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const inputRefs = useRef<(HTMLDivElement | null)[]>([]);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const modalRef = useRef<HTMLDivElement>(null);

  // Memoize router to avoid dependency warnings
  const memoizedRouter = useCallback(() => router, [router]);

  useEffect(() => {
    if (isSignedIn) {
      memoizedRouter().replace("/blog");
    }
  }, [isSignedIn, memoizedRouter]);

  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    emailAddress: "",
    password: "",
    username: "",
  });
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState("");
  const [errors, setErrors] = useState<ErrorState | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Current slide for image slider
  const [currentSlide, setCurrentSlide] = useState(0);
  const images = [
    "/img/login1.png",
    "/img/login2.png",
    "/img/login3.png",
  ];

  // Initial page load animations
  useEffect(() => {
    const tl = gsap.timeline();
    
    // Set initial states
    gsap.set([formRef.current, imageSliderRef.current], { opacity: 0 });
    gsap.set(logoRef.current, { scale: 0, rotation: -180 });
    gsap.set([titleRef.current, subtitleRef.current], { y: 30, opacity: 0 });
    gsap.set(inputRefs.current.filter(Boolean), { x: -30, opacity: 0 });
    gsap.set(buttonRefs.current.filter(Boolean), { y: 20, opacity: 0 });

    // Animate page entry
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

  }, []);

  // Modal animation
  useEffect(() => {
    if (pendingVerification && modalRef.current) {
      gsap.fromTo(modalRef.current, 
        { 
          scale: 0.8, 
          opacity: 0,
          y: 50
        },
        { 
          scale: 1, 
          opacity: 1,
          y: 0,
          duration: 0.4,
          ease: "power2.out"
        }
      );
    }
  }, [pendingVerification]);

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
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
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
    if (!isLoaded || !signUp) return;

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
      const signUpData: SignUpData = {
        emailAddress: formData.emailAddress,
        password: formData.password,
        unsafeMetadata: {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
        },
      };

      console.log("Attempting sign up with data:", signUpData);

      await signUp.create(signUpData);
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
    } catch (err) {
      console.error("Sign up error:", err);

      if (err && typeof err === "object" && "errors" in err) {
        const clerkErrors = (err as { errors: ClerkError[] }).errors;
        if (clerkErrors?.length) {
          setErrors({
            message: clerkErrors[0].message || "An error occurred during sign up",
            code: clerkErrors[0].code,
          });
        } else {
          setErrors({ message: "An unexpected error occurred" });
        }
      } else {
        setErrors({ message: "An unexpected error occurred" });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const onPressVerify = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isLoaded || !signUp) return;

    setIsLoading(true);
    setErrors(null);

    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (completeSignUp.status !== "complete") {
        console.log(JSON.stringify(completeSignUp, null, 2));
        setErrors({ message: "Verification incomplete. Please try again." });
        return;
      }

      if (completeSignUp.status === "complete") {
        await setActive({ session: completeSignUp.createdSessionId });
        router.push("/blog");
      }
    } catch (err) {
      console.error("Verification error:", err);

      if (err && typeof err === 'object' && 'errors' in err) {
        const clerkErrors = (err as { errors: ClerkError[] }).errors;
        if (clerkErrors && clerkErrors.length > 0) {
          setErrors({
            message: clerkErrors[0].message || "Verification failed",
            code: clerkErrors[0].code,
          });
        } else {
          setErrors({ message: "Verification failed" });
        }
      } else {
        setErrors({ message: "Verification failed" });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const signUpWithGoogle = async () => {
    if (!signUp) return;

    try {
      setErrors(null);
      console.log('Starting Google OAuth sign up flow');
      
      await signUp.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/authentication/oauth-callback',
        redirectUrlComplete: '/authentication/oauth-callback',
      });
    } catch (err) {
      console.error("Google sign-up error:", err);
      setErrors({ message: "Google sign-up failed. Please try again." });
    }
  };

  const signUpWithApple = async () => {
    if (!signUp) return;

    try {
      setErrors(null);
      console.log('Starting Apple OAuth sign up flow');
      
      await signUp.authenticateWithRedirect({
        strategy: 'oauth_apple',
        redirectUrl: '/authentication/oauth-callback',
        redirectUrlComplete: '/authentication/oauth-callback',
      });
    } catch (err) {
      console.error("Apple sign-up error:", err);
      setErrors({ message: "Apple sign-up failed. Please try again." });
    }
  };

  const closeVerificationModal = () => {
    if (modalRef.current) {
      gsap.to(modalRef.current, {
        scale: 0.8,
        opacity: 0,
        y: 50,
        duration: 0.3,
        ease: "power2.in",
        onComplete: () => {
          setPendingVerification(false);
          setCode("");
          setErrors(null);
        }
      });
    } else {
      setPendingVerification(false);
      setCode("");
      setErrors(null);
    }
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-white flex flex-col lg:flex-row">
      {/* Verification Modal Overlay */}
      {pendingVerification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div ref={modalRef} className="w-full max-w-[500px] rounded-2xl border border-white/10 bg-gray-200 shadow-2xl p-6 sm:p-8 text-gray-600 relative">
            <button
              onClick={closeVerificationModal}
              className="absolute top-4 right-4 text-gray-600 hover:text-white text-2xl font-sora font-bold transition"
              aria-label="Close verification modal"
              onMouseEnter={handleButtonHover}
              onMouseLeave={handleButtonLeave}
            >
              ×
            </button>
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold font-manrope">Verify Your Email</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1 font-manrope">
                Enter the 6-digit code sent to your email.
              </p>
            </div>

            <form onSubmit={onPressVerify} className="space-y-6">
              <div className="flex flex-col gap-2">
                <label htmlFor="code" className="text-gray-600 text-sm font-medium font-sora">
                  Verification Code
                </label>
                <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
                  {Array(6)
                    .fill(0)
                    .map((_, i) => (
                      <input
                        key={i}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        className="w-12 h-12 sm:w-14 sm:h-14 text-center border border-[#EF3866] rounded-lg text-gray-800 text-xl font-semibold focus:outline-none focus:ring-2 focus:ring-[#EF3866] transition-all"
                        value={code[i] || ''}
                        onFocus={handleInputFocus}
                        onBlur={handleInputBlur}
                        onChange={(e) => {
                          const newCode = code.split('');
                          newCode[i] = e.target.value;
                          const updatedCode = newCode.join('');
                          setCode(updatedCode);
                          if (e.target.value && e.target.nextElementSibling) {
                            (e.target.nextElementSibling as HTMLInputElement).focus();
                          }
                        }}
                      />
                    ))}
                </div>
              </div>

              {errors?.message && (
                <div data-error className="bg-red-100/30 border border-red-300 text-red-700 text-sm p-2 rounded-md text-center">
                  {errors.message}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-[#EF3866] hover:bg-[#D53059] text-white font-semibold rounded-lg text-base transition disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={isLoading}
                onMouseEnter={handleButtonHover}
                onMouseLeave={handleButtonLeave}
              >
                {isLoading ? "Verifying..." : "Verify Email"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Left side - Sign Up Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div ref={formRef} className="w-full max-w-md bg-white rounded-2xl p-6 sm:p-8 my-4 sm:my-8">
          <div className="text-center mb-6">
            <div ref={logoRef}>
              <Image src={"/img/logo.png"} alt="logo" width={100} height={100} className="mx-auto" />
            </div>
            <h1 ref={titleRef} className="text-xl sm:text-2xl font-bold leading-tight text-gray-600 mb-2 font-sora">Create an account</h1>
            <p ref={subtitleRef} className="text-sm font-normal text-[#848484] font-sora">Join the HOJO community!</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div ref={el => { inputRefs.current[0] = el; }} className="flex flex-col gap-2">
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
              />
            </div>

            <div ref={el => { inputRefs.current[1] = el; }} className="flex flex-col gap-2">
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
                placeholder="Create a strong password"
                required
              />
              <div className="flex items-start gap-2 mt-2">
                <input type="checkbox" className="mt-1 flex-shrink-0" required />
                <span className="text-xs sm:text-sm font-normal text-[#848484] font-sora">
                  I agree to the <Link href="/terms" className="text-[#EF3866] hover:underline">Terms of Service</Link> and <Link href="/privacy" className="text-[#EF3866] hover:underline">Privacy Policy</Link>
                </span>
              </div>
            </div>

            {errors?.message && (
              <div data-error className="text-red-600 text-sm text-center py-2 px-4 bg-red-50 rounded border border-red-200">
                {errors.message}
              </div>
            )}

            <div id="clerk-captcha" className="flex justify-center my-4"></div>

            <div className="text-center relative my-4 w-full">
              <div className="absolute top-1/2 left-0 right-0 h-px bg-gray-200"></div>
              <span className="bg-white font-medium font-sora leading-tight px-4 text-gray-700 text-sm sm:text-base">Or</span>
            </div>

              <div className="flex flex-col gap-3 w-full">
                {/* OAuth Buttons */}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  ref={el => { buttonRefs.current[0] = el; }}
                  type="button"
                  onClick={signUpWithApple}
                  onMouseEnter={handleButtonHover}
                  onMouseLeave={handleButtonLeave}
                  className="w-full sm:w-1/2 flex items-center justify-center gap-2 py-3 px-3 bg-white text-black border-2 border-gray-200 rounded-lg text-xs sm:text-sm font-medium cursor-pointer transition-all hover:border-[#EF3866] h-11 sm:h-12"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" viewBox="0 0 24 24">
                    <path fill="black" d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                  </svg>
                  <span className="hidden sm:inline">Sign up with Apple</span>
                  <span className="sm:hidden">Apple</span>
                </button>

                <button
                  ref={el => { buttonRefs.current[1] = el; }}
                  type="button"
                  onClick={signUpWithGoogle}
                  onMouseEnter={handleButtonHover}
                  onMouseLeave={handleButtonLeave}
                  className="w-full sm:w-1/2 flex items-center justify-center gap-2 py-3 px-3 border-2 border-gray-200 rounded-lg bg-white text-xs sm:text-sm font-medium cursor-pointer transition-all hover:border-[#EF3866] hover:bg-gray-50 text-gray-700 h-11 sm:h-12"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  <span className="hidden sm:inline">Sign up with Google</span>
                  <span className="sm:hidden">Google</span>
                </button>
              </div>

              {/* Create Account Button */}
              <button
                ref={el => { buttonRefs.current[2] = el; }}
                type="submit"
                onMouseEnter={handleButtonHover}
                onMouseLeave={handleButtonLeave}
                className="w-full py-3 sm:py-3.5 px-4 bg-[#EF3866] text-white border-none rounded-lg text-sm sm:text-base font-semibold cursor-pointer transition-colors hover:bg-[#D53059] disabled:opacity-60 disabled:cursor-not-allowed h-11 sm:h-12"
                disabled={isLoading}
              >
                {isLoading ? "Creating Account..." : "Sign Up"}
              </button>

              {/* Already have an account */}
              <div className="text-center text-xs sm:text-sm mt-2">
                <p className="text-gray-600">
                  Already have an account?{" "}
                  <a href="/authentication/sign-in" className="text-[#EF3866] hover:underline">Sign in</a>
                </p>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Right side - Image Slider */}
      <div className="hidden lg:block w-1/2 p-4 sm:p-6 lg:p-8">
        <div ref={imageSliderRef} className="w-full h-full relative rounded-2xl overflow-hidden shadow-lg">
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
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-2">
            {images.map((_, index) => (
              <button
                key={index}
                className={`w-3 h-3 rounded-full border-none cursor-pointer transition-colors duration-300 ${index === currentSlide ? 'bg-white' : 'bg-white/50'
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