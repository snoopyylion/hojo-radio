import { useState, useRef } from "react";
import { useSignIn, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useAuthRedirect } from "../../../hooks/auth/useAuthRedirect";
import { useOAuth } from "../../../hooks/auth/useOAuth";
import AuthForm from "../../../components/auth/AuthForm";
import InputField from "../../../components/auth/InputField";
import OAuthButtons from "../../../components/auth/OAuthButtons";
import AuthError from "../../../components/auth/AuthError";
import Link from "next/link";


interface FormData {
  emailAddress: string;
  password: string;
}

interface ErrorState {
  message: string;
  code?: string;
}

export function SignInForm() {
  const { isLoaded, signIn } = useSignIn();
  const { setActive } = useClerk(); // Add this hook
  const router = useRouter();
  const { redirectUrl } = useAuthRedirect();
  const { signInWithGoogle, signInWithApple, isLoading: oauthLoading, error: oauthError } = useOAuth();
  
  const [formData, setFormData] = useState<FormData>({
    emailAddress: "",
    password: "",
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [ isProcessingSignIn ] = useState(false);
  const [errors, setErrors] = useState<ErrorState | null>(null);
  
  const submitButtonRef = useRef<HTMLButtonElement>(null);

  // Simple field error helper
  const getFieldError = (fieldName: string, globalError?: string): string | undefined => {
    if (globalError) {
      const lowerError = globalError.toLowerCase();
      if (fieldName === 'emailAddress' && (lowerError.includes('email') || lowerError.includes('identifier'))) {
        return globalError;
      }
      if (fieldName === 'password' && lowerError.includes('password')) {
        return globalError;
      }
    }
    return undefined;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    // Clear errors when user starts typing
    if (errors) setErrors(null);
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

      console.log('Full result object:', JSON.stringify(result, null, 2));

      if (result.status === "complete") {
        // Use setActive from useClerk hook
        await setActive({ session: result.createdSessionId });
        router.push(redirectUrl || '/blog');
      } else {
        console.log('Sign-in not complete, status:', result.status);
        // Handle other statuses here
        setErrors({ 
          message: `Sign-in requires additional steps. Status: ${result.status}`,
          code: result.status || undefined 
        });
      }
    } catch (err) {
      console.error("Sign in error:", err);
      setErrors({ message: "Sign in failed. Please check your credentials." });
    } finally {
      setIsLoading(false);
    }
  };

  // Show redirect destination if not default
  const showRedirectInfo = redirectUrl && redirectUrl !== '/blog';
  
  // Show processing indicator
  const showProcessingInfo = isProcessingSignIn;

  return (
    <AuthForm onSubmit={handleSubmit}>
      {/* Redirect Info */}
      {showRedirectInfo && (
        <div className="mb-4 p-3 bg-white border border-[#EF3866] rounded-lg" data-animate="input">
          <p className="text-sm text-[#EF3866] text-center">
            You&apos;ll be redirected to <span className="font-medium">{redirectUrl}</span> after signing in
          </p>
        </div>
      )}

      {/* Processing Info */}
      {showProcessingInfo && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg" data-animate="input">
          <p className="text-sm text-blue-600 text-center flex items-center justify-center gap-2">
            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v4m0 8v4m8-8h-4M4 12h4" />
            </svg>
            Processing your sign in...
          </p>
        </div>
      )}

      {/* Email Field */}
      <div data-animate="input">
        <InputField
          id="emailAddress"
          name="emailAddress"
          type="email"
          label="Email Address"
          value={formData.emailAddress}
          onChange={handleInputChange}
          placeholder="Email"
          required
          disabled={isProcessingSignIn}
          error={getFieldError('emailAddress', errors?.message)}
        />
      </div>

      {/* Password Field */}
      <div data-animate="input">
        <InputField
          id="password"
          name="password"
          type="password"
          label="Password"
          value={formData.password}
          onChange={handleInputChange}
          placeholder="Enter your password"
          required
          disabled={isProcessingSignIn}
          error={getFieldError('password', errors?.message)}
        />
        {/* Forgot Password Link */}
        <div className="text-right mt-2">
          <Link
            href={`/authentication/forgot-password${redirectUrl && redirectUrl !== '/blog' ? `?redirect_url=${encodeURIComponent(redirectUrl)}` : ''}`}
            className="text-sm text-[#EF3866] hover:underline font-sora"
          >
            Forgot password?
          </Link>
        </div>
      </div>

      {/* Error Display */}
      <AuthError error={errors || oauthError} />

      {/* Clerk Captcha */}
      <div id="clerk-captcha" className="flex justify-center"></div>

      {/* Divider */}
      <div className="flex items-center w-full" data-animate="divider">
        <div className="flex-grow h-px bg-gray-200" />
        <span className="mx-4 text-sm sm:text-base text-gray-700 font-medium font-sora whitespace-nowrap">
          Or
        </span>
        <div className="flex-grow h-px bg-gray-200" />
      </div>

      {/* OAuth Buttons */}
      <div className="flex flex-col gap-3 w-full" data-animate="oauth">
        <OAuthButtons
          onGoogleSignIn={signInWithGoogle}
          onAppleSignIn={signInWithApple}
          disabled={isProcessingSignIn || oauthLoading}
          isLoading={oauthLoading}
        />
      </div>

      {/* Submit Button */}
      <button
        ref={submitButtonRef}
        type="submit"
        className="w-full mt-[18px] py-3 sm:py-3.5 px-4 bg-[#EF3866] text-white border-none rounded-lg text-sm sm:text-base font-semibold cursor-pointer transition-colors hover:bg-[#D53059] disabled:opacity-60 disabled:cursor-not-allowed h-11 sm:h-12"
        disabled={isLoading || isProcessingSignIn || oauthLoading}
        data-animate="button"
      >
        {isLoading ? "Signing In..." : isProcessingSignIn ? "Processing..." : "Sign In"}
      </button>

      {/* Sign Up Link */}
      <div className="text-center text-xs sm:text-sm mt-2" data-animate="button">
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
    </AuthForm>
  );
}