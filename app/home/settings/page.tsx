"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import {
  User, Bell, Palette, Lock, ChevronRight,
  Mic2, CheckCircle, Clock, Crown, ExternalLink, Loader2,
  AlertCircle, ArrowUpRight, X, ShieldCheck, Users,
  Pencil, Save, RotateCcw,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type UserProfile = {
  id: string;
  email: string;
  role: string;
  author_request: boolean;
  first_name?: string;
  last_name?: string;
  username?: string;
  image_url?: string;
  is_admin?: boolean;
  profile_completed?: boolean;
};

type PendingUser = {
  id: string;
  email: string;
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

// ─── Shared primitives ────────────────────────────────────────────────────────
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`border border-black/10 dark:border-white/10 rounded-2xl bg-white dark:bg-black overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, subtitle }: { icon: LucideIcon; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-9 h-9 bg-[#EF3866]/10 rounded-xl flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-[#EF3866]" />
      </div>
      <div>
        <h2 className="font-sora font-semibold text-sm text-black dark:text-white">{title}</h2>
        {subtitle && <p className="font-sora text-[11px] text-black/40 dark:text-white/40 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

function SettingRow({
  label, description, children, onClick,
}: {
  label: string; description?: string; children?: React.ReactNode; onClick?: () => void;
}) {
  const El = onClick ? "button" : "div";
  return (
    <El
      onClick={onClick}
      className={`w-full flex items-center justify-between px-5 py-4 border-b border-black/5 dark:border-white/5 last:border-0 transition-colors ${onClick ? "hover:bg-black/2 dark:hover:bg-white/2 cursor-pointer" : ""}`}
    >
      <div>
        <p className="font-sora text-sm font-medium text-black dark:text-white text-left">{label}</p>
        {description && <p className="font-sora text-[11px] text-black/40 dark:text-white/40 mt-0.5 text-left">{description}</p>}
      </div>
      {children ?? (onClick && <ChevronRight className="w-4 h-4 text-black/25 dark:text-white/25 shrink-0" />)}
    </El>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block font-sora text-[10px] font-semibold uppercase tracking-widest text-black/40 dark:text-white/40 mb-1.5">
      {children}
    </label>
  );
}

function TextInput({
  value, onChange, placeholder, disabled = false, type = "text",
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean; type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full bg-transparent border border-black/10 dark:border-white/10 rounded-xl px-4 py-2.5 font-sora text-sm text-black dark:text-white placeholder-black/25 dark:placeholder-white/25 focus:outline-none focus:border-[#EF3866] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    />
  );
}

function StatusBadge({ status }: { status: "author" | "pending" | "user" }) {
  const config: { label: string; cls: string; icon: LucideIcon } = {
    author:  { label: "Author",          cls: "bg-emerald-500/10 text-emerald-600",                          icon: CheckCircle },
    pending: { label: "Request Pending", cls: "bg-amber-500/10 text-amber-600",                              icon: Clock       },
    user:    { label: "Member",          cls: "bg-black/5 dark:bg-white/5 text-black/50 dark:text-white/50", icon: User        },
  }[status];
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-sora text-[10px] font-semibold ${config.cls}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function MiniAvatar({ src, name, size = 32 }: { src?: string; name: string; size?: number }) {
  if (src) {
    return (
      <Image src={src} alt={name} width={size} height={size}
        className="rounded-xl object-cover border border-black/8 dark:border-white/8 shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div className="bg-[#EF3866]/10 rounded-xl flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <User className="text-[#EF3866]" style={{ width: size * 0.4, height: size * 0.4 }} />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { userId, isLoaded } = useAuth();
  const router = useRouter();

  const [profile, setProfile]               = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [fetchError, setFetchError]         = useState<string | null>(null);
  const [activeSection, setActiveSection]   = useState("account");

  // ── Account edit state ─────────────────────────────────────────────────────
  const [editing, setEditing]             = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName]   = useState("");
  const [editUsername, setEditUsername]   = useState("");
  const [saveLoading, setSaveLoading]     = useState(false);
  const [saveError, setSaveError]         = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess]     = useState(false);

  // ── Author request state ───────────────────────────────────────────────────
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestSent, setRequestSent]       = useState(false);
  const [requestError, setRequestError]     = useState<string | null>(null);

  // ── Admin state ────────────────────────────────────────────────────────────
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [authors, setAuthors]           = useState<Author[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [approvingId, setApprovingId]   = useState<string | null>(null);
  const [revokingId, setRevokingId]     = useState<string | null>(null);

  // ── Fetch own profile from Supabase ───────────────────────────────────────
  useEffect(() => {
    if (!isLoaded || !userId) return;
    setFetchError(null);
    setProfileLoading(true);

    fetch(`/api/users/me`)
      .then(async r => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({})) as { error?: string };
          throw new Error(body.error ?? `HTTP ${r.status}`);
        }
        return r.json() as Promise<UserProfile>;
      })
      .then((data: UserProfile) => {
        setProfile(data);
        setEditFirstName(data.first_name ?? "");
        setEditLastName(data.last_name ?? "");
        setEditUsername(data.username ?? "");
        setProfileLoading(false);
      })
      .catch((err: Error) => {
        console.error("Failed to load profile:", err.message);
        setFetchError(err.message);
        setProfileLoading(false);
      });
  }, [isLoaded, userId]);

  // ── Save account info via /api/complete-profile ────────────────────────────
  const handleSaveAccount = async () => {
    if (!editFirstName.trim() || !editLastName.trim() || !editUsername.trim()) {
      setSaveError("All fields are required.");
      return;
    }
    setSaveLoading(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const res = await fetch("/api/complete-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: editUsername.trim(),
          firstName: editFirstName.trim(),
          lastName: editLastName.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error ?? "Failed to save profile.");
        return;
      }
      // Refresh local profile with saved values
      setProfile(prev => prev
        ? {
            ...prev,
            first_name: editFirstName.trim(),
            last_name: editLastName.trim(),
            username: editUsername.trim().toLowerCase(),
          }
        : prev
      );
      setSaveSuccess(true);
      setEditing(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      setSaveError("Something went wrong. Please try again.");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setSaveError(null);
    // Reset fields back to saved profile values
    setEditFirstName(profile?.first_name ?? "");
    setEditLastName(profile?.last_name ?? "");
    setEditUsername(profile?.username ?? "");
  };

  // ── Fetch admin data ───────────────────────────────────────────────────────
  const fetchAdminData = useCallback(async () => {
    setAdminLoading(true);
    try {
      const [pendingRes, authorsRes] = await Promise.all([
        fetch("/api/authors/pending-authors"),
        fetch("/api/authors"),
      ]);
      const pendingData = await pendingRes.json();
      const authorsData = await authorsRes.json();
      setPendingUsers(pendingData.users ?? []);
      setAuthors(authorsData.authors ?? []);
    } finally {
      setAdminLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeSection === "admin" && profile?.is_admin) fetchAdminData();
  }, [activeSection, profile?.is_admin, fetchAdminData]);

  // ── Author request ─────────────────────────────────────────────────────────
  const handleRequestAuthor = async () => {
    if (!profile) return;
    setRequestLoading(true);
    setRequestError(null);
    try {
      const res = await fetch("/api/authors/request-author", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: profile.id, email: profile.email }),
      });
      if (!res.ok) throw new Error("Request failed");
      setRequestSent(true);
      setProfile(prev => prev ? { ...prev, author_request: true } : prev);
    } catch {
      setRequestError("Failed to submit request. Please try again.");
    } finally {
      setRequestLoading(false);
    }
  };

  // ── Admin: approve ─────────────────────────────────────────────────────────
  const handleApprove = async (userId: string) => {
    setApprovingId(userId);
    try {
      const res = await fetch("/api/authors/approve-author", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        setPendingUsers(prev => prev.filter(u => u.id !== userId));
        await fetchAdminData();
      }
    } finally { setApprovingId(null); }
  };

  // ── Admin: revoke ──────────────────────────────────────────────────────────
  const handleRevoke = async (userId: string) => {
    setRevokingId(userId);
    try {
      const res = await fetch("/api/authors/revoke-author", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) await fetchAdminData();
    } finally { setRevokingId(null); }
  };

  // ── Derived values from DB profile (NOT Clerk) ────────────────────────────
  const displayName = profile
    ? [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.username || "User"
    : "";

  const authorStatus: "author" | "pending" | "user" =
    profile?.role === "author" ? "author" :
    (profile?.author_request || requestSent) ? "pending" : "user";

  const formatName = (u: PendingUser) =>
    [u.first_name, u.last_name].filter(Boolean).join(" ").trim() || u.username || u.email;

  const navItems: { id: string; label: string; icon: LucideIcon; adminOnly?: boolean }[] = [
    { id: "account",       label: "Account",       icon: User       },
    { id: "authorship",    label: "Authorship",     icon: Mic2       },
    { id: "notifications", label: "Notifications",  icon: Bell       },
    { id: "appearance",    label: "Appearance",     icon: Palette    },
    { id: "privacy",       label: "Privacy",        icon: Lock       },
    ...(profile?.is_admin
      ? [{ id: "admin", label: "Admin", icon: ShieldCheck, adminOnly: true }]
      : []),
  ];

  if (!isLoaded || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 text-[#EF3866] animate-spin" />
          <p className="font-sora text-xs text-black/40 dark:text-white/40">Loading your profile…</p>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black px-4">
        <div className="max-w-sm w-full border border-red-500/20 rounded-2xl bg-red-500/4 p-6 text-center">
          <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
          </div>
          <p className="font-sora text-sm font-semibold text-black dark:text-white mb-1">Could not load profile</p>
          <p className="font-sora text-xs text-red-500/80 mb-4">{fetchError}</p>
          <p className="font-sora text-[11px] text-black/40 dark:text-white/40 mb-4">
            Make sure <code className="font-mono bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded text-[10px]">app/api/users/me/route.ts</code> exists and returns your Supabase user row.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-2.5 bg-[#EF3866] hover:bg-[#d12b56] text-white font-sora text-sm font-semibold rounded-xl transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {/* ── Page header ── */}
      <div className="border-b border-black/8 dark:border-white/8 px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-5xl mx-auto">
          <h1 className="font-sora text-2xl font-bold text-black dark:text-white">Settings</h1>
          <p className="font-sora text-xs text-black/40 dark:text-white/40 mt-1">
            Manage your account, preferences, and author access
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* ── Sidebar ── */}
          <aside className="lg:w-56 shrink-0">
            {/* Profile snapshot card */}
            <Card className="mb-4 p-4">
              <div className="flex items-center gap-3">
                {profile?.image_url ? (
                  <Image
                    src={profile.image_url} alt={displayName}
                    width={40} height={40}
                    className="w-10 h-10 rounded-xl object-cover border border-black/8 dark:border-white/8"
                  />
                ) : (
                  <div className="w-10 h-10 bg-[#EF3866]/10 rounded-xl flex items-center justify-center">
                    <User className="w-5 h-5 text-[#EF3866]" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-sora text-sm font-semibold text-black dark:text-white truncate">{displayName}</p>
                  {profile?.username && (
                    <p className="font-sora text-[11px] text-black/40 dark:text-white/40 truncate">@{profile.username}</p>
                  )}
                  <div className="flex flex-wrap gap-1 mt-1">
                    <StatusBadge status={authorStatus} />
                    {profile?.is_admin && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-sora text-[10px] font-semibold bg-[#EF3866]/10 text-[#EF3866]">
                        <Crown className="w-3 h-3" /> Admin
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* Nav */}
            <Card>
              <nav>
                {navItems.map(({ id, label, icon: Icon, adminOnly }, i) => (
                  <button
                    key={id}
                    onClick={() => setActiveSection(id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left ${
                      i < navItems.length - 1 ? "border-b border-black/5 dark:border-white/5" : ""
                    } ${
                      activeSection === id
                        ? "bg-[#EF3866]/5 text-[#EF3866]"
                        : "text-black/60 dark:text-white/60 hover:bg-black/2 dark:hover:bg-white/2 hover:text-black dark:hover:text-white"
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="font-sora text-sm font-medium flex-1">{label}</span>
                    {activeSection === id && <span className="w-1.5 h-1.5 bg-[#EF3866] rounded-full shrink-0" />}
                    {adminOnly && activeSection !== id && (
                      <span className="font-sora text-[9px] font-bold px-1.5 py-0.5 bg-[#EF3866]/10 text-[#EF3866] rounded-full leading-tight">
                        ADMIN
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </Card>
          </aside>

          {/* ── Main content ── */}
          <main className="flex-1 min-w-0 space-y-6">

            {/* ── ACCOUNT ── */}
            {activeSection === "account" && (
              <Card>
                <div className="px-5 pt-5 pb-2 flex items-start justify-between">
                  <SectionHeader icon={User} title="Account" subtitle="Your personal information and login details" />
                  {!editing && (
                    <button
                      onClick={() => { setEditing(true); setSaveError(null); setSaveSuccess(false); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-black/10 dark:border-white/10 rounded-lg font-sora text-xs font-medium text-black/60 dark:text-white/60 hover:border-[#EF3866]/40 hover:text-[#EF3866] transition-colors shrink-0 mt-1"
                    >
                      <Pencil className="w-3 h-3" /> Edit
                    </button>
                  )}
                </div>

                {/* ── VIEW mode ── */}
                {!editing && (
                  <>
                    {saveSuccess && (
                      <div className="mx-5 mb-3 flex items-center gap-2 p-3 bg-emerald-500/8 border border-emerald-500/20 rounded-xl">
                        <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                        <p className="font-sora text-xs text-emerald-600">Profile updated successfully.</p>
                      </div>
                    )}
                    <SettingRow label="First Name" description={profile?.first_name || "Not set"} />
                    <SettingRow label="Last Name"  description={profile?.last_name  || "Not set"} />
                    <SettingRow label="Username"   description={profile?.username ? `@${profile.username}` : "Not set"} />
                    <SettingRow label="Email"      description={profile?.email || "Not set"}>
                      <span className="font-sora text-[11px] text-black/35 dark:text-white/35 bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-full">
                        Read-only
                      </span>
                    </SettingRow>
                    <SettingRow label="Role">
                      <span className="font-sora text-[11px] font-semibold px-2.5 py-1 bg-black/5 dark:bg-white/5 text-black/50 dark:text-white/50 rounded-full capitalize">
                        {profile?.role ?? "user"}
                      </span>
                    </SettingRow>
                    <div className="px-5 py-4 border-t border-black/5 dark:border-white/5">
                      <button className="font-sora text-xs font-semibold text-red-500 hover:text-red-600 transition-colors">
                        Delete Account
                      </button>
                    </div>
                  </>
                )}

                {/* ── EDIT mode ── */}
                {editing && (
                  <div className="px-5 pb-5 space-y-4">
                    {saveError && (
                      <div className="flex items-center gap-2 p-3 bg-red-500/8 border border-red-500/20 rounded-xl">
                        <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                        <p className="font-sora text-xs text-red-500">{saveError}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <FieldLabel>First Name *</FieldLabel>
                        <TextInput value={editFirstName} onChange={setEditFirstName} placeholder="First name" />
                      </div>
                      <div>
                        <FieldLabel>Last Name *</FieldLabel>
                        <TextInput value={editLastName} onChange={setEditLastName} placeholder="Last name" />
                      </div>
                    </div>

                    <div>
                      <FieldLabel>Username *</FieldLabel>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-sora text-sm text-black/30 dark:text-white/30 pointer-events-none">@</span>
                        <input
                          type="text"
                          value={editUsername}
                          onChange={e => setEditUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                          placeholder="yourhandle"
                          className="w-full bg-transparent border border-black/10 dark:border-white/10 rounded-xl pl-8 pr-4 py-2.5 font-sora text-sm text-black dark:text-white placeholder-black/25 dark:placeholder-white/25 focus:outline-none focus:border-[#EF3866] transition-colors"
                        />
                      </div>
                      <p className="font-sora text-[11px] text-black/30 dark:text-white/30 mt-1.5">
                        Only letters, numbers and underscores
                      </p>
                    </div>

                    <div>
                      <FieldLabel>Email</FieldLabel>
                      <TextInput value={profile?.email ?? ""} onChange={() => {}} disabled placeholder="Email" />
                      <p className="font-sora text-[11px] text-black/30 dark:text-white/30 mt-1.5">
                        Email is managed by your auth provider and cannot be changed here
                      </p>
                    </div>

                    <div className="flex gap-2.5 pt-2">
                      <button
                        onClick={handleCancelEdit}
                        disabled={saveLoading}
                        className="flex items-center gap-1.5 flex-1 justify-center py-2.5 border border-black/10 dark:border-white/10 rounded-xl font-sora text-sm font-medium text-black/60 dark:text-white/60 hover:border-black/20 transition-colors disabled:opacity-40"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Cancel
                      </button>
                      <button
                        onClick={handleSaveAccount}
                        disabled={saveLoading || !editFirstName.trim() || !editLastName.trim() || !editUsername.trim()}
                        className="flex items-center gap-1.5 flex-1 justify-center py-2.5 bg-[#EF3866] hover:bg-[#d12b56] disabled:opacity-40 text-white font-sora text-sm font-semibold rounded-xl transition-all duration-200 active:scale-[0.98] shadow-md shadow-[#EF3866]/20"
                      >
                        {saveLoading
                          ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</>
                          : <><Save className="w-3.5 h-3.5" />Save Changes</>}
                      </button>
                    </div>
                  </div>
                )}
              </Card>
            )}

            {/* ── AUTHORSHIP ── */}
            {activeSection === "authorship" && (
              <div className="space-y-4">
                <Card>
                  <div className="px-5 pt-5 pb-2">
                    <SectionHeader icon={Mic2} title="Authorship" subtitle="Write articles, publish content, and build your audience" />
                  </div>
                  <div className="px-5 pb-5">
                    {/* Status block */}
                    <div className={`flex items-start gap-4 p-4 rounded-xl border mb-4 ${
                      authorStatus === "author"  ? "border-emerald-500/25 bg-emerald-500/5"      :
                      authorStatus === "pending" ? "border-amber-500/25 bg-amber-500/5"          :
                                                   "border-black/8 dark:border-white/8 bg-black/2 dark:bg-white/2"
                    }`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        authorStatus === "author"  ? "bg-emerald-500/15" :
                        authorStatus === "pending" ? "bg-amber-500/15"   : "bg-black/8 dark:bg-white/8"
                      }`}>
                        {authorStatus === "author"  ? <CheckCircle className="w-5 h-5 text-emerald-500" /> :
                         authorStatus === "pending" ? <Clock className="w-5 h-5 text-amber-500" />        :
                                                      <Mic2 className="w-5 h-5 text-black/30 dark:text-white/30" />}
                      </div>
                      <div>
                        <p className="font-sora text-sm font-semibold text-black dark:text-white">
                          {authorStatus === "author"  ? "You're an Author"        :
                           authorStatus === "pending" ? "Request Under Review"    :
                                                        "Become an Author"}
                        </p>
                        <p className="font-sora text-xs text-black/50 dark:text-white/50 mt-0.5 leading-relaxed">
                          {authorStatus === "author"
                            ? "You can publish articles, create podcasts, and manage content."
                            : authorStatus === "pending"
                            ? "Your request is being reviewed. You'll be notified when approved."
                            : "Request access to publish articles and podcast content."}
                        </p>
                      </div>
                    </div>

                    {/* CTA */}
                    {authorStatus === "user" && (
                      <>
                        {requestError && (
                          <div className="flex items-center gap-2 p-3 bg-red-500/8 border border-red-500/20 rounded-xl mb-3">
                            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                            <p className="font-sora text-xs text-red-500">{requestError}</p>
                          </div>
                        )}
                        <button
                          onClick={handleRequestAuthor}
                          disabled={requestLoading}
                          className="w-full py-3 bg-[#EF3866] hover:bg-[#d12b56] disabled:opacity-50 text-white font-sora text-sm font-semibold rounded-xl transition-all duration-200 active:scale-[0.98] shadow-md shadow-[#EF3866]/20 flex items-center justify-center gap-2"
                        >
                          {requestLoading
                            ? <><Loader2 className="w-4 h-4 animate-spin" />Submitting…</>
                            : <><Mic2 className="w-4 h-4" />Request Author Access</>}
                        </button>
                        <p className="font-sora text-[11px] text-black/30 dark:text-white/30 text-center mt-2">
                          Typically reviewed within 24–48 hours
                        </p>
                      </>
                    )}
                    {authorStatus === "pending" && (
                      <div className="w-full py-3 border border-amber-500/25 bg-amber-500/5 text-amber-600 font-sora text-sm font-semibold rounded-xl flex items-center justify-center gap-2 cursor-default">
                        <Clock className="w-4 h-4" /> Request Under Review
                      </div>
                    )}
                    {authorStatus === "author" && (
                      <div className="w-full py-3 border border-emerald-500/25 bg-emerald-500/5 text-emerald-600 font-sora text-sm font-semibold rounded-xl flex items-center justify-center gap-2 cursor-default">
                        <CheckCircle className="w-4 h-4" /> Author Access Active
                      </div>
                    )}
                  </div>
                </Card>

                {/* Perks */}
                <Card>
                  <div className="px-5 pt-4 pb-1">
                    <p className="font-sora text-[10px] font-semibold uppercase tracking-widest text-black/35 dark:text-white/35">
                      What you get as an Author
                    </p>
                  </div>
                  {[
                    { icon: "✍️", label: "Publish Articles",    desc: "Write and publish long-form articles to your audience" },
                    { icon: "🎙️", label: "Host Live Podcasts",  desc: "Start live audio sessions and build a listener base"   },
                    { icon: "📊", label: "Analytics Dashboard", desc: "Track views, listens, and engagement on your content"  },
                    { icon: "💬", label: "Author Community",    desc: "Connect with other authors and collaborate on content" },
                  ].map(perk => (
                    <div key={perk.label} className="flex items-start gap-3 px-5 py-3.5 border-b border-black/5 dark:border-white/5 last:border-0">
                      <span className="text-lg leading-none mt-0.5">{perk.icon}</span>
                      <div>
                        <p className="font-sora text-sm font-medium text-black dark:text-white">{perk.label}</p>
                        <p className="font-sora text-[11px] text-black/40 dark:text-white/40 mt-0.5">{perk.desc}</p>
                      </div>
                    </div>
                  ))}
                </Card>
              </div>
            )}

            {/* ── NOTIFICATIONS ── */}
            {activeSection === "notifications" && (
              <Card>
                <div className="px-5 pt-5 pb-2">
                  <SectionHeader icon={Bell} title="Notifications" subtitle="Choose what you want to hear about" />
                </div>
                {[
                  { label: "New followers",           desc: "When someone follows your profile" },
                  { label: "Article comments",        desc: "When someone comments on your content" },
                  { label: "Live session reminders",  desc: "Upcoming sessions you're interested in" },
                  { label: "Author request updates",  desc: "Status changes on your author application" },
                  { label: "Platform announcements",  desc: "New features and important updates" },
                ].map((item, i) => (
                  <SettingRow key={i} label={item.label} description={item.desc}>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked={i < 3} className="sr-only peer" />
                      <div className="w-9 h-5 bg-black/10 dark:bg-white/10 rounded-full peer peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#EF3866]" />
                    </label>
                  </SettingRow>
                ))}
              </Card>
            )}

            {/* ── APPEARANCE ── */}
            {activeSection === "appearance" && (
              <Card>
                <div className="px-5 pt-5 pb-2">
                  <SectionHeader icon={Palette} title="Appearance" subtitle="Customize how the platform looks" />
                </div>
                <div className="px-5 pb-5">
                  <p className="font-sora text-[10px] font-semibold uppercase tracking-widest text-black/35 dark:text-white/35 mb-3">Theme</p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: "light", label: "Light",  textCls: "text-black", borderCls: "border-black/10",  bgCls: "bg-white"                               },
                      { id: "dark",  label: "Dark",   textCls: "text-white", borderCls: "border-white/10",  bgCls: "bg-black"                               },
                      { id: "auto",  label: "System", textCls: "text-black", borderCls: "border-black/10",  bgCls: "bg-gradient-to-br from-white to-black"   },
                    ].map(theme => (
                      <button key={theme.id} className={`flex flex-col items-center gap-2 p-3 rounded-xl border ${theme.borderCls} ${theme.bgCls} hover:border-[#EF3866]/40 transition-colors`}>
                        <div className={`w-full h-8 rounded-lg ${theme.bgCls}`} />
                        <span className={`font-sora text-xs font-medium ${theme.textCls}`}>{theme.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <SettingRow label="Reduce Motion" description="Minimize animations across the interface">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-9 h-5 bg-black/10 dark:bg-white/10 rounded-full peer peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#EF3866]" />
                  </label>
                </SettingRow>
              </Card>
            )}

            {/* ── PRIVACY ── */}
            {activeSection === "privacy" && (
              <Card>
                <div className="px-5 pt-5 pb-2">
                  <SectionHeader icon={Lock} title="Privacy & Security" subtitle="Control your data and account security" />
                </div>
                {[
                  { label: "Public profile",          desc: "Allow others to see your profile" },
                  { label: "Show in search",          desc: "Appear in platform search results" },
                  { label: "Activity visibility",     desc: "Show your recent activity to followers" },
                  { label: "Email in author profile", desc: "Display contact email on your author page" },
                ].map((item, i) => (
                  <SettingRow key={i} label={item.label} description={item.desc}>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked={i < 2} className="sr-only peer" />
                      <div className="w-9 h-5 bg-black/10 dark:bg-white/10 rounded-full peer peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#EF3866]" />
                    </label>
                  </SettingRow>
                ))}
                <div className="px-5 py-4 border-t border-black/5 dark:border-white/5 space-y-2">
                  <button className="w-full flex items-center justify-between py-2.5 px-3 border border-black/8 dark:border-white/8 rounded-xl hover:border-black/15 dark:hover:border-white/15 transition-colors">
                    <span className="font-sora text-sm font-medium text-black dark:text-white">Download my data</span>
                    <ChevronRight className="w-4 h-4 text-black/25 dark:text-white/25" />
                  </button>
                  <button className="w-full flex items-center justify-between py-2.5 px-3 border border-red-500/20 rounded-xl hover:border-red-500/40 transition-colors">
                    <span className="font-sora text-sm font-medium text-red-500">Delete all my data</span>
                    <ChevronRight className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </Card>
            )}

            {/* ── ADMIN QUICK PANEL ── */}
            {activeSection === "admin" && profile?.is_admin && (
              <div className="space-y-5">

                {/* Hero redirect */}
                <div
                  onClick={() => router.push("/home/admin/dashboard")}
                  className="group relative cursor-pointer overflow-hidden rounded-2xl border border-[#EF3866]/25 bg-gradient-to-br from-[#EF3866]/8 via-[#EF3866]/3 to-transparent p-5 hover:border-[#EF3866]/40 hover:shadow-lg hover:shadow-[#EF3866]/8 transition-all duration-200"
                >
                  <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 bg-[#EF3866]/15 rounded-xl flex items-center justify-center">
                        <Crown className="w-5 h-5 text-[#EF3866]" />
                      </div>
                      <div>
                        <p className="font-sora text-sm font-bold text-black dark:text-white">Full Admin Dashboard</p>
                        <p className="font-sora text-xs text-black/50 dark:text-white/50 mt-0.5">
                          Manage posts, all authors, platform settings
                        </p>
                      </div>
                    </div>
                    <div className="w-9 h-9 bg-[#EF3866] rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200 shrink-0">
                      <ArrowUpRight className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <div className="absolute -bottom-8 -right-8 w-28 h-28 bg-[#EF3866]/6 rounded-full pointer-events-none" />
                  <div className="absolute -bottom-14 -right-14 w-40 h-40 bg-[#EF3866]/3 rounded-full pointer-events-none" />
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <Card className="p-4">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      <span className="font-sora text-[10px] font-semibold uppercase tracking-widest text-black/40 dark:text-white/40">Pending</span>
                    </div>
                    <p className="font-sora text-3xl font-bold text-black dark:text-white tabular-nums">
                      {adminLoading ? <span className="text-black/20 dark:text-white/20">—</span> : pendingUsers.length}
                    </p>
                    <p className="font-sora text-xs text-black/40 dark:text-white/40 mt-0.5">Author requests</p>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Users className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="font-sora text-[10px] font-semibold uppercase tracking-widest text-black/40 dark:text-white/40">Active</span>
                    </div>
                    <p className="font-sora text-3xl font-bold text-black dark:text-white tabular-nums">
                      {adminLoading ? <span className="text-black/20 dark:text-white/20">—</span> : authors.length}
                    </p>
                    <p className="font-sora text-xs text-black/40 dark:text-white/40 mt-0.5">Current authors</p>
                  </Card>
                </div>

                {/* Pending requests */}
                <Card>
                  <div className="flex items-center justify-between px-5 py-4 border-b border-black/5 dark:border-white/5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 bg-amber-500/10 rounded-lg flex items-center justify-center">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                      </div>
                      <p className="font-sora font-semibold text-sm text-black dark:text-white">Pending Requests</p>
                      {pendingUsers.length > 0 && (
                        <span className="font-sora text-[10px] font-bold px-2 py-0.5 bg-amber-500/10 text-amber-600 rounded-full">
                          {pendingUsers.length}
                        </span>
                      )}
                    </div>
                    <button onClick={fetchAdminData} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors" title="Refresh">
                      <ExternalLink className="w-3.5 h-3.5 text-black/30 dark:text-white/30" />
                    </button>
                  </div>
                  {adminLoading ? (
                    <div className="flex items-center justify-center py-10"><Loader2 className="w-5 h-5 text-[#EF3866] animate-spin" /></div>
                  ) : pendingUsers.length === 0 ? (
                    <div className="flex flex-col items-center py-10 text-center">
                      <CheckCircle className="w-7 h-7 text-black/10 dark:text-white/10 mb-2" />
                      <p className="font-sora text-xs text-black/35 dark:text-white/35 font-medium">No pending requests</p>
                      <p className="font-sora text-[11px] text-black/25 dark:text-white/25 mt-0.5">All caught up!</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-black/5 dark:divide-white/5">
                      {pendingUsers.map(u => (
                        <div key={u.id} className="flex items-center justify-between px-5 py-3.5 gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <MiniAvatar src={u.image_url} name={formatName(u)} size={36} />
                            <div className="min-w-0">
                              <p className="font-sora text-sm font-semibold text-black dark:text-white truncate">{formatName(u)}</p>
                              <p className="font-sora text-[11px] text-black/40 dark:text-white/40 truncate">{u.email}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleApprove(u.id)}
                            disabled={approvingId === u.id}
                            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-sora text-xs font-semibold rounded-xl transition-colors shrink-0"
                          >
                            {approvingId === u.id
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <CheckCircle className="w-3.5 h-3.5" />}
                            {approvingId === u.id ? "Approving…" : "Approve"}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                {/* Current authors */}
                <Card>
                  <div className="flex items-center gap-2.5 px-5 py-4 border-b border-black/5 dark:border-white/5">
                    <div className="w-7 h-7 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                      <Users className="w-3.5 h-3.5 text-emerald-500" />
                    </div>
                    <p className="font-sora font-semibold text-sm text-black dark:text-white">Current Authors</p>
                    {authors.length > 0 && (
                      <span className="font-sora text-[10px] font-bold px-2 py-0.5 bg-emerald-500/10 text-emerald-600 rounded-full ml-1">
                        {authors.length}
                      </span>
                    )}
                  </div>
                  {adminLoading ? (
                    <div className="flex items-center justify-center py-10"><Loader2 className="w-5 h-5 text-[#EF3866] animate-spin" /></div>
                  ) : authors.length === 0 ? (
                    <div className="flex flex-col items-center py-10 text-center">
                      <Users className="w-7 h-7 text-black/10 dark:text-white/10 mb-2" />
                      <p className="font-sora text-xs text-black/35 dark:text-white/35 font-medium">No authors yet</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-black/5 dark:divide-white/5">
                      {authors.map(a => (
                        <div key={a._id} className="flex items-center justify-between px-5 py-3.5 gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <MiniAvatar src={a.image?.asset?.url} name={a.name} size={36} />
                            <div className="min-w-0">
                              <p className="font-sora text-sm font-semibold text-black dark:text-white truncate">{a.name}</p>
                              <span className="font-sora text-[10px] font-medium px-2 py-0.5 bg-emerald-500/10 text-emerald-600 rounded-full">Author</span>
                            </div>
                          </div>
                          <button
                            onClick={() => a.userId && handleRevoke(a.userId)}
                            disabled={revokingId === a.userId || !a.userId}
                            className="flex items-center gap-1.5 px-3.5 py-2 border border-red-500/20 text-red-500 hover:bg-red-500/8 hover:border-red-500/35 disabled:opacity-40 font-sora text-xs font-semibold rounded-xl transition-colors shrink-0"
                          >
                            {revokingId === a.userId
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <X className="w-3.5 h-3.5" />}
                            {!a.userId ? "Invalid" : revokingId === a.userId ? "Revoking…" : "Revoke"}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

              </div>
            )}

          </main>
        </div>
      </div>
    </div>
  );
}