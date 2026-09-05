"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/dashboard/user-menu";
import { DashboardSidebar } from "@/components/dashboard/sidebar";

interface DashboardHeaderProps {
  ownerName?: string;
  ownerEmail?: string;
  organizationName?: string;
}

export function DashboardHeader({
  ownerName,
  ownerEmail,
  organizationName,
}: DashboardHeaderProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  // Derive route title
  let routeTitle = "Overview";
  if (pathname.includes("/documents")) routeTitle = "Knowledge Base";
  else if (pathname.includes("/conversations")) routeTitle = "Conversations";
  else if (pathname.includes("/widget")) routeTitle = "Widget Customizer";

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-border/70 bg-background/80 px-4 sm:px-6 backdrop-blur-md">
      <div className="flex items-center gap-3">
        {/* Mobile Sidebar Sheet */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="md:hidden cursor-pointer focus-visible:ring-ring"
                aria-label="Open mobile navigation"
              >
                <Menu className="size-5" />
              </Button>
            }
          />
          <SheetContent side="left" className="p-0 w-64">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <DashboardSidebar
              organizationName={organizationName}
              onNavigate={() => setMobileOpen(false)}
            />
          </SheetContent>
        </Sheet>

        {/* Dynamic Route Title & Breadcrumb */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground hidden sm:inline">
            Dashboard
          </span>
          <span className="text-muted-foreground/40 hidden sm:inline">/</span>
          <h1 className="font-heading font-semibold text-foreground">
            {routeTitle}
          </h1>
        </div>
      </div>

      {/* Right Header Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        <ThemeToggle />
        <UserMenu name={ownerName} email={ownerEmail} />
      </div>
    </header>
  );
}
