"use client";
// app/home/layout.tsx
import React from "react";
import Sidebar, { SidebarProvider, useSidebar } from "@/components/home/Sidebar";
import { Search, Menu, X } from "lucide-react";

// Header component that uses sidebar context
function DashboardHeader() {
    const { isOpen, toggleSidebar, isLargeScreen } = useSidebar();
    
    return (
        <header className="flex items-center gap-4 mb-6 border-b border-gray-200 dark:border-gray-700 py-2">
            {/* Hamburger Menu Button - Only visible on small screens */}
            {!isLargeScreen && (
                <button
                    onClick={toggleSidebar}
                    className="bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 p-2 rounded-lg shadow hover:shadow-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200"
                >
                    {isOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
            )}
            
            {/* Search Input - Centered */}
            <div className="flex-1 flex justify-end">
                <div className="relative w-[30%] min-w-[250px]">
                    <input
                        type="text"
                        placeholder="Search..."
                        className="w-full px-4 py-2 pr-10 rounded-lg border
                      border-gray-300 dark:border-gray-700
                      bg-white dark:bg-black
                     text-gray-900 dark:text-white
                      focus:outline-none focus:ring-2 focus:ring-[#EF3866] transition"
                    />
                    {/* Search Icon */}
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 w-5 h-5" />
                </div>
            </div>
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
            <div className="flex min-h-screen bg-white dark:bg-black relative">
                {/* Sidebar */}
                <Sidebar />

                {/* Main Content */}
                <main className="flex-1 p-2 min-w-0">
                    <DashboardHeader />
                    {children}
                </main>
            </div>
        </SidebarProvider>
    );
}