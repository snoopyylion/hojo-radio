"use client";

import { useState, useEffect } from "react";
import { useSignIn, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

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

export default function SignInPage() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const { isSignedIn } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isSignedIn) {
      router.replace("/blog");
    }
  }, [isSignedIn]);

  const [formData, setFormData] = useState<FormData>({
    emailAddress: "",
    password: "",
  });
  const [errors, setErrors] = useState<ErrorState | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Current slide for image slider
  const [currentSlide, setCurrentSlide] = useState(0);
  const images = [
    "/img/login1.png",
    "/img/login2.png",
    "/img/login3.png",
  ];

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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isLoaded || !signIn) return;

    setIsLoading(true);
    setErrors(null);

    try {
      const result = await signIn.create({
        identifier: formData.emailAddress,
        password: formData.password,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.push("/blog");
      } else {
        console.log("Sign in incomplete:", result);
        setErrors({ message: "Sign in incomplete. Please try again." });
      }
    } catch (err) {
      console.error("Sign in error:", err);

      if (err && typeof err === "object" && "errors" in err) {
        const clerkErrors = (err as { errors: ClerkError[] }).errors;
        if (clerkErrors?.length) {
          setErrors({
            message: clerkErrors[0].message || "An error occurred during sign in",
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

  const signInWithGoogle = async () => {
    if (!signIn) return;

    try {
      setErrors(null);
      console.log('Starting Google OAuth sign in flow');

      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: `${window.location.origin}/authentication/oauth-callback`,
        redirectUrlComplete: `${window.location.origin}/authentication/oauth-callback`,
      });
    } catch (err) {
      console.error("Google sign-in error:", err);
      setErrors({ message: "Google sign-in failed. Please try again." });
    }
  };
  const signInWithApple = async () => {
    if (!signIn) return;

    try {
      setErrors(null);
      console.log('Starting Apple OAuth sign in flow');

      await signIn.authenticateWithRedirect({
        strategy: "oauth_apple",
        redirectUrl: `${window.location.origin}/authentication/oauth-callback`,
        redirectUrlComplete: `${window.location.origin}/authentication/oauth-callback`,
      });
    } catch (err) {
      console.error("Apple sign-in error:", err);
      setErrors({ message: "Apple sign-in failed. Please try again." });
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col lg:flex-row">
      {/* Left side - Sign In Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md bg-white rounded-2xl p-6 sm:p-8 my-4 sm:my-8">
          <div className="text-center mb-6">
            <Image src={"/img/logo.png"} alt="logo" width={100} height={100} className="mx-auto" />
            <h1 className="text-xl sm:text-2xl font-bold leading-tight text-gray-600 mb-2 font-sora">Welcome back</h1>
            <p className="text-sm font-normal text-[#848484] font-sora">Sign in to your HOJO account</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="emailAddress" className="text-sm sm:text-base font-medium leading-tight text-gray-700 font-sora">
                Email Address
              </label>
              <input
                id="emailAddress"
                name="emailAddress"
                type="email"
                value={formData.emailAddress}
                onChange={handleInputChange}
                className="text-gray-700 p-3 border border-gray-200 w-full h-10 sm:h-11 rounded-lg text-sm sm:text-base font-normal transition-colors focus:outline-none focus:border-[#EF3866] bg-white"
                placeholder="Email"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="password" className="text-sm sm:text-base font-medium leading-tight text-gray-700 font-sora">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                className="text-gray-700 p-3 border border-gray-200 w-full h-10 sm:h-11 rounded-lg text-sm sm:text-base font-normal transition-colors focus:outline-none focus:border-[#EF3866] bg-white"
                placeholder="Enter your password"
                required
              />
              <div className="text-right">
                <Link href="/forgot-password" className="text-sm text-[#EF3866] hover:underline font-sora">
                  Forgot password?
                </Link>
              </div>
            </div>

            {errors?.message && (
              <div className="text-red-600 text-sm text-center py-2 px-4 bg-red-50 rounded border border-red-200">
                {errors.message}
              </div>
            )}

            <div id="clerk-captcha" className="flex justify-center my-4"></div>

            <div className="text-center relative my-4 w-full">
              <div className="absolute top-1/2 left-0 right-0 h-px bg-gray-200"></div>
              <span className="bg-white font-medium font-sora leading-tight px-4 text-[#aaaaaa] text-sm sm:text-base">Or</span>
            </div>

            <div className="flex flex-col gap-3 w-full">
              {/* OAuth Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={signInWithApple}
                  className="w-full sm:w-1/2 flex items-center justify-center gap-2 py-3 px-3 bg-white text-black border-2 border-gray-200 rounded-lg text-xs sm:text-sm font-medium cursor-pointer transition-all hover:border-[#EF3866] h-11 sm:h-12"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" viewBox="0 0 24 24">
                    <path fill="black" d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                  </svg>
                  <span className="hidden sm:inline">Sign in with Apple</span>
                  <span className="sm:hidden">Apple</span>
                </button>

                <button
                  type="button"
                  onClick={signInWithGoogle}
                  className="w-full sm:w-1/2 flex items-center justify-center gap-2 py-3 px-3 border-2 border-gray-200 rounded-lg bg-white text-xs sm:text-sm font-medium cursor-pointer transition-all hover:border-[#EF3866] hover:bg-gray-50 text-gray-700 h-11 sm:h-12"
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
                type="submit"
                className="w-full py-3 sm:py-3.5 px-4 bg-[#EF3866] text-white border-none rounded-lg text-sm sm:text-base font-semibold cursor-pointer transition-colors hover:bg-[#D53059] disabled:opacity-60 disabled:cursor-not-allowed h-11 sm:h-12"
                disabled={isLoading}
              >
                {isLoading ? "Signing In..." : "Sign In"}
              </button>

              {/* Don't have an account */}
              <div className="text-center text-xs sm:text-sm mt-2">
                <p className="text-gray-600">
                  Don&apos;t have an account?{" "}
                  <Link href="/authentication/sign-up" className="text-[#EF3866] hover:underline">Sign up</Link>
                </p>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Right side - Image Slider */}
      <div className="hidden lg:block w-1/2 p-4 sm:p-6 lg:p-8">
        <div className="w-full h-full relative rounded-2xl overflow-hidden shadow-lg">
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
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}