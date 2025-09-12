"use client";

import React from "react";
import Sidebar, { SidebarProvider, useSidebar } from "@/components/home/Sidebar";
import SearchComponent from "@/components/SearchComponent"; // Import your search component
import { Menu } from "lucide-react";
import clsx from "clsx";

// Header component that uses sidebar context
function DashboardHeader() {
    const { isOpen, toggleSidebar, isLargeScreen } = useSidebar();
    
    return (
        <header
            className={clsx(
                "flex-shrink-0 flex items-center gap-4 mb-6 border-b border-gray-200 dark:border-gray-700 py-2 sticky top-0 bg-white dark:bg-black z-40 transition-all duration-300",
                {
                    "backdrop-blur-sm bg-white/40 dark:bg-black/40":
                        !isLargeScreen && isOpen,
                }
            )}
        >
            {/* Only render header content if sidebar isn’t open on small screens */}
            {!(!isLargeScreen && isOpen) && (
                <>
                    {/* Hamburger Menu Button - Small screens only */}
                    {!isLargeScreen && (
                        <button
                            onClick={toggleSidebar}   // ✅ FIXED: toggle sidebar works now
                            className="bg-white dark:bg-black border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200"
                        >
                            <Menu size={20} />
                        </button>
                    )}

                    {/* Search Component */}
                    <div className="flex-1 flex justify-end">
                        <div className="relative w-[30%] min-w-[250px]">
                            <SearchComponent className="w-full" isMobile={false} />
                        </div>
                    </div>
                </>
            )}
        </header>
    );
}




export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <SidebarProvider>
            <div className="flex h-screen bg-white dark:bg-black relative overflow-hidden">
                {/* Sidebar */}
                <Sidebar />
                
                {/* Main Content */}
                <main className="flex-1 flex flex-col p-2 min-w-0 overflow-hidden">
                    <DashboardHeader />
                    
                    {/* Scrollable Content Area */}
                    <div className="flex-1 overflow-y-auto overflow-x-hidden">
                        {children}
                    </div>
                </main>
            </div>
        </SidebarProvider>
    );
}