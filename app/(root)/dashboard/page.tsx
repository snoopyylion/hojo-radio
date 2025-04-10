"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { XataClient } from "@/../../src/xata";

const xata = new XataClient();

export default function Dashboard() {
  const { user, isLoaded } = useUser();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchRole = async () => {
      if (!user) return;

      const xataUser = await xata.db.users.filter({ clerkId: user.id }).getFirst();
      setRole(xataUser?.role || "unknown");
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
