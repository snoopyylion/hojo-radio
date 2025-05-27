"use client";

import { useState, useRef, useEffect } from "react";
import { useSignUp } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import AuthError from "./../../../components/auth/AuthError";
import { useAuthAnimations } from "@/hooks/auth/useAuthAnimations";
import { AuthErrorState } from "@/utils/auth/types";

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
}

export default function VerificationModal({ isOpen, onClose, email }: VerificationModalProps) {
  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();
  const modalRef = useRef<HTMLDivElement>(null);
  const { inputFocus, inputBlur, buttonHover, buttonLeave } = useAuthAnimations();

  const [code, setCode] = useState("");
  const [errors, setErrors] = useState<AuthErrorState | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Modal animation
  useEffect(() => {
    if (isOpen && modalRef.current) {
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
  }, [isOpen]);

  const handleClose = () => {
    if (modalRef.current) {
      gsap.to(modalRef.current, {
        scale: 0.8,
        opacity: 0,
        y: 50,
        duration: 0.3,
        ease: "power2.in",
        onComplete: () => {
          onClose();
          setCode("");
          setErrors(null);
        }
      });
    } else {
      onClose();
      setCode("");
      setErrors(null);
    }
  };

  const handleVerify = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isLoaded || !signUp) return;

    if (code.length !== 6) {
      setErrors({ message: "Please enter the complete 6-digit code" });
      return;
    }

    setIsLoading(true);
    setErrors(null);

    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (completeSignUp.status === "complete") {
        await setActive({ session: completeSignUp.createdSessionId });
        router.push("/blog");
      } else {
        setErrors({ message: "Verification incomplete. Please try again." });
      }
    } catch (err) {
      console.error("Verification error:", err);

      if (err && typeof err === 'object' && 'errors' in err) {
        const clerkErrors = (err as { errors: Array<{ message?: string; code?: string }> }).errors;
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

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) return; // Prevent multiple characters
    
    const newCode = code.split('');
    newCode[index] = value;
    const updatedCode = newCode.join('');
    setCode(updatedCode);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.querySelector(`input[data-index="${index + 1}"]`) as HTMLInputElement;
      if (nextInput) {
        nextInput.focus();
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !e.currentTarget.value && index > 0) {
      const prevInput = document.querySelector(`input[data-index="${index - 1}"]`) as HTMLInputElement;
      if (prevInput) {
        prevInput.focus();
      }
    }
  };

  const resendCode = async () => {
    if (!signUp) return;
    
    try {
      setErrors(null);
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      // Show success message or toast here if needed
    } catch {
      setErrors({ message: "Failed to resend code. Please try again." });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div ref={modalRef} className="w-full max-w-[500px] rounded-2xl border border-white/10 bg-gray-200 shadow-2xl p-6 sm:p-8 text-gray-600 relative">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-600 hover:text-gray-800 text-2xl font-sora font-bold transition"
          aria-label="Close verification modal"
          onMouseEnter={buttonHover}
          onMouseLeave={buttonLeave}
        >
          ×
        </button>

        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold font-manrope text-gray-800 mb-2">
            Verify Your Email
          </h1>
          <p className="text-sm sm:text-base text-gray-600 font-manrope">
            Enter the 6-digit code sent to{" "}
            <span className="font-medium text-gray-800">{email}</span>
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-6">
          <div className="flex flex-col gap-4">
            <label className="text-gray-600 text-sm font-medium font-sora text-center">
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
                    data-index={i}
                    className="w-12 h-12 sm:w-14 sm:h-14 text-center border border-[#EF3866] rounded-lg text-gray-800 text-xl font-semibold focus:outline-none focus:ring-2 focus:ring-[#EF3866] transition-all"
                    value={code[i] || ''}
                    onFocus={inputFocus}
                    onBlur={inputBlur}
                    onChange={(e) => handleCodeChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, i)}
                  />
                ))}
            </div>
          </div>

          <AuthError error={errors} />

          <div className="flex flex-col gap-3">
            <button
              type="submit"
              className="w-full py-3 bg-[#EF3866] hover:bg-[#D53059] text-white font-semibold rounded-lg text-base transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              disabled={isLoading || code.length !== 6}
              onMouseEnter={buttonHover}
              onMouseLeave={buttonLeave}
            >
              {isLoading ? (
                <>
                  Verifying...
                </>
              ) : (
                "Verify Email"
              )}
            </button>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Didn&apos;t receive the code?{" "}
                <button
                  type="button"
                  onClick={resendCode}
                  className="text-[#EF3866] hover:underline font-medium"
                  disabled={isLoading}
                >
                  Resend
                </button>
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}