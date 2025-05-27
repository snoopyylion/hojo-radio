"use client";

import { useState, useEffect, useRef } from "react";
import { useSignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { gsap } from "gsap";

interface FormData {
    emailAddress: string;
    code: string;
    password: string;
    confirmPassword: string;
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

interface SuccessState {
    message: string;
}

export default function ForgotPasswordPage() {
    const { isLoaded, signIn, setActive } = useSignIn();
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

    const [step, setStep] = useState<'request' | 'verify' | 'reset'>('request');
    const [formData, setFormData] = useState<FormData>({
        emailAddress: "",
        code: "",
        password: "",
        confirmPassword: "",
    });
    const [errors, setErrors] = useState<ErrorState | null>(null);
    const [success, setSuccess] = useState<SuccessState | null>(null);
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
        if (formRef.current && imageSliderRef.current && logoRef.current &&
            titleRef.current && subtitleRef.current) {

            gsap.set([formRef.current, imageSliderRef.current], { opacity: 0 });
            gsap.set(logoRef.current, { scale: 0, rotation: -180 });
            gsap.set([titleRef.current, subtitleRef.current], { y: 30, opacity: 0 });
            gsap.set(inputRefs.current.filter(Boolean), { x: -30, opacity: 0 });
            gsap.set(buttonRefs.current.filter(Boolean), { y: 20, opacity: 0 });

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
    }, []);

    useEffect(() => {
        if (step) {
            // Small delay to ensure DOM elements are rendered
            setTimeout(() => {
                const currentInputs = inputRefs.current.filter(Boolean);
                const currentButtons = buttonRefs.current.filter(Boolean);

                if (currentInputs.length > 0 || currentButtons.length > 0) {
                    gsap.set(currentInputs, { x: -30, opacity: 0 });
                    gsap.set(currentButtons, { y: 20, opacity: 0 });

                    gsap.to(currentInputs, {
                        x: 0,
                        opacity: 1,
                        duration: 0.4,
                        stagger: 0.1,
                        ease: "power2.out"
                    });

                    gsap.to(currentButtons, {
                        y: 0,
                        opacity: 1,
                        duration: 0.4,
                        stagger: 0.05,
                        ease: "power2.out",
                        delay: 0.2
                    });
                }
            }, 100);
        }
    }, [step]);

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

    // Success animation
    useEffect(() => {
        if (success?.message) {
            const successEl = document.querySelector('[data-success]');
            if (successEl) {
                gsap.fromTo(successEl,
                    { y: -10, opacity: 0 },
                    {
                        y: 0,
                        opacity: 1,
                        duration: 0.3,
                        ease: "power2.out"
                    }
                );
            }
        }
    }, [success]);

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

    const handleRequestReset = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!isLoaded || !signIn) return;

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
        setSuccess(null);

        try {
            const result = await signIn.create({
                strategy: "reset_password_email_code",
                identifier: formData.emailAddress,
            });

            if (result.status === "needs_first_factor") {
                setStep('verify');
                setSuccess({
                    message: `We've sent a verification code to ${formData.emailAddress}. Please check your email.`
                });
            }
        } catch (err) {
            console.error("Password reset request error:", err);

            if (err && typeof err === "object" && "errors" in err) {
                const clerkErrors = (err as { errors: ClerkError[] }).errors;
                if (clerkErrors?.length) {
                    setErrors({
                        message: clerkErrors[0].message || "An error occurred while requesting password reset",
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

    const handleVerifyCode = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!isLoaded || !signIn) return;

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
        setSuccess(null);

        try {
            const result = await signIn.attemptFirstFactor({
                strategy: "reset_password_email_code",
                code: formData.code,
            });

            if (result.status === "needs_new_password") {
                setStep('reset');
                setSuccess({ message: "Code verified! Now set your new password." });
            }
        } catch (err) {
            console.error("Code verification error:", err);

            if (err && typeof err === "object" && "errors" in err) {
                const clerkErrors = (err as { errors: ClerkError[] }).errors;
                if (clerkErrors?.length) {
                    setErrors({
                        message: clerkErrors[0].message || "Invalid verification code",
                        code: clerkErrors[0].code,
                    });
                } else {
                    setErrors({ message: "Invalid verification code" });
                }
            } else {
                setErrors({ message: "Invalid verification code" });
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendCode = async () => {
  if (!isLoaded || !signIn) return;

  setIsLoading(true);
  setErrors(null);
  setSuccess(null);

  try {
    // Clear the current code
    setFormData({
      ...formData,
      code: ""
    });

    // Request a new code
    const result = await signIn.create({
      strategy: "reset_password_email_code",
      identifier: formData.emailAddress,
    });

    if (result.status === "needs_first_factor") {
      setSuccess({ 
        message: `New verification code sent to ${formData.emailAddress}` 
      });
    }
  } catch (err) {
    console.error("Resend code error:", err);

    if (err && typeof err === "object" && "errors" in err) {
      const clerkErrors = (err as { errors: ClerkError[] }).errors;
      if (clerkErrors?.length) {
        setErrors({
          message: clerkErrors[0].message || "Failed to resend verification code",
          code: clerkErrors[0].code,
        });
      } else {
        setErrors({ message: "Failed to resend verification code" });
      }
    } else {
      setErrors({ message: "Failed to resend verification code" });
    }
  } finally {
    setIsLoading(false);
  }
};

    const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!isLoaded || !signIn) return;

        if (formData.password !== formData.confirmPassword) {
            setErrors({ message: "Passwords do not match" });
            return;
        }

        if (formData.password.length < 8) {
            setErrors({ message: "Password must be at least 8 characters long" });
            return;
        }

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
        setSuccess(null);

        try {
            const result = await signIn.resetPassword({
                password: formData.password,
            });

            if (result.status === "complete") {
                await setActive({ session: result.createdSessionId });
                setSuccess({ message: "Password reset successful! Redirecting..." });

                setTimeout(() => {
                    router.push("/blog");
                }, 2000);
            }
        } catch (err) {
            console.error("Password reset error:", err);

            if (err && typeof err === "object" && "errors" in err) {
                const clerkErrors = (err as { errors: ClerkError[] }).errors;
                if (clerkErrors?.length) {
                    setErrors({
                        message: clerkErrors[0].message || "An error occurred while resetting password",
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

    const getFormContent = () => {
        switch (step) {
            case 'request':
                return {
                    title: "Forgot Password?",
                    subtitle: "Enter your email address and we'll send you a reset code",
                    form: (
                        <form onSubmit={handleRequestReset} className="flex flex-col gap-4">
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
                                    placeholder="Enter your email address"
                                    required
                                />
                            </div>

                            <button
                                ref={el => { buttonRefs.current[0] = el; }}
                                type="submit"
                                onMouseEnter={handleButtonHover}
                                onMouseLeave={handleButtonLeave}
                                className="w-full py-3 sm:py-3.5 px-4 bg-[#EF3866] text-white border-none rounded-lg text-sm sm:text-base font-semibold cursor-pointer transition-colors hover:bg-[#D53059] disabled:opacity-60 disabled:cursor-not-allowed h-11 sm:h-12"
                                disabled={isLoading}
                                style={{ transform: 'translateY(20px)', opacity: 0 }}
                            >
                                {isLoading ? "Sending..." : "Send Reset Code"}
                            </button>
                        </form>
                    )
                };

            case 'verify':
                return {
                    title: "Enter Verification Code",
                    subtitle: "We've sent a 6-digit code to your email address",
                    form: (
                        <form onSubmit={handleVerifyCode} className="flex flex-col gap-4">
                            <div ref={el => { inputRefs.current[0] = el; }} className="flex flex-col gap-2">
                                <label className="text-sm sm:text-base font-medium leading-tight text-gray-700 font-sora text-center">
                                    Verification Code
                                </label>
                                <div className="flex justify-center gap-2 mt-2">
                                    {Array(6)
                                        .fill(0)
                                        .map((_, i) => (
                                            <input
                                                key={i}
                                                type="text"
                                                inputMode="numeric"
                                                maxLength={1}
                                                className="w-12 h-12 sm:w-14 sm:h-14 text-center text-xl sm:text-2xl font-semibold text-gray-800 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#EF3866] transition-all placeholder-transparent"
                                                value={formData.code[i] || ''}
                                                onFocus={handleInputFocus}
                                                onBlur={handleInputBlur}
                                                placeholder="0"
                                                onChange={(e) => {
                                                    const newValue = e.target.value;

                                                    // Only allow numbers
                                                    if (newValue && !/^\d$/.test(newValue)) {
                                                        return;
                                                    }

                                                    const newCode = formData.code.split('');

                                                    // Ensure array has 6 elements
                                                    while (newCode.length < 6) {
                                                        newCode.push('');
                                                    }

                                                    newCode[i] = newValue;
                                                    const updatedCode = newCode.join('');

                                                    setFormData({
                                                        ...formData,
                                                        code: updatedCode
                                                    });

                                                    // Auto-focus next input if value entered
                                                    if (newValue && i < 5) {
                                                        const nextInput = (e.target as HTMLInputElement).parentElement?.children[i + 1] as HTMLInputElement;
                                                        if (nextInput) {
                                                            nextInput.focus();
                                                        }
                                                    }
                                                }}
                                                onKeyDown={(e) => {
                                                    // Handle backspace to go to previous input
                                                    if (e.key === 'Backspace' && !formData.code[i] && i > 0) {
                                                        const prevInput = (e.target as HTMLInputElement).parentElement?.children[i - 1] as HTMLInputElement;
                                                        if (prevInput) {
                                                            prevInput.focus();
                                                        }
                                                    }
                                                }}
                                                onPaste={(e) => {
                                                    e.preventDefault();
                                                    const pastedData = e.clipboardData.getData('text');
                                                    const digits = pastedData.replace(/\D/g, '').slice(0, 6);

                                                    setFormData({
                                                        ...formData,
                                                        code: digits
                                                    });

                                                    // Focus the next empty input or the last one
                                                    const nextEmptyIndex = Math.min(digits.length, 5);
                                                    const targetInput = (e.target as HTMLInputElement).parentElement?.children[nextEmptyIndex] as HTMLInputElement;
                                                    if (targetInput) {
                                                        targetInput.focus();
                                                    }
                                                }}
                                            />
                                        ))}
                                </div>
                            </div>

                            <div className="text-center mb-4">
                                <button
                                    type="button"
                                    onClick={handleResendCode}
                                    onMouseEnter={handleButtonHover}
                                    onMouseLeave={handleButtonLeave}
                                    className="text-[#EF3866] hover:underline text-sm font-medium bg-none border-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                                    disabled={isLoading}
                                >
                                    {isLoading ? "Sending..." : "Resend Code"}
                                </button>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    ref={el => { buttonRefs.current[1] = el; }}
                                    type="button"
                                    onClick={() => setStep('request')}
                                    onMouseEnter={handleButtonHover}
                                    onMouseLeave={handleButtonLeave}
                                    className="w-full py-3 sm:py-3.5 px-4 bg-gray-100 text-gray-700 border-none rounded-lg text-sm sm:text-base font-semibold cursor-pointer transition-colors hover:bg-gray-200"
                                >
                                    Back
                                </button>
                                <button
                                    ref={el => { buttonRefs.current[0] = el; }}
                                    type="submit"
                                    onMouseEnter={handleButtonHover}
                                    onMouseLeave={handleButtonLeave}
                                    className="w-full py-3 sm:py-3.5 px-4 bg-[#EF3866] text-white border-none rounded-lg text-sm sm:text-base font-semibold cursor-pointer transition-colors hover:bg-[#D53059] disabled:opacity-60 disabled:cursor-not-allowed h-11 sm:h-12"
                                    disabled={isLoading || formData.code.length < 6}
                                >
                                    {isLoading ? "Verifying..." : "Verify Code"}
                                </button>
                            </div>
                        </form>
                    )
                };
            case 'reset':
                return {
                    title: "Set New Password",
                    subtitle: "Choose a strong password for your account",
                    form: (
                        <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
                            <div ref={el => { inputRefs.current[0] = el; }} className="flex flex-col gap-2">
                                <label htmlFor="password" className="text-sm sm:text-base font-medium leading-tight text-gray-700 font-sora">
                                    New Password
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
                                    placeholder="Enter new password"
                                    minLength={8}
                                    required
                                />
                            </div>

                            <div ref={el => { inputRefs.current[1] = el; }} className="flex flex-col gap-2">
                                <label htmlFor="confirmPassword" className="text-sm sm:text-base font-medium leading-tight text-gray-700 font-sora">
                                    Confirm Password
                                </label>
                                <input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type="password"
                                    value={formData.confirmPassword}
                                    onChange={handleInputChange}
                                    onFocus={handleInputFocus}
                                    onBlur={handleInputBlur}
                                    className="text-gray-700 p-3 border border-gray-200 w-full h-10 sm:h-11 rounded-lg text-sm sm:text-base font-normal transition-colors focus:outline-none focus:border-[#EF3866] bg-white"
                                    placeholder="Confirm new password"
                                    minLength={8}
                                    required
                                />
                            </div>

                            {/* Captcha placeholder */}
                            <div id="clerk-captcha" className="flex justify-center my-4"></div>

                            <button
                                ref={el => { buttonRefs.current[0] = el; }}
                                type="submit"
                                onMouseEnter={handleButtonHover}
                                onMouseLeave={handleButtonLeave}
                                className="w-full py-3 sm:py-3.5 px-4 bg-[#EF3866] text-white border-none rounded-lg text-sm sm:text-base font-semibold cursor-pointer transition-colors hover:bg-[#D53059] disabled:opacity-60 disabled:cursor-not-allowed h-11 sm:h-12"
                                disabled={isLoading}
                            >
                                {isLoading ? "Updating..." : "Update Password"}
                            </button>
                        </form>
                    )
                };

            default:
                return null;
        }
    };

    const currentContent = getFormContent();

    return (
        <div ref={containerRef} className="min-h-screen bg-white flex flex-col lg:flex-row">
            {/* Left side - Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-6 lg:p-8">
                <div ref={formRef} className="w-full max-w-md bg-white rounded-2xl p-6 sm:p-8 my-4 sm:my-8" style={{ opacity: 0 }}>
                    <div className="text-center mb-6">
                        <div ref={logoRef} style={{ transform: 'scale(0) rotate(-180deg)' }}>
                            <Image src={"/img/logo.png"} alt="logo" width={100} height={100} className="mx-auto" />
                        </div>
                        <h1 ref={titleRef} className="text-xl sm:text-2xl font-bold leading-tight text-gray-600 mb-2 font-sora" style={{ transform: 'translateY(30px)', opacity: 0 }}>
                            {currentContent?.title}
                        </h1>
                        <p ref={subtitleRef} className="text-sm font-normal text-[#848484] font-sora" style={{ transform: 'translateY(30px)', opacity: 0 }}>
                            {currentContent?.subtitle}
                        </p>
                    </div>

                    {currentContent?.form}

                    {errors?.message && (
                        <div data-error className="text-red-600 text-sm text-center py-2 px-4 bg-red-50 rounded border border-red-200 mt-4">
                            {errors.message}
                        </div>
                    )}

                    {success?.message && (
                        <div data-success className="text-green-600 text-sm text-center py-2 px-4 bg-green-50 rounded border border-green-200 mt-4">
                            {success.message}
                        </div>
                    )}

                    <div className="text-center text-xs sm:text-sm mt-6">
                        <p className="text-gray-600">
                            Remember your password?{" "}
                            <Link href="/authentication/sign-in" className="text-[#EF3866] hover:underline">Sign in</Link>
                        </p>
                    </div>
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
                                className={`w-5 h-2 rounded-full border-none cursor-pointer transition-colors duration-300 ${index === currentSlide ? 'bg-white' : 'bg-white/50'
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