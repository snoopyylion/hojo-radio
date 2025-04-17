// lib/actions/user.ts
'use server'

import { supabaseAdmin } from "@/lib/supabase/admin";

export async function getUserRole(userId: string): Promise<string> {
  if (!userId) {
    return "user";
  }

  try {
    const { data: userData, error } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("id", userId)
      .single();

    if (error || !userData) {
      console.error("Error fetching role:", error);
      return "user";
    }

    return userData.role || "user";
  } catch (err) {
    console.error("Error fetching user role:", err);
    return "user";
  }
}