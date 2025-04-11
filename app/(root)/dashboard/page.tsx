"use client";

import { useEffect, useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { supabase } from "@/lib/supabaseClient";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function Dashboard() {
  const { user, token } = useAppContext();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (!user || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="animate-spin h-6 w-6 text-gray-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f2027] via-[#203a43] to-[#2c5364] px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white/10 backdrop-blur-md border border-white/20 shadow-xl rounded-2xl p-6 sm:p-8 text-white"
        >
          <h1 className="text-3xl sm:text-4xl font-bold mb-4">
            Welcome, {user.firstName} 👋
          </h1>
          <p className="text-lg sm:text-xl">
            You are currently signed in as a{" "}
            <span className="font-semibold text-teal-300">{role}</span>.
          </p>

          {role === "user" && (
            <button className="mt-6 px-4 py-2 rounded-lg bg-teal-500 text-white hover:bg-teal-400 transition">
              Request Author Access
            </button>
          )}
          {role === "author" && (
            <p className="text-teal-400 mt-4">You can now publish posts!</p>
          )}
        </motion.div>
      </div>
    </div>
  );
}
