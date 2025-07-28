"use client";

import { Suspense } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import LoadingSpinner from "@/components/auth/LoadingSpinner";
import SignUpContent from "./SignUpContent";

export default function SignUpPage() {
  const { isSignedIn } = useUser();
  const router = useRouter();

  // Router is used in useEffect dependency array

  useEffect(() => {
    if (isSignedIn) {
      // Redirect directly instead of going through oauth-callback
      router.replace("/blog");
    }
  }, [isSignedIn, router]);

  return (
    <Suspense fallback={<LoadingSpinner size="lg" />}>
        <SignUpContent />
    </Suspense>
  );
}