"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase"; // adjust path if needed

export default function Dashboard() {
  const { user, isLoaded } = useUser();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchRole = async () => {
      if (!user) return;

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
    };

    if (isLoaded) {
      fetchRole();
    }
  }, [user, isLoaded]);

  if (!isLoaded || !user) return <p>Loading...</p>;

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">Welcome, {user.firstName}!</h1>
      <p>Your role is: <strong>{role}</strong></p>
    </div>
  );
}
