// components/ProtectedRoute.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppContext } from "@/context/AppContext"; // adjust path if needed

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user } = useAppContext();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push("/sign-in"); // change this path if your sign-in page is different
    }
  }, [user, router]);

  if (!user) return null; // prevents flicker while redirecting

  return <>{children}</>;
}
