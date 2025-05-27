"use client";

import { Suspense } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useCallback } from "react";
import LoadingSpinner from "@/components/auth/LoadingSpinner";
import SignUpContent from "./SignUpContent";

export default function SignUpPage() {
  const { isSignedIn } = useUser();
  const router = useRouter();

  // Memoize router to avoid dependency warnings
  const memoizedRouter = useCallback(() => router, [router]);

  useEffect(() => {
    if (isSignedIn) {
      memoizedRouter().replace("/blog");
    }
  }, [isSignedIn, memoizedRouter]);

  return (
    <Suspense fallback={<LoadingSpinner size="lg" />}>
        <SignUpContent />
    </Suspense>
  );
}