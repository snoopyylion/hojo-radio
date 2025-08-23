// components/home/Sidebar.tsx
"use client";

import React, { useState, useEffect, useCallback, createContext, useContext } from "react";
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
    BrainCircuit,
    X
} from "lucide-react";
import SidebarLink from "./SidebarLink";
import clsx from "clsx";
import Image from "next/image";
import { useAppContext } from '@/context/AppContext';
import { UserButton } from '@clerk/nextjs';

// Create a context for sidebar state
interface SidebarContextType {
    isOpen: boolean;
    toggleSidebar: () => void;
    isLargeScreen: boolean;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

// Custom hook to use sidebar context
export const useSidebar = () => {
    const context = useContext(SidebarContext);
    if (!context) {
        throw new Error('useSidebar must be used within SidebarProvider');
    }
    return context;
};

// Provider component
export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false); // Start with closed state
    const [isLargeScreen, setIsLargeScreen] = useState(true);
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        const checkScreenSize = () => {
            const largeScreen = window.innerWidth >= 1024; // lg breakpoint
            const wasLargeScreen = isLargeScreen;
            setIsLargeScreen(largeScreen);
            
            // Only set initial sidebar state on first load
            if (!isInitialized) {
                setIsOpen(largeScreen); // Open on large screens, closed on small screens
                setIsInitialized(true);
            }
            // Handle screen size transitions after initialization
            else if (wasLargeScreen && !largeScreen && isOpen) {
                // Only close if transitioning from large to small screen
                setIsOpen(false);
            }
        };

        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);
        return () => window.removeEventListener('resize', checkScreenSize);
    }, [isInitialized, isLargeScreen, isOpen]);

    const toggleSidebar = () => {
        setIsOpen(!isOpen);
    };

    return (
        <SidebarContext.Provider value={{ isOpen, toggleSidebar, isLargeScreen }}>
            {children}
        </SidebarContext.Provider>
    );
};

export default function Sidebar() {
    const { isOpen, toggleSidebar, isLargeScreen } = useSidebar();
    const { user, isLoaded } = useAppContext();

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
                    "relative transition-all duration-300 bg-white dark:bg-black shadow-lg h-screen flex flex-col border-r border-gray-200 dark:border-gray-700 overflow-hidden",
                    {
                        "w-[280px]": isLargeScreen && isOpen,
                        "w-[80px]": isLargeScreen && !isOpen,
                        "w-[280px] absolute z-50": !isLargeScreen && isOpen,
                        "w-0 overflow-hidden": !isLargeScreen && !isOpen,
                    }
                )}
            >
                {/* Header - Logo Section */}
                {(isOpen || (isLargeScreen && !isOpen)) && (
                    <div className="flex-shrink-0 flex items-center justify-center py-1 px-2">
                        <div
                            className={clsx(
                                "flex justify-center transition-all duration-300",
                                {
                                    "w-full": isOpen,
                                    "w-16": !isOpen && isLargeScreen,
                                }
                            )}
                        >
                            <Image
                                src="/img/logo.png"
                                alt="Hojo Logo"
                                priority
                                width={isOpen ? 200 : 64}
                                height={isOpen ? 80 : 64}
                                className={clsx(
                                    "transition-all duration-300 object-contain rounded-lg",
                                    {
                                        "h-16 w-auto": isOpen,
                                        "h-12 w-12": !isOpen,
                                    }
                                )}
                            />
                        </div>
                    </div>
                )}

                {/* Content (Nav + Bottom) */}
                <div className="flex flex-col flex-1 justify-between min-h-0 px-2">
                    {/* Navigation Section */}
                    <nav className="flex flex-col space-y-0.5 text-sm overflow-y-auto">
                        <SidebarLink
                            href="/home"
                            label={isOpen ? "Home" : ""}
                            icon={<Home size={18} />}
                            collapsed={!isOpen && isLargeScreen}
                        />
                        <SidebarLink
                            href="/home/podcasts"
                            label={isOpen ? "Podcast Maker" : ""}
                            icon={<Mic size={18} />}
                            collapsed={!isOpen && isLargeScreen}
                        />
                        <SidebarLink
                            href="/home/verifications"
                            label={isOpen ? "Verify News" : ""}
                            icon={<ShieldCheck size={18} />}
                            collapsed={!isOpen && isLargeScreen}
                        />
                        <SidebarLink
                            href="/home/blog"
                            label={isOpen ? "Blog" : ""}
                            icon={<FileText size={18} />}
                            collapsed={!isOpen && isLargeScreen}
                        />
                        <SidebarLink
                            href="/home/messaging"
                            label={isOpen ? "Messages" : ""}
                            icon={<MessageCircle size={18} />}
                            collapsed={!isOpen && isLargeScreen}
                        />
                        <SidebarLink
                            href="/home/community"
                            label={isOpen ? "FPL Forum" : ""}
                            icon={<Goal size={18} />}
                            collapsed={!isOpen && isLargeScreen}
                        />
                        <SidebarLink
                            href="/home/notifications"
                            label={isOpen ? "Notifications" : ""}
                            icon={<Bell size={18} />}
                            collapsed={!isOpen && isLargeScreen}
                        />
                    </nav>

                    {/* Bottom Section */}
                    <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 text-xs space-y-0.5 py-2">
                        <SidebarLink
                            href="/home/settings"
                            label={isOpen ? "Settings" : ""}
                            icon={<Settings size={18} />}
                            collapsed={!isOpen && isLargeScreen}
                        />
                        <SidebarLink
                            href="/home/ai"
                            label={isOpen ? "Hojo AI" : ""}
                            icon={<BrainCircuit size={14} />}
                            collapsed={!isOpen && isLargeScreen}
                        />
                        <SidebarLink
                            href="/sign-out"
                            label={isOpen ? "Sign Out" : ""}
                            icon={<LogOut size={18} />}
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
                </div>
            </aside>

            {/* Floating Toggle Button - Only visible on large screens */}
            {isLargeScreen && (
                <button
                    onClick={toggleSidebar}
                    className={clsx(
                        "fixed top-1/2 transform -translate-y-1/2 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 h-12 p-1.5 rounded-full shadow-lg hover:shadow-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-300 z-50 border border-gray-200 dark:border-gray-700",
                        {
                            "left-[265px]": isOpen,
                            "left-[63px]": !isOpen,
                        }
                    )}
                >
                    {isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                </button>
            )}

            {/* Professional Mobile Overlay with Close Indicator */}
            {!isLargeScreen && isOpen && (
                <>
                    {/* Blur overlay */}
                    <div
                        className="fixed inset-0 backdrop-blur-sm bg-black/20 dark:bg-black/40 z-40 transition-all duration-300"
                        onClick={toggleSidebar}
                    />
                    
                    {/* Professional Close Indicator */}
                    <div className="fixed top-6 right-6 z-50">
                        <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-full p-3 shadow-lg border border-gray-200/50 dark:border-gray-700/50 transition-all duration-300 hover:scale-105 cursor-pointer group"
                             onClick={toggleSidebar}>
                            <div className="relative">
                                <X size={20} className="text-gray-600 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors" />
                                
                                {/* Subtle pulse animation ring */}
                                <div className="absolute inset-0 rounded-full bg-gray-400/20 animate-ping opacity-75 group-hover:opacity-0 transition-opacity"></div>
                            </div>
                            
                            {/* Tooltip */}
                            <div className="absolute -bottom-12 right-0 bg-gray-900 dark:bg-gray-700 text-white text-xs px-3 py-1.5 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap pointer-events-none">
                                Tap to close menu
                                <div className="absolute -top-1 right-3 w-2 h-2 bg-gray-900 dark:bg-gray-700 rotate-45"></div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}