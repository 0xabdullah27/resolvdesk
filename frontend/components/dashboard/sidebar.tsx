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
  PanelLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DashboardContext } from "@/providers/dashboard-provider";

interface DashboardSidebarProps {
  organizationName?: string;
  className?: string;
  onNavigate?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
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
  collapsed: propCollapsed,
  onToggleCollapse: propOnToggleCollapse,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const dashboardContext = React.useContext(DashboardContext);

  // If collapsed prop is explicitly passed (e.g. mobile drawer forced to false), use it;
  // otherwise fallback to DashboardContext state.
  const isCollapsed =
    propCollapsed !== undefined
      ? propCollapsed
      : dashboardContext?.isSidebarCollapsed ?? false;

  const handleToggle = () => {
    if (propOnToggleCollapse) {
      propOnToggleCollapse();
    } else if (dashboardContext?.toggleSidebar) {
      dashboardContext.toggleSidebar();
    }
  };

  return (
    <TooltipProvider delay={100}>
      <aside
        className={cn(
          "flex h-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out select-none",
          isCollapsed ? "w-16" : "w-64",
          className
        )}
      >
        {/* Brand & Toggle Header (ChatGPT Style) */}
        <div
          className={cn(
            "flex h-16 shrink-0 items-center border-b border-sidebar-border transition-all duration-300",
            isCollapsed ? "justify-center px-2" : "justify-between px-4"
          )}
        >
          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={handleToggle}
                    className="size-8 cursor-pointer text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 rounded-lg"
                    aria-label="Open sidebar"
                  >
                    <PanelLeft className="size-4.5" />
                  </Button>
                }
              />
              <TooltipContent side="right" align="center" className="font-medium text-xs">
                Open sidebar
              </TooltipContent>
            </Tooltip>
          ) : (
            <>
              <Link
                href="/"
                className="flex items-center gap-2.5 font-heading text-base font-bold text-sidebar-foreground transition-opacity hover:opacity-85 min-w-0"
                onClick={onNavigate}
              >
                <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                  <Bot className="size-4" />
                </div>
                <span className="tracking-tight truncate font-bold">ResolvDesk</span>
              </Link>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={handleToggle}
                      className="size-8 cursor-pointer text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 rounded-lg"
                      aria-label="Close sidebar"
                    >
                      <PanelLeft className="size-4.5" />
                    </Button>
                  }
                />
                <TooltipContent side="right" align="center" className="font-medium text-xs">
                  Close sidebar
                </TooltipContent>
              </Tooltip>
            </>
          )}
        </div>

        {/* Organization Section */}
        <div className={cn("pt-3 pb-1 transition-all", isCollapsed ? "px-2" : "px-3")}>
          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <div className="flex size-10 items-center justify-center rounded-lg border border-sidebar-border/70 bg-sidebar-accent/50 text-sidebar-foreground/80 mx-auto cursor-default">
                    <Building2 className="size-4.5" />
                  </div>
                }
              />
              <TooltipContent side="right" align="center" className="font-medium text-xs max-w-xs">
                <span className="text-[10px] uppercase block text-muted-foreground">Workspace</span>
                <span className="font-semibold text-foreground">{organizationName}</span>
              </TooltipContent>
            </Tooltip>
          ) : (
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
          )}
        </div>

        {/* Navigation Links */}
        <nav className={cn("flex-1 space-y-1.5 py-3 overflow-y-auto overflow-x-hidden", isCollapsed ? "px-2" : "px-3")}>
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);

            if (isCollapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger
                    render={
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        className={cn(
                          "flex size-10 items-center justify-center rounded-lg mx-auto transition-colors",
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                        )}
                        aria-label={item.title}
                      >
                        <Icon className="size-4.5 shrink-0" />
                      </Link>
                    }
                  />
                  <TooltipContent side="right" align="center" className="font-medium text-xs">
                    {item.title}
                  </TooltipContent>
                </Tooltip>
              );
            }

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
                <span className="truncate">{item.title}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer & Toggle Controls */}
        <div className="mt-auto shrink-0 border-t border-sidebar-border p-2">
          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={handleToggle}
                    className="flex size-9 mx-auto items-center justify-center text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground cursor-pointer rounded-lg"
                    aria-label="Open sidebar"
                  >
                    <PanelLeft className="size-4.5" />
                  </Button>
                }
              />
              <TooltipContent side="right" align="center" className="font-medium text-xs">
                Open sidebar
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="space-y-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggle}
                className="w-full justify-start gap-2.5 text-xs text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground cursor-pointer h-8.5 px-2.5 rounded-lg"
                title="Close sidebar"
              >
                <PanelLeft className="size-4 shrink-0" />
                <span className="truncate">Close sidebar</span>
              </Button>
              <div className="px-1 text-[11px] text-sidebar-foreground/50 text-center truncate">
                ResolvDesk v0.1.0 • Autonomous Support
              </div>
            </div>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
