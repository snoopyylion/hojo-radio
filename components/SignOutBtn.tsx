"use client";

import { SignOutButton } from "@clerk/nextjs";
import { useAppContext } from "@/context/AppContext";
import { LogOut } from "lucide-react";

export default function SignOutBtn() {
  const { clearSession } = useAppContext();

  return (
    // @ts-expect-error Clerk types don't recognize `signOutCallback` yet
    <SignOutButton signOutCallback={clearSession} asChild>
      <button className="flex items-center gap-2 text-gray-400 hover:text-[#d7325a] transition">
        <LogOut size={20} />
        <span>Sign Out</span>
      </button>
    </SignOutButton>
  );
}
