import * as React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck, ArrowLeft, Bot } from "lucide-react";

import { getOwnerContextAction } from "@/actions/auth-actions";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/dashboard/user-menu";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "cn";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Platform Admin Console - ResolvDesk",
  description: "High-level platform growth metrics, user directory, and account access governance.",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const owner = await getOwnerContextAction();

  if (!owner) {
    redirect("/login?callbackUrl=/admin");
  }

  // Enforce role-based access control: non-superadmin accounts receive redirect to /dashboard
  if (owner.role !== "superadmin") {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col">
      {/* Top Platform Admin Header */}
      <header className="sticky top-0 z-40 flex h-16 w-full shrink-0 items-center justify-between border-b border-border/70 bg-background/80 px-4 sm:px-6 md:px-8 backdrop-blur-md">
        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            href="/admin"
            className="flex items-center gap-2 font-heading font-bold text-base sm:text-lg text-foreground hover:opacity-90 transition-opacity"
          >
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
              <Bot className="size-5" />
            </div>
            <span>ResolvDesk</span>
          </Link>

          <span className="hidden sm:inline-block h-4 w-px bg-border" />

          {/* Superadmin Mode Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
            <ShieldCheck className="size-3.5" />
            <span>Platform Admin</span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Link back to regular Merchant Dashboard */}
          <Link
            href="/dashboard"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            )}
          >
            <ArrowLeft className="size-3.5" />
            <span className="hidden sm:inline">Store Dashboard</span>
          </Link>

          <ThemeToggle />
          <UserMenu
            name={owner.name || owner.fullName}
            email={owner.email}
            role={owner.role}
          />
        </div>
      </header>

      {/* Admin Content Area */}
      <main className="flex-1 w-full p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
        {children}
      </main>
    </div>
  );
}
