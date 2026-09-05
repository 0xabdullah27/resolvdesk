"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  LayoutDashboard,
  FileText,
  MessageSquare,
  Sliders,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardSidebarProps {
  organizationName?: string;
  className?: string;
  onNavigate?: () => void;
}

export const navigationItems = [
  {
    title: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Knowledge Base",
    href: "/dashboard/documents",
    icon: FileText,
  },
  {
    title: "Conversations",
    href: "/dashboard/conversations",
    icon: MessageSquare,
  },
  {
    title: "Widget Customizer",
    href: "/dashboard/widget",
    icon: Sliders,
  },
];

export function DashboardSidebar({
  organizationName = "My Workspace",
  className,
  onNavigate,
}: DashboardSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-200",
        className
      )}
    >
      {/* Brand & Organization Header */}
      <div className="flex h-16 shrink-0 flex-col justify-center border-b border-sidebar-border px-5">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 font-heading text-base font-bold text-sidebar-foreground"
          onClick={onNavigate}
        >
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Bot className="size-4" />
          </div>
          <span className="tracking-tight">ResolvDesk</span>
        </Link>
      </div>

      {/* Organization Badge */}
      <div className="px-3 pt-3 pb-1">
        <div className="flex items-center gap-2 rounded-lg border border-sidebar-border/70 bg-sidebar-accent/50 px-3 py-2 text-xs">
          <Building2 className="size-3.5 shrink-0 text-sidebar-foreground/70" />
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] uppercase font-semibold text-sidebar-foreground/60 tracking-wider">
              Organization
            </span>
            <span className="truncate font-medium text-sidebar-foreground">
              {organizationName}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1 px-3 py-3 overflow-y-auto">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      <div className="mt-auto shrink-0 border-t border-sidebar-border p-4 text-[11px] text-sidebar-foreground/50 text-center">
        ResolvDesk v0.1.0 • Autonomous Support
      </div>
    </aside>
  );
}
