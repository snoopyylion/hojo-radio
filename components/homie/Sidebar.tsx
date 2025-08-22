// components/home/Sidebar.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    Home,
    Mic,
    ShieldCheck,
    ChevronLeft,
    ChevronRight,
    FileText,
    MessageCircle,
    Bell,
    Goal,
    Settings,
    LogOut,
    BrainCircuit
} from "lucide-react";
import SidebarLink from "./SidebarLink";
import clsx from "clsx";
import Image from "next/image";
import { useAppContext } from '@/context/AppContext';
import { UserButton } from '@clerk/nextjs';

export default function Sidebar() {
    const [isOpen, setIsOpen] = useState(true);
    const [isLargeScreen, setIsLargeScreen] = useState(true);
    const { user, isLoaded } = useAppContext();

    useEffect(() => {
        const checkScreenSize = () => {
            setIsLargeScreen(window.innerWidth >= 1024); // lg breakpoint
        };

        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);
        return () => window.removeEventListener('resize', checkScreenSize);
    }, []);

    const toggleSidebar = () => {
        setIsOpen(!isOpen);
    };

    const getUserDisplay = useCallback(() => {
        if (!user) return { name: 'User', role: 'Member' };
        const name = user.supabaseProfile?.first_name || user.firstName || 'User';
        const role = user.supabaseProfile?.role || user.role || 'Member';
        return { name, role };
    }, [user]);

    const { name, role } = getUserDisplay();

    return (
        <>
            <aside
                className={clsx(
                    "relative transition-all duration-300 bg-white dark:bg-black shadow-lg h-screen flex flex-col border-r border-gray-200 dark:border-gray-700",
                    {
                        // Large screen states
                        "w-[280px]": isLargeScreen && isOpen,
                        "w-[80px]": isLargeScreen && !isOpen,
                        // Small screen states
                        "w-[280px] absolute z-50": !isLargeScreen && isOpen,
                        "w-0 overflow-hidden": !isLargeScreen && !isOpen,
                    }
                )}
            >
                {/* Header - Logo Section */}
                {(isOpen || (isLargeScreen && !isOpen)) && (
                    <div className="flex items-center justify-center py-6 px-4">
                        <div
                            className={clsx(
                                "flex items-center justify-center transition-all duration-300",
                                {
                                    "w-full": isOpen,
                                    "w-16": !isOpen && isLargeScreen, // make collapsed area wider so logo fits
                                }
                            )}
                        >
                            <Image
                                src="/img/test-logo.png"
                                alt="Hojo Logo"
                                priority
                                width={isOpen ? 200 : 64} // adjust width based on state
                                height={isOpen ? 80 : 64}
                                className={clsx(
                                    "transition-all duration-300 object-contain rounded-lg",
                                    {
                                        "h-16 w-auto": isOpen,   // big when expanded
                                        "h-12 w-12": !isOpen,    // still noticeable when collapsed
                                    }
                                )}
                            />
                        </div>
                    </div>
                )}


                {/* Navigation Section */}
                <nav className="flex-1 px-3 py-4 space-y-1">
                    <SidebarLink
                        href="/home"
                        label={isOpen ? "Home" : ""}
                        icon={<Home size={20} />}
                        collapsed={!isOpen && isLargeScreen}
                    />
                    <SidebarLink
                        href="/home/podcasts"
                        label={isOpen ? "Podcast Maker" : ""}
                        icon={<Mic size={20} />}
                        collapsed={!isOpen && isLargeScreen}
                    />
                    <SidebarLink
                        href="/home/verifications"
                        label={isOpen ? "Verify News" : ""}
                        icon={<ShieldCheck size={20} />}
                        collapsed={!isOpen && isLargeScreen}
                    />
                    <SidebarLink
                        href="/home/blog"
                        label={isOpen ? "Blog" : ""}
                        icon={<FileText size={20} />}
                        collapsed={!isOpen && isLargeScreen}
                    />
                    <SidebarLink
                        href="/home/messaging"
                        label={isOpen ? "Messages" : ""}
                        icon={<MessageCircle size={20} />}
                        collapsed={!isOpen && isLargeScreen}
                    />
                    <SidebarLink
                        href="/home/community"
                        label={isOpen ? "FPL Forum" : ""}
                        icon={<Goal size={20} />}
                        collapsed={!isOpen && isLargeScreen}
                    />
                    <SidebarLink
                        href="/home/notifications"
                        label={isOpen ? "Notifications" : ""}
                        icon={<Bell size={20} />}
                        collapsed={!isOpen && isLargeScreen}
                    />
                </nav>

                {/* Bottom Section */}
                <div className="px-3 py-4 space-y-1 border-t border-gray-200 dark:border-gray-700">
                    <SidebarLink
                        href="/home/settings"
                        label={isOpen ? "Settings" : ""}
                        icon={<Settings size={20} />}
                        collapsed={!isOpen && isLargeScreen}
                    />
                    <SidebarLink
                        href="/home/ai"
                        label={isOpen ? "Hojo AI" : ""}
                        icon={<BrainCircuit size={15} />}
                        collapsed={!isOpen && isLargeScreen}
                    />
                    <SidebarLink
                        href="/sign-out"
                        label={isOpen ? "Sign Out" : ""}
                        icon={<LogOut size={20} />}
                        collapsed={!isOpen && isLargeScreen}
                    />

                    {/* User Profile Section */}
                    <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                        {!isLoaded ? (
                            // Loading State
                            <div className={clsx(
                                "flex items-center gap-3 p-3 rounded-lg",
                                {
                                    "justify-center": !isOpen && isLargeScreen,
                                    "justify-start": isOpen || !isLargeScreen,
                                }
                            )}>
                                <div className="w-8 h-8 bg-gray-300 rounded-full animate-pulse flex-shrink-0" />
                                {isOpen && (
                                    <div className="flex-1 space-y-1">
                                        <div className="w-20 h-3 bg-gray-300 rounded animate-pulse" />
                                        <div className="w-16 h-2 bg-gray-300 rounded animate-pulse" />
                                    </div>
                                )}
                            </div>
                        ) : user ? (
                            // User Authenticated State
                            <div className={clsx(
                                "flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer",
                                {
                                    "justify-center": !isOpen && isLargeScreen,
                                    "justify-start": isOpen || !isLargeScreen,
                                }
                            )} title={!isOpen ? `${name} - ${role}` : undefined}>
                                <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-[#EF3866] to-[#EF3866]/70 p-0.5">
                                    <div className="w-full h-full rounded-full bg-white dark:bg-gray-900 flex items-center justify-center overflow-hidden">
                                        <UserButton
                                            afterSignOutUrl="/"
                                            appearance={{
                                                elements: {
                                                    avatarBox: "w-full h-full",
                                                    userButtonPopoverCard: "shadow-xl",
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                                {isOpen && (
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                            {name}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 capitalize truncate">
                                            {role}
                                        </p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            // Not authenticated - show placeholder or sign in prompt
                            <div className={clsx(
                                "flex items-center gap-3 p-3 rounded-lg",
                                {
                                    "justify-center": !isOpen && isLargeScreen,
                                    "justify-start": isOpen || !isLargeScreen,
                                }
                            )}>
                                <div className="w-8 h-8 bg-gray-300 rounded-full flex-shrink-0 flex items-center justify-center">
                                    <span className="text-xs font-medium text-gray-600">?</span>
                                </div>
                                {isOpen && (
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                            Guest User
                                        </p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500">
                                            Not signed in
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </aside>

            {/* Toggle Button - Always positioned at sidebar border, vertically centered */}
            <button
                onClick={toggleSidebar}
                className={clsx(
                    "fixed top-1/2 transform -translate-y-1/2 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 h-12 p-1.5 rounded-full shadow-lg hover:shadow-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-300 z-50 border border-gray-200 dark:border-gray-700",
                    {
                        // When sidebar is open (both large and small screens)
                        "left-[265px]": isOpen,   // 280px - 8px

                        // When sidebar is closed on large screen
                        "left-[63px]": !isOpen && isLargeScreen,   // 80px - 8px

                        // When sidebar is closed on small screen
                        "left-0": !isOpen && !isLargeScreen,       // fully closed sidebar
                    }
                )}
            >
                {isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            </button>

            {/* Blur overlay for small screens when sidebar is open */}
            {!isLargeScreen && isOpen && (
                <div
                    className="fixed inset-0 backdrop-blur-sm bg-black/20 dark:bg-black/40 z-40"
                    onClick={toggleSidebar}
                />
            )}
        </>
    );
}