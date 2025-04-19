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

type Post = {
  _id: string;
  title: string;
  content: string;
  authorName: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  publishedAt?: string;
  createdAt: string;
};

export default function AdminDashboardPage() {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokeLoadingId, setRevokeLoadingId] = useState<string | null>(null);
  const [activePostTab, setActivePostTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);

  // Filter posts by status
  const pendingPosts = allPosts.filter(post => post.status === 'pending');
  const approvedPosts = allPosts.filter(post => post.status === 'approved');
  const rejectedPosts = allPosts.filter(post => post.status === 'rejected');

  useEffect(() => {
    // Check for system preference or saved preference
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      document.documentElement.classList.add('dark');
      setDarkMode(true);
    } else {
      document.documentElement.classList.remove('dark');
      setDarkMode(false);
    }
  }, []);


  const fetchPendingAuthors = async () => {
    try {
      const res = await fetch("/api/authors/pending-authors");
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
        setAuthors(data.authors);
      } else {
        console.error("Failed to fetch authors:", data.error);
      }
    } catch (err) {
      console.error("Error fetching authors:", err);
    }
  };

  const fetchAllPosts = async () => {
    try {
      const res = await fetch("/api/post/admin");
      const data = await res.json();
      if (res.ok) {
        setAllPosts(data.posts || []);
      } else {
        console.error("Failed to fetch posts:", data.error);
      }
    } catch (err) {
      console.error("Error fetching posts:", err);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchPendingAuthors();
      await fetchAuthors();
      await fetchAllPosts();
      setLoading(false);
    };

    loadData();
  }, []);

  const handleApprove = async (userId: string) => {
    const res = await fetch("/api/authors/approve-author", {
      method: "POST",
      body: JSON.stringify({ userId }),
      headers: { "Content-Type": "application/json" },
    });

    if (res.ok) {
      setPendingUsers(prev => prev.filter(user => user.id !== userId));
      await fetchAuthors();
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
      const res = await fetch("/api/authors/revoke-author", {
        method: "POST",
        body: JSON.stringify({ userId }),
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        await fetchAuthors();
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

  const handleDeletePost = async (postId: string) => {
    try {
      const res = await fetch("/api/post/admin/delete-post", {
        method: "POST",
        body: JSON.stringify({ postId }),
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        setAllPosts((prev) => prev.filter((post) => post._id !== postId));
      } else {
        const data = await res.json();
        console.error("Failed to delete post:", data.error);
      }
    } catch (err) {
      console.error("Error deleting post:", err);
    }
  };

  const handleApprovePost = async (postId: string) => {
    try {
      const res = await fetch("/api/post/admin/approve-post", {
        method: "POST",
        body: JSON.stringify({ postId }),
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        await fetchAllPosts();
      } else {
        const data = await res.json();
        console.error("Failed to approve post:", data.error);
      }
    } catch (err) {
      console.error("Error approving post:", err);
    }
  };

  const openRejectModal = (postId: string) => {
    setSelectedPostId(postId);
    setRejectionReason("");
    setShowRejectModal(true);
  };

  const handleRejectPost = async () => {
    if (!selectedPostId) return;
    
    try {
      const res = await fetch("/api/post/admin/reject-post", {
        method: "POST",
        body: JSON.stringify({ 
          postId: selectedPostId,
          rejectionReason 
        }),
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        setShowRejectModal(false);
        await fetchAllPosts();
      } else {
        const data = await res.json();
        console.error("Failed to reject post:", data.error);
      }
    } catch (err) {
      console.error("Error rejecting post:", err);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Function to render the appropriate post list based on active tab
  const renderPostList = () => {
    let currentPosts;
    
    switch (activePostTab) {
      case 'pending':
        currentPosts = pendingPosts;
        break;
      case 'approved':
        currentPosts = approvedPosts;
        break;
      case 'rejected':
        currentPosts = rejectedPosts;
        break;
      default:
        currentPosts = pendingPosts;
    }

    if (currentPosts.length === 0) {
      return <p className="text-gray-500 dark:text-gray-400 italic">No {activePostTab} posts available.</p>;
    }

    return (
      <ul className="space-y-4">
        {currentPosts.map((post) => (
          <li key={post._id} className="border border-gray-200 dark:border-gray-700 p-4 rounded space-y-3 bg-white dark:bg-gray-800 transition-colors">
            <div className="space-y-2">
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{post.title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {post.content ? (post.content.slice(0, 150) + "...") : "No content available"}
              </p>
              <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                <p>By: {post.authorName}</p>
                <p>Created: {formatDate(post.createdAt)}</p>
              </div>
              {post.status === 'rejected' && post.rejectionReason && (
                <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                  <p className="text-sm text-red-600 dark:text-red-400">
                    <span className="font-medium">Rejection reason: </span> 
                    {post.rejectionReason}
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              {activePostTab === 'pending' && (
                <>
                  <button
                    onClick={() => handleApprovePost(post._id)}
                    className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => openRejectModal(post._id)}
                    className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
                  >
                    Reject
                  </button>
                </>
              )}
              <button
                onClick={() => handleDeletePost(post._id)}
                className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="p-6 pt-[150px] space-y-10 bg-gray-50 dark:bg-gray-900 min-h-screen text-gray-900 dark:text-white transition-colors duration-300">
      {/* Header with Theme Toggle */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      </div>

      {/* Pending Author Requests */}
      <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
        <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Pending Author Requests</h1>
        {loading ? (
          <p className="text-gray-600 dark:text-gray-300">Loading...</p>
        ) : pendingUsers.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-300">No pending requests.</p>
        ) : (
          <ul className="space-y-2">
            {pendingUsers.map((user) => (
              <li
                key={user.id}
                className="flex items-center justify-between border border-gray-200 dark:border-gray-700 p-2 rounded bg-gray-50 dark:bg-gray-700 transition-colors"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{user.email}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Role: {user.role}</p>
                </div>
                <button
                  onClick={() => handleApprove(user.id)}
                  className="bg-green-500 text-white px-4 py-1 rounded hover:bg-green-600 transition-colors"
                >
                  Approve
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Current Authors List */}
      <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Current Authors</h2>
        {loading ? (
          <p className="text-gray-600 dark:text-gray-300">Loading...</p>
        ) : authors.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-300">No authors found.</p>
        ) : (
          <ul className="space-y-4">
            {authors.map((author) => (
              <li
                key={author._id}
                className="flex items-center justify-between border border-gray-200 dark:border-gray-700 p-4 rounded bg-gray-50 dark:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-4">
                  {author.image?.asset?.url && (
                    <Image
                      src={author.image.asset.url}
                      alt={author.name}
                      className="w-12 h-12 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                      width={48}
                      height={48}
                    />
                  )}
                  <span className="font-medium text-gray-900 dark:text-white">{author.name}</span>
                </div>
                <button
                  onClick={() => handleRevoke(author.userId)}
                  disabled={revokeLoadingId === author.userId}
                  className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 transition-colors"
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

      {/* Post Evaluation Section with Tabs */}
      <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Post Management</h2>
        
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-4">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActivePostTab('pending')}
              className={`py-2 px-4 border-b-2 font-medium text-sm transition-colors ${
                activePostTab === 'pending'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              Pending ({pendingPosts.length})
            </button>
            <button
              onClick={() => setActivePostTab('approved')}
              className={`py-2 px-4 border-b-2 font-medium text-sm transition-colors ${
                activePostTab === 'approved'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              Approved ({approvedPosts.length})
            </button>
            <button
              onClick={() => setActivePostTab('rejected')}
              className={`py-2 px-4 border-b-2 font-medium text-sm transition-colors ${
                activePostTab === 'rejected'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              Rejected ({rejectedPosts.length})
            </button>
          </nav>
        </div>
        
        {/* Post List Content */}
        {loading ? (
          <p className="text-gray-600 dark:text-gray-300">Loading...</p>
        ) : (
          renderPostList()
        )}
      </section>

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md border border-gray-200 dark:border-gray-700 transition-colors">
            <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">Reject Post</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Rejection Reason
              </label>
              <textarea
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 h-24 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter reason for rejection..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectPost}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}