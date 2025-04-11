"use client";

import { useClerk } from "@clerk/nextjs";
import { useAppContext } from "@/context/AppContext";
import { LogOut } from "lucide-react";

export default function SignOutBtn() {
  const { signOut } = useClerk(); // this gives you access to Clerk functions
  const { clearSession } = useAppContext();

  const handleSignOut = async () => {
    clearSession(); // clear local app data
    await signOut(); // Clerk sign-out
  };

  return (
    <button
      onClick={handleSignOut}
      className="flex items-center gap-2 text-gray-400 hover:text-[#d7325a] transition cursor-pointer"
    >
      <LogOut size={20} />
      <span>Sign Out</span>
    </button>
  );
}
