"use client";

import { Suspense } from "react";
import { SignInContent } from "./SignInContent";
import LoadingSpinner from "../../../components/auth/LoadingSpinner";

// Loading fallback component
function SignInLoading() {
  return (
    <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center transition-colors duration-200">
      <LoadingSpinner />
    </div>
  );
}

// Main Sign-In Page Component
export default function SignInPage() {
  return (
    <Suspense fallback={<SignInLoading />}>
      <SignInContent />
    </Suspense>
  );
}