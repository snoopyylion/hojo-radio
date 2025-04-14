"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type PendingUser = {
  id: string;
  email: string;
  role: string;
  author_request: boolean;
};

type Author = {
  _id: string;
  name: string;
  userId: string;
  image?: {
    asset?: {
      url: string;
    };
  };
};

export default function AdminDashboardPage() {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokeLoadingId, setRevokeLoadingId] = useState<string | null>(null);

  const fetchPendingAuthors = async () => {
    try {
      const res = await fetch("/api/pending-authors");
      const data = await res.json();
      if (res.ok) {
        setPendingUsers(data.users);
      } else {
        console.error("Failed to fetch pending users:", data.error);
      }
    } catch (err) {
      console.error("Error fetching pending users:", err);
    }
  };

  const fetchAuthors = async () => {
    try {
      const res = await fetch("/api/authors");
      const data = await res.json();
      if (res.ok) {
        console.log("Fetched authors:", data.authors); // Debug
        setAuthors(data.authors);
      } else {
        console.error("Failed to fetch authors:", data.error);
      }
    } catch (err) {
      console.error("Error fetching authors:", err);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchPendingAuthors();
      await fetchAuthors();
      setLoading(false);
    };

    loadData();
  }, []);

  const handleApprove = async (userId: string) => {
    const res = await fetch("/api/approve-author", {
      method: "POST",
      body: JSON.stringify({ userId }),
      headers: { "Content-Type": "application/json" },
    });

    if (res.ok) {
      setPendingUsers(prev => prev.filter(user => user.id !== userId));
      await fetchAuthors(); // refresh authors list
    } else {
      const data = await res.json();
      console.error("Approval failed:", data.error);
    }
  };

  const handleRevoke = async (userId: string | undefined) => {
    if (!userId) {
      console.error("Missing userId when trying to revoke");
      return;
    }

    setRevokeLoadingId(userId);

    try {
      const res = await fetch("/api/revoke-author", {
        method: "POST",
        body: JSON.stringify({ userId }),
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        await fetchAuthors(); // refresh authors list
      } else {
        const data = await res.json();
        console.error("Revoke failed:", data.error);
      }
    } catch (err) {
      console.error("Error revoking author:", err);
    } finally {
      setRevokeLoadingId(null);
    }
  };

  return (
    <div className="p-6 space-y-8">
      {/* Pending Author Requests */}
      <section>
        <h1 className="text-2xl font-bold mb-4">Pending Author Requests</h1>
        {loading ? (
          <p>Loading...</p>
        ) : pendingUsers.length === 0 ? (
          <p>No pending requests.</p>
        ) : (
          <ul className="space-y-2">
            {pendingUsers.map((user) => (
              <li key={user.id} className="flex items-center justify-between border p-2 rounded">
                <div>
                  <p className="font-medium">{user.email}</p>
                  <p className="text-sm text-gray-600">Role: {user.role}</p>
                </div>
                <button
                  onClick={() => handleApprove(user.id)}
                  className="bg-green-500 text-white px-4 py-1 rounded hover:bg-green-600"
                >
                  Approve
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Current Authors List */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Current Authors</h2>
        {loading ? (
          <p>Loading...</p>
        ) : authors.length === 0 ? (
          <p>No authors found.</p>
        ) : (
          <ul className="space-y-4">
            {authors.map((author) => (
              <li
                key={author._id}
                className="flex items-center justify-between border p-4 rounded"
              >
                <div className="flex items-center gap-4">
                  {author.image?.asset?.url && (
                    <Image
                      src={author.image.asset.url}
                      alt={author.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  )}
                  <span className="font-medium">{author.name}</span>
                </div>
                <button
                  onClick={() => handleRevoke(author.userId)}
                  disabled={revokeLoadingId === author.userId}
                  className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                >
                  {!author.userId
                    ? "Invalid user"
                    : revokeLoadingId === author.userId
                    ? "Revoking..."
                    : "Revoke"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
