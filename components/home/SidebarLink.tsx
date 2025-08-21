"use client";

import Link from "next/link";
import React from "react";
import clsx from "clsx";
import { usePathname } from "next/navigation";

interface SidebarLinkProps {
  href: string;
  label: string;
  icon?: React.ReactNode;
  collapsed?: boolean;
}

export default function SidebarLink({ href, label, icon, collapsed = false }: SidebarLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={clsx(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative",
        {
          "justify-center": collapsed,
          "justify-start": !collapsed,
          // Active state - matches screenshot pink background with red text
          "bg-[#FDE7EB] text-[#EF3866] shadow-sm": isActive,
          // Inactive state - subtle hover
          "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-[#EF3866]": !isActive,
        }
      )}
      title={collapsed ? label : undefined} // Show tooltip when collapsed
    >
      {/* Icon */}
      <div
        className={clsx(
          "flex-shrink-0 transition-colors duration-200",
          {
            "mx-auto": collapsed,
            "text-[#EF3866]": isActive,
            "group-hover:text-[#EF3866]": !isActive,
          }
        )}
      >
        {icon}
      </div>
      
      {/* Label */}
      {label && !collapsed && (
        <span
          className={clsx(
            "text-sm font-medium transition-colors duration-200 truncate",
            {
              "text-[#EF3866] font-semibold": isActive,
              "group-hover:text-[#EF3866]": !isActive,
            }
          )}
        >
          {label}
        </span>
      )}

      {/* Active indicator dot when collapsed */}
      {isActive && collapsed && (
        <div className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-[#EF3866] rounded-full" />
      )}

      {/* Hover effect overlay */}
      {!isActive && (
        <div className="absolute inset-0 bg-[#EF3866]/0 group-hover:bg-[#EF3866]/5 rounded-lg transition-colors duration-200" />
      )}
    </Link>
  );
}