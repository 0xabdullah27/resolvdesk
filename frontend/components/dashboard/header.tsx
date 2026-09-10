"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { RefreshCw, PanelLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/dashboard/user-menu";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { useDashboard } from "@/hooks/use-dashboard";

interface DashboardHeaderProps {
  ownerName?: string;
  ownerEmail?: string;
  organizationName?: string;
  role?: string;
}

function formatRelativeTime(date: Date | null): string {
  if (!date) return "";
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  return `${diffHours}h ago`;
}

export function DashboardHeader({
  ownerName,
  ownerEmail,
  organizationName,
  role,
}: DashboardHeaderProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const {
    refreshAll,
    isRefreshing,
    lastRefreshedAt,
    isSidebarCollapsed,
    toggleSidebar,
  } = useDashboard();
  const [relativeTime, setRelativeTime] = React.useState<string>("");

  React.useEffect(() => {
    if (!lastRefreshedAt) {
      setRelativeTime("");
      return;
    }
    setRelativeTime(formatRelativeTime(lastRefreshedAt));
    const timer = setInterval(() => {
      setRelativeTime(formatRelativeTime(lastRefreshedAt));
    }, 30000);
    return () => clearInterval(timer);
  }, [lastRefreshedAt]);

  // Derive route title
  let routeTitle = "Overview";
  if (pathname.includes("/documents")) routeTitle = "Knowledge Base";
  else if (pathname.includes("/conversations")) routeTitle = "Conversations";
  else if (pathname.includes("/widget")) routeTitle = "Widget Customizer";

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-border/70 bg-background/80 px-4 sm:px-6 backdrop-blur-md">
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Mobile Sidebar Sheet Trigger */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="md:hidden size-8 cursor-pointer text-muted-foreground hover:text-foreground focus-visible:ring-ring rounded-lg"
                aria-label="Open navigation menu"
              >
                <PanelLeft className="size-5" />
              </Button>
            }
          />
          <SheetContent side="left" className="p-0 w-64">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <DashboardSidebar
              organizationName={organizationName}
              onNavigate={() => setMobileOpen(false)}
              collapsed={false}
            />
          </SheetContent>
        </Sheet>

        {/* Desktop ChatGPT-style Sidebar Toggle Button */}
        <TooltipProvider delay={100}>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={toggleSidebar}
                  className="hidden md:flex size-8 cursor-pointer text-muted-foreground hover:text-foreground hover:bg-muted/60 focus-visible:ring-ring rounded-lg"
                  aria-label={isSidebarCollapsed ? "Open sidebar" : "Close sidebar"}
                >
                  <PanelLeft className="size-4.5" />
                </Button>
              }
            />
            <TooltipContent side="right" align="center" className="text-xs font-medium">
              {isSidebarCollapsed ? "Open sidebar" : "Close sidebar"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Clean Route Title (without redundant 'Dashboard /') */}
        <h1 className="font-heading font-semibold text-foreground text-sm sm:text-base">
          {routeTitle}
        </h1>
      </div>

      {/* Right Header Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Unified Cache Refresh Button */}
        <div className="flex items-center gap-2">
          {relativeTime && (
            <span className="hidden lg:inline text-xs text-muted-foreground">
              Updated {relativeTime}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={refreshAll}
            disabled={isRefreshing}
            className="cursor-pointer gap-1.5 text-xs font-medium h-8"
            title={
              lastRefreshedAt
                ? `Last refreshed: ${lastRefreshedAt.toLocaleTimeString()}`
                : "Refresh dashboard data"
            }
          >
            <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>

        <ThemeToggle />
        <UserMenu name={ownerName} email={ownerEmail} role={role} />
      </div>
    </header>
  );
}
