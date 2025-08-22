// app/home/layout.tsx
import React from "react";
import Sidebar from "@/components/homie/Sidebar";
import { Search } from "lucide-react";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen bg-white dark:bg-black relative">
            {/* Sidebar */}
            <Sidebar />

            {/* Main Content */}
            <main className="flex-1 p-2 min-w-0">
                {/* Top Bar */}
                <header className="flex justify-center items-center mb-6 border-b border-gray-200 dark:border-gray-700 py-2">
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
                </header>

                {children}
            </main>
        </div>
    );
}