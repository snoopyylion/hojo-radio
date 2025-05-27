"use client";

import { useState } from "react";
import { useSignUp, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthForm from "./../../../components/auth/AuthForm";
import OAuthButtons from "./../../../components/auth/OAuthButtons";
import InputField from "./../../../components/auth/InputField";
import AuthError from "./../../../components/auth/AuthError";
import LoadingSpinner from "./../../../components/auth/LoadingSpinner";
import { useAuthAnimations } from "@/hooks/auth/useAuthAnimations";
import { useAuthRedirect } from "../../../hooks/auth/useAuthRedirect"; // Add this import
import { useOAuth } from "@/hooks/auth/useOAuth";
import { SignUpFormData, ErrorState } from "@/utils/auth/types";
import { validateSignUpForm } from "@/utils/auth/authHelpers";

interface SignUpFormProps {
  onVerificationNeeded: (email: string, redirectUrl?: string) => void; // Add redirectUrl parameter
}

export default function SignUpForm({ onVerificationNeeded }: SignUpFormProps) {
  const { isLoaded, signUp } = useSignUp();
  const { setActive } = useClerk(); // Add this hook for session management
  const router = useRouter();
  const { redirectUrl, buildOAuthCallbackUrl } = useAuthRedirect(); // Add redirect hook
  const { inputFocus, inputBlur, buttonHover, buttonLeave, buttonClick } = useAuthAnimations();
  const { signUpWithGoogle, signUpWithApple, isLoading: isOAuthLoading } = useOAuth();

  const [formData, setFormData] = useState<SignUpFormData>({
    emailAddress: "",
    password: "",
  });
  const [errors, setErrors] = useState<ErrorState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    // Clear errors when user starts typing
    if (errors) {
      setErrors(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isLoaded || !signUp) return;

    // Validate form
    const validationErrors = validateSignUpForm(formData, acceptedTerms);
    if (validationErrors.length > 0) {
      setErrors({
        message: validationErrors.join(", "),
        code: "validation_error"
      });
      return;
    }

    // Animate form submit
    buttonClick(e as any);
    setIsLoading(true);
    setErrors(null);

    try {
      // Only send email and password - no firstName/lastName
      await signUp.create({
        emailAddress: formData.emailAddress,
        password: formData.password,
      });

      await signUp.prepareEmailAddressVerification({ 
        strategy: "email_code" 
      });

      // Pass the redirectUrl to the verification step
      onVerificationNeeded(formData.emailAddress, redirectUrl);
    } catch (err) {
      console.error("Sign up error:", err);
      
      if (err && typeof err === "object" && "errors" in err) {
        const clerkErrors = (err as any).errors;
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

  // Show redirect destination if not default
  const showRedirectInfo = redirectUrl && redirectUrl !== '/blog';

  return (
    <AuthForm onSubmit={handleSubmit}>
      {/* Redirect Info - Same as SignIn form */}
      {showRedirectInfo && (
        <div className="mb-4 p-3 bg-white border border-[#EF3866] rounded-lg" data-animate="input">
          <p className="text-sm text-[#EF3866] text-center">
            You'll be redirected to <span className="font-medium">{redirectUrl}</span> after signing up
          </p>
        </div>
      )}

      <InputField
        id="emailAddress"
        name="emailAddress"
        type="email"
        label="Email Address"
        placeholder="Email"
        value={formData.emailAddress}
        onChange={handleInputChange}
        required
      />

      <InputField
        id="password"
        name="password"
        type="password"
        label="Password"
        placeholder="Create a strong password"
        value={formData.password}
        onChange={handleInputChange}
        required
      />

      <div className="flex items-start gap-2 mt-2" data-animate="terms">
        <input 
          type="checkbox" 
          id="terms"
          className="mt-1 flex-shrink-0" 
          checked={acceptedTerms}
          onChange={(e) => setAcceptedTerms(e.target.checked)}
        />
        <label htmlFor="terms" className="text-xs sm:text-sm font-normal text-[#848484] font-sora">
          I agree to the{" "}
          <Link href="/terms" className="text-[#EF3866] hover:underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-[#EF3866] hover:underline">
            Privacy Policy
          </Link>
        </label>
      </div>

      <AuthError error={errors} />

      <div id="clerk-captcha" className="flex justify-center"></div>

      <div className="flex items-center w-full" data-animate="divider">
        <div className="flex-grow h-px bg-gray-200" />
        <span className="mx-4 text-sm sm:text-base text-gray-700 font-medium font-sora whitespace-nowrap">
          Or
        </span>
        <div className="flex-grow h-px bg-gray-200" />
      </div>

      <div className="flex flex-col gap-3 w-full" data-animate="oauth">
        <OAuthButtons
          onGoogleSignIn={signUpWithGoogle}
          onAppleSignIn={signUpWithApple}
          isLoading={isOAuthLoading}
          disabled={isLoading}
        />

        <button
          type="submit"
          className="w-full py-3 sm:py-3.5 px-4 bg-[#EF3866] text-white border-none rounded-lg text-sm sm:text-base font-semibold cursor-pointer transition-colors hover:bg-[#D53059] disabled:opacity-60 disabled:cursor-not-allowed h-11 sm:h-12 flex items-center justify-center gap-2"
          disabled={isLoading || isOAuthLoading}
        >
          {isLoading ? (
            <>
              Creating Account...
            </>
          ) : (
            "Sign Up"
          )}
        </button>

        <div className="text-center text-xs sm:text-sm mt-2">
          <p className="text-gray-600">
            Already have an account?{" "}
            <Link 
              href={`/authentication/sign-in${redirectUrl && redirectUrl !== '/blog' ? `?redirect_url=${encodeURIComponent(redirectUrl)}` : ''}`}
              className="text-[#EF3866] hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </AuthForm>
  );
}