"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Users, Mic2, FileText, CheckCircle, XCircle, Clock,
  Trash2, Check, X, Loader2, Crown,
  AlertCircle, RefreshCw, User,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type PendingUser = {
  id: string;
  email: string;
  role: string;
  author_request: boolean;
  first_name?: string;
  last_name?: string;
  username?: string;
  image_url?: string;
};

type Author = {
  _id: string;
  name: string;
  userId: string;
  image?: { asset?: { url: string } };
};

type Post = {
  _id: string;
  title: string;
  content: string;
  authorName: string;
  status: "pending" | "approved" | "rejected";
  rejectionReason?: string;
  publishedAt?: string;
  createdAt: string;
};

// ─── Shared primitives ────────────────────────────────────────────────────────
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`border border-black/10 dark:border-white/10 rounded-2xl bg-white dark:bg-black overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, count, onRefresh }: {
  icon: LucideIcon;
  title: string;
  count?: number;
  onRefresh?: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-black/5 dark:border-white/5">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 bg-[#EF3866]/10 rounded-xl flex items-center justify-center">
          <Icon className="w-4 h-4 text-[#EF3866]" />
        </div>
        <h2 className="font-sora font-semibold text-sm text-black dark:text-white">{title}</h2>
        {count !== undefined && (
          <span className="font-sora text-[10px] font-bold px-2 py-0.5 bg-[#EF3866]/10 text-[#EF3866] rounded-full">
            {count}
          </span>
        )}
      </div>
      {onRefresh && (
        <button onClick={onRefresh} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
          <RefreshCw className="w-3.5 h-3.5 text-black/40 dark:text-white/40" />
        </button>
      )}
    </div>
  );
}

function Avatar({ src, name, size = 36 }: { src?: string; name: string; size?: number }) {
  if (src) {
    return (
      <Image
        src={src} alt={name} width={size} height={size}
        className="rounded-xl object-cover border border-black/8 dark:border-white/8 shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="bg-[#EF3866]/10 rounded-xl flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <User className="text-[#EF3866]" style={{ width: size * 0.45, height: size * 0.45 }} />
    </div>
  );
}

function EmptyState({ icon: Icon, message }: { icon: LucideIcon; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-12 h-12 bg-black/5 dark:bg-white/5 rounded-2xl flex items-center justify-center mb-3">
        <Icon className="w-5 h-5 text-black/20 dark:text-white/20" />
      </div>
      <p className="font-sora text-sm font-medium text-black/35 dark:text-white/35">{message}</p>
    </div>
  );
}

function StatCard({ icon: Icon, value, label, color }: {
  icon: LucideIcon; value: number; label: string; color: string;
}) {
  return (
    <Card className="p-4">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="font-sora text-2xl font-bold text-black dark:text-white tabular-nums">{value}</p>
      <p className="font-sora text-xs text-black/40 dark:text-white/40 mt-0.5">{label}</p>
    </Card>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function AdminDashboardPage() {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokeLoadingId, setRevokeLoadingId] = useState<string | null>(null);
  const [approveLoadingId, setApproveLoadingId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<"requests" | "authors" | "posts">("requests");
  const [activePostTab, setActivePostTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  const pendingPosts  = allPosts.filter(p => p.status === "pending");
  const approvedPosts = allPosts.filter(p => p.status === "approved");
  const rejectedPosts = allPosts.filter(p => p.status === "rejected");

  const formatName = (user: PendingUser) => {
    const full = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
    return full || user.username || user.email;
  };

  const formatDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "N/A";

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchPendingAuthors(), fetchAuthors(), fetchAllPosts()]);
    setLoading(false);
  };

  const fetchPendingAuthors = async () => {
    try {
      const res = await fetch("/api/authors/pending-authors");
      const data = await res.json();
      if (res.ok) setPendingUsers(data.users);
    } catch (e) { console.error(e); }
  };

  const fetchAuthors = async () => {
    try {
      const res = await fetch("/api/authors");
      const data = await res.json();
      if (res.ok) setAuthors(data.authors);
    } catch (e) { console.error(e); }
  };

  const fetchAllPosts = async () => {
    try {
      const res = await fetch("/api/post/admin");
      const data = await res.json();
      if (res.ok) setAllPosts(data.posts || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleApprove = async (userId: string) => {
    setApproveLoadingId(userId);
    try {
      const res = await fetch("/api/authors/approve-author", {
        method: "POST",
        body: JSON.stringify({ userId }),
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        setPendingUsers(prev => prev.filter(u => u.id !== userId));
        await fetchAuthors();
      }
    } finally { setApproveLoadingId(null); }
  };

  const handleRevoke = async (userId?: string) => {
    if (!userId) return;
    setRevokeLoadingId(userId);
    try {
      const res = await fetch("/api/authors/revoke-author", {
        method: "POST",
        body: JSON.stringify({ userId }),
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) await fetchAuthors();
    } finally { setRevokeLoadingId(null); }
  };

  const handleDeletePost = async (postId: string) => {
    const res = await fetch("/api/post/admin/delete-post", {
      method: "POST", body: JSON.stringify({ postId }),
      headers: { "Content-Type": "application/json" },
    });
    if (res.ok) setAllPosts(prev => prev.filter(p => p._id !== postId));
  };

  const handleApprovePost = async (postId: string) => {
    const res = await fetch("/api/post/admin/approve-post", {
      method: "POST", body: JSON.stringify({ postId }),
      headers: { "Content-Type": "application/json" },
    });
    if (res.ok) await fetchAllPosts();
  };

  const handleRejectPost = async () => {
    if (!selectedPostId) return;
    const res = await fetch("/api/post/admin/reject-post", {
      method: "POST",
      body: JSON.stringify({ postId: selectedPostId, rejectionReason }),
      headers: { "Content-Type": "application/json" },
    });
    if (res.ok) { setShowRejectModal(false); await fetchAllPosts(); }
  };

  const currentPosts = activePostTab === "pending" ? pendingPosts : activePostTab === "approved" ? approvedPosts : rejectedPosts;

  const navItems: { id: "requests" | "authors" | "posts"; label: string; icon: LucideIcon; count: number }[] = [
    { id: "requests", label: "Author Requests", icon: Clock,    count: pendingUsers.length },
    { id: "authors",  label: "Authors",          icon: Mic2,    count: authors.length },
    { id: "posts",    label: "Posts",             icon: FileText, count: pendingPosts.length },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {/* ── Top bar ── */}
      <div className="border-b border-black/8 dark:border-white/8 px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-7 h-7 bg-[#EF3866]/10 rounded-lg flex items-center justify-center">
                <Crown className="w-3.5 h-3.5 text-[#EF3866]" />
              </div>
              <h1 className="font-sora text-2xl font-bold text-black dark:text-white">Admin Dashboard</h1>
            </div>
            <p className="font-sora text-xs text-black/40 dark:text-white/40">
              Manage authors, content, and platform access
            </p>
          </div>
          <button
            onClick={fetchAll}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-black/10 dark:border-white/10 rounded-xl font-sora text-xs font-medium text-black/60 dark:text-white/60 hover:border-black/20 dark:hover:border-white/20 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── Stats row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <StatCard icon={Clock}       value={pendingUsers.length}   label="Pending Requests" color="bg-amber-500/10 text-amber-600" />
          <StatCard icon={Mic2}        value={authors.length}        label="Active Authors"   color="bg-emerald-500/10 text-emerald-600" />
          <StatCard icon={FileText}    value={pendingPosts.length}   label="Posts to Review"  color="bg-blue-500/10 text-blue-600" />
          <StatCard icon={CheckCircle} value={approvedPosts.length}  label="Published Posts"  color="bg-[#EF3866]/10 text-[#EF3866]" />
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* ── Sidebar nav ── */}
          <aside className="lg:w-52 shrink-0">
            <Card>
              <nav>
                {navItems.map(({ id, label, icon: Icon, count }, i) => (
                  <button
                    key={id}
                    onClick={() => setActiveSection(id)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 transition-colors text-left ${
                      i < navItems.length - 1 ? "border-b border-black/5 dark:border-white/5" : ""
                    } ${
                      activeSection === id
                        ? "bg-[#EF3866]/5 text-[#EF3866]"
                        : "text-black/60 dark:text-white/60 hover:bg-black/2 dark:hover:bg-white/2"
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="font-sora text-sm font-medium flex-1">{label}</span>
                    {count > 0 && (
                      <span className={`font-sora text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        activeSection === id ? "bg-[#EF3866]/15 text-[#EF3866]" : "bg-black/8 dark:bg-white/8 text-black/50 dark:text-white/50"
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </Card>
          </aside>

          {/* ── Content ── */}
          <main className="flex-1 min-w-0">

            {/* ── AUTHOR REQUESTS ── */}
            {activeSection === "requests" && (
              <Card>
                <SectionHeader icon={Clock} title="Pending Author Requests" count={pendingUsers.length} onRefresh={fetchPendingAuthors} />
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-5 h-5 text-[#EF3866] animate-spin" />
                  </div>
                ) : pendingUsers.length === 0 ? (
                  <EmptyState icon={CheckCircle} message="No pending requests" />
                ) : (
                  <div className="divide-y divide-black/5 dark:divide-white/5">
                    {pendingUsers.map(user => (
                      <div key={user.id} className="flex items-center justify-between px-5 py-4 gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar src={user.image_url} name={formatName(user)} size={38} />
                          <div className="min-w-0">
                            <p className="font-sora text-sm font-semibold text-black dark:text-white truncate">{formatName(user)}</p>
                            <p className="font-sora text-[11px] text-black/40 dark:text-white/40 truncate">{user.email}</p>
                            <span className="font-sora text-[10px] font-medium px-2 py-0.5 bg-amber-500/10 text-amber-600 rounded-full">
                              {user.role}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleApprove(user.id)}
                          disabled={approveLoadingId === user.id}
                          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-sora text-xs font-semibold rounded-xl transition-colors shrink-0"
                        >
                          {approveLoadingId === user.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          {approveLoadingId === user.id ? "Approving…" : "Approve"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {/* ── AUTHORS ── */}
            {activeSection === "authors" && (
              <Card>
                <SectionHeader icon={Mic2} title="Current Authors" count={authors.length} onRefresh={fetchAuthors} />
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-5 h-5 text-[#EF3866] animate-spin" />
                  </div>
                ) : authors.length === 0 ? (
                  <EmptyState icon={Users} message="No authors yet" />
                ) : (
                  <div className="divide-y divide-black/5 dark:divide-white/5">
                    {authors.map(author => (
                      <div key={author._id} className="flex items-center justify-between px-5 py-4 gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar src={author.image?.asset?.url} name={author.name} size={38} />
                          <div className="min-w-0">
                            <p className="font-sora text-sm font-semibold text-black dark:text-white truncate">{author.name}</p>
                            <span className="font-sora text-[10px] font-medium px-2 py-0.5 bg-emerald-500/10 text-emerald-600 rounded-full">
                              Author
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRevoke(author.userId)}
                          disabled={revokeLoadingId === author.userId || !author.userId}
                          className="flex items-center gap-1.5 px-3.5 py-2 border border-red-500/20 text-red-500 hover:bg-red-500/8 hover:border-red-500/40 disabled:opacity-40 font-sora text-xs font-semibold rounded-xl transition-colors shrink-0"
                        >
                          {revokeLoadingId === author.userId ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <X className="w-3.5 h-3.5" />
                          )}
                          {!author.userId ? "Invalid" : revokeLoadingId === author.userId ? "Revoking…" : "Revoke"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {/* ── POSTS ── */}
            {activeSection === "posts" && (
              <Card>
                <SectionHeader icon={FileText} title="Post Management" onRefresh={fetchAllPosts} />

                {/* Post tabs */}
                <div className="flex gap-1 px-5 pt-4">
                  {(["pending", "approved", "rejected"] as const).map(tab => {
                    const counts = { pending: pendingPosts.length, approved: approvedPosts.length, rejected: rejectedPosts.length };
                    return (
                      <button
                        key={tab}
                        onClick={() => setActivePostTab(tab)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-sora text-xs font-semibold capitalize transition-all ${
                          activePostTab === tab
                            ? "bg-[#EF3866] text-white shadow-md shadow-[#EF3866]/20"
                            : "text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
                        }`}
                      >
                        {tab}
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] leading-none ${
                          activePostTab === tab ? "bg-white/20" : "bg-black/8 dark:bg-white/8"
                        }`}>
                          {counts[tab]}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="p-4 space-y-3">
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-5 h-5 text-[#EF3866] animate-spin" />
                    </div>
                  ) : currentPosts.length === 0 ? (
                    <EmptyState icon={FileText} message={`No ${activePostTab} posts`} />
                  ) : (
                    currentPosts.map(post => (
                      <div
                        key={post._id}
                        className="border border-black/8 dark:border-white/8 rounded-xl p-4 bg-black/1 dark:bg-white/1 hover:border-black/15 dark:hover:border-white/15 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h3 className="font-sora text-sm font-semibold text-black dark:text-white leading-tight">{post.title}</h3>
                          <span className={`shrink-0 font-sora text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            post.status === "approved"  ? "bg-emerald-500/10 text-emerald-600" :
                            post.status === "rejected"  ? "bg-red-500/10 text-red-500" :
                                                          "bg-amber-500/10 text-amber-600"
                          }`}>
                            {post.status}
                          </span>
                        </div>

                        <p className="font-sora text-xs text-black/50 dark:text-white/50 leading-relaxed mb-3 line-clamp-2">
                          {post.content?.slice(0, 150) ?? "No content available"}…
                        </p>

                        <div className="flex items-center justify-between text-[10px] font-sora text-black/30 dark:text-white/30 mb-3">
                          <span>By {post.authorName}</span>
                          <span>{formatDate(post.createdAt)}</span>
                        </div>

                        {post.status === "rejected" && post.rejectionReason && (
                          <div className="flex items-start gap-2 p-2.5 bg-red-500/5 border border-red-500/15 rounded-lg mb-3">
                            <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                            <p className="font-sora text-[11px] text-red-500">{post.rejectionReason}</p>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          {activePostTab === "pending" && (
                            <>
                              <button
                                onClick={() => handleApprovePost(post._id)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 font-sora text-[11px] font-semibold rounded-lg transition-colors"
                              >
                                <CheckCircle className="w-3 h-3" /> Approve
                              </button>
                              <button
                                onClick={() => { setSelectedPostId(post._id); setRejectionReason(""); setShowRejectModal(true); }}
                                className="flex items-center gap-1 px-3 py-1.5 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 font-sora text-[11px] font-semibold rounded-lg transition-colors"
                              >
                                <XCircle className="w-3 h-3" /> Reject
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleDeletePost(post._id)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-red-500/8 text-red-500 hover:bg-red-500/15 font-sora text-[11px] font-semibold rounded-lg transition-colors ml-auto"
                          >
                            <Trash2 className="w-3 h-3" /> Delete
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            )}

          </main>
        </div>
      </div>

      {/* ── Reject modal ── */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-white dark:bg-black border border-black/10 dark:border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-black/8 dark:border-white/8">
              <div className="w-8 h-8 bg-red-500/10 rounded-xl flex items-center justify-center">
                <XCircle className="w-4 h-4 text-red-500" />
              </div>
              <h3 className="font-sora font-semibold text-sm text-black dark:text-white">Reject Post</h3>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block font-sora text-[10px] font-semibold uppercase tracking-widest text-black/40 dark:text-white/40 mb-2">
                  Rejection Reason
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  placeholder="Tell the author why this post was rejected…"
                  rows={4}
                  className="w-full resize-none bg-transparent border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 font-sora text-sm text-black dark:text-white placeholder-black/25 dark:placeholder-white/25 focus:outline-none focus:border-[#EF3866] transition-colors"
                />
              </div>
              <div className="flex gap-2.5">
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="flex-1 py-2.5 border border-black/10 dark:border-white/10 rounded-xl font-sora text-sm font-medium text-black/60 dark:text-white/60 hover:border-black/20 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRejectPost}
                  className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white font-sora text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5"
                >
                  <XCircle className="w-4 h-4" /> Reject Post
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}