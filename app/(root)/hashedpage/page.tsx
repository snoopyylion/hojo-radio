"use client";

import { useEffect, useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { supabase } from "@/lib/supabaseClient";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import VerifiedList from "@/components/VerifiedList";

export default function HashedDashboardPage() {
  const { user } = useAppContext();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestSent, setRequestSent] = useState(false);

  useEffect(() => {
    const fetchRole = async () => {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error fetching user role:", error);
        setRole("unknown");
      } else {
        setRole(data?.role || "unknown");
      }

      setLoading(false);
    };

    fetchRole();
  }, [user]);

  const handleRequestAccess = async () => {
    const payload = { userId: user?.id, email: user?.email };

    try {
      const res = await fetch("/api/authors/request-author", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setRequestSent(true);
      } else {
        const errorData = await res.json();
        console.error("Error response from server:", errorData);
        alert("Failed to send request.");
      }
    } catch (error) {
      console.error("Request failed:", error);
      alert("Something went wrong.");
    }
  };

  if (!user || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="animate-spin h-6 w-6 text-gray-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f2027] via-[#203a43] to-[#2c5364] px-4 py-8 pt-[150px]">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="max-w-4xl mx-auto bg-white/10 backdrop-blur-md border border-white/20 shadow-xl rounded-2xl p-6 sm:p-8 text-white"
      >
        <h1 className="text-3xl sm:text-4xl font-bold mb-4">
          Welcome, {user.firstName} 👋
        </h1>
        <p className="text-lg sm:text-xl">
          You are currently signed in as a{" "}
          <span className="font-semibold text-teal-300">{role}</span>.
        </p>

        {role === "user" && !requestSent && (
          <button
            className="mt-6 px-4 py-2 rounded-lg bg-teal-500 text-white hover:bg-teal-400 transition"
            onClick={handleRequestAccess}
          >
            Request Author Access
          </button>
        )}

        {role === "user" && requestSent && (
          <p className="mt-6 text-teal-300 font-medium">
            ✅ Your request has been sent. We&apos;ll review it shortly.
          </p>
        )}

        {role === "author" && (
          <p className="text-teal-400 mt-4">🎉 You can now publish posts!</p>
        )}
      </motion.div>

      <VerifiedList />
    </div>
  );
}
