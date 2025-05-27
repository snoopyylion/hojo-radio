"use client";

import { Suspense } from "react";
import { SignInContent } from "./SignInContent";
import  LoadingSpinner  from "../../../components/auth/LoadingSpinner";

// Loading fallback component
function SignInLoading() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
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