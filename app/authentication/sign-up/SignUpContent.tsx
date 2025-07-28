"use client";

import { useEffect, useRef, useState } from "react";
import AuthLayout from "./../../../components/auth/AuthLayout";
import { useAuthRedirect } from "@/hooks/auth/useAuthRedirect";
import SignUpForm from "./SignUpForm";
import VerificationModal from "./VerificationModal";
import Image from "next/image";
import { gsap } from "gsap";

export default function SignUpContent() {
  const { clearPendingAuthState } = useAuthRedirect(); // Get the clear function
  useAuthRedirect(); // Redirects if already signed in

  const [showVerification, setShowVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");

  const logoRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);

  // Clear any pending authentication state when page loads
  useEffect(() => {
    clearPendingAuthState();
  }, [clearPendingAuthState]);


  const handleVerificationNeeded = (email: string) => {
    setVerificationEmail(email);
    setShowVerification(true);
  };

  const handleCloseVerification = () => {
    setShowVerification(false);
    setVerificationEmail("");
  };
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
    <>
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
            <h1 ref={titleRef} className="text-xl sm:text-2xl font-bold leading-tight text-gray-600 mb-2 font-sora">
              Create an account
            </h1>
            <p ref={subtitleRef} className="text-sm font-normal text-[#848484] font-sora">
              Join the HOJO community!
            </p>
          </div>
          <SignUpForm onVerificationNeeded={handleVerificationNeeded} />
        </div>
      </AuthLayout>
        <VerificationModal
          isOpen={showVerification}
          onClose={handleCloseVerification}
          email={verificationEmail}
        />
    </>
  );
}