import * as React from "react";
import { redirect } from "next/navigation";
import { getOwnerContextAction } from "@/actions/auth-actions";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/header";
import { DashboardProvider } from "@/providers/dashboard-provider";
import { AccountSuspendedView } from "@/components/dashboard/account-suspended-view";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const owner = await getOwnerContextAction();

  if (!owner) {
    redirect("/login?callbackUrl=/dashboard");
  }

  if (owner.status === "suspended") {
    return (
      <AccountSuspendedView
        ownerEmail={owner.email}
        ownerName={owner.name || owner.fullName}
        organizationName={owner.organizationName}
      />
    );
  }

  return (
    <DashboardProvider owner={owner}>
      <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
        {/* Desktop Persistent Sidebar */}
        <DashboardSidebar
          organizationName={owner.organizationName}
          className="hidden md:flex shrink-0 h-full"
        />

        {/* Main Content Area */}
        <div className="flex flex-1 flex-col h-full min-w-0 overflow-hidden">
          <DashboardHeader
            ownerName={owner.name || owner.fullName}
            ownerEmail={owner.email}
            organizationName={owner.organizationName}
            role={owner.role}
          />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
            <div className="mx-auto max-w-6xl">{children}</div>
          </main>
        </div>
      </div>
    </DashboardProvider>
  );
}
