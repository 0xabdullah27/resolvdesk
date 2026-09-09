"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, Mail, LogOut, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { signOutOwnerAction } from "@/actions/auth-actions";

interface AccountSuspendedViewProps {
  ownerEmail: string;
  ownerName?: string;
  organizationName?: string;
}

export function AccountSuspendedView({
  ownerEmail,
  ownerName,
  organizationName,
}: AccountSuspendedViewProps) {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = React.useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOutOwnerAction();
      toast.success("Signed out successfully.");
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("Failed to sign out. Please try again.");
      setIsSigningOut(false);
    }
  };

  const supportEmail = "mabdullahqureshi583@gmail.com";
  const mailtoSubject = encodeURIComponent(
    `Account Reactivation Request - ${ownerEmail}`
  );
  const mailtoBody = encodeURIComponent(
    `Hello ResolvDesk Support,\n\nMy merchant account (${ownerEmail}) has been suspended. I would like to request reactivation.\n\nOrganization: ${
      organizationName || "N/A"
    }\nName: ${ownerName || "Merchant"}\n\nThank you.`
  );
  const mailtoUrl = `mailto:${supportEmail}?subject=${mailtoSubject}&body=${mailtoBody}`;

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-4 py-12">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-destructive/20 bg-card p-6 shadow-xl sm:p-8">
        {/* Glow accent */}
        <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-destructive/10 blur-3xl" />
        <div className="absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-destructive/10 blur-3xl" />

        <div className="relative flex flex-col items-center text-center">
          {/* Status Icon */}
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-destructive/30 bg-destructive/10 text-destructive shadow-sm">
            <ShieldAlert className="h-8 w-8 animate-pulse" />
          </div>

          {/* Badge */}
          <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive">
            <span className="h-2 w-2 rounded-full bg-destructive animate-ping" />
            Account Suspended
          </div>

          {/* Title & Description */}
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Workspace Suspended
          </h1>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            Your merchant account has been suspended by the platform administrator.
            Access to your workspace dashboard, document management, and public chat
            widget have been temporarily placed offline.
          </p>

          {/* Account Details Box */}
          <div className="mt-6 w-full rounded-xl border border-border/80 bg-muted/40 p-4 text-left text-sm">
            <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
              <span className="text-xs font-medium text-muted-foreground">Account</span>
              <span className="font-semibold text-foreground truncate max-w-[240px]">
                {ownerEmail}
              </span>
            </div>
            {organizationName && organizationName !== "Suspended Organization" && (
              <div className="flex items-center justify-between border-b border-border/60 py-2.5">
                <span className="text-xs font-medium text-muted-foreground">Workspace</span>
                <span className="font-medium text-foreground truncate max-w-[240px]">
                  {organizationName}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between pt-2.5">
              <span className="text-xs font-medium text-muted-foreground">Status</span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-destructive">
                <AlertCircle className="h-3.5 w-3.5" />
                Suspended
              </span>
            </div>
          </div>

          {/* Support Information */}
          <div className="mt-6 flex w-full flex-col gap-3">
            <a
              href={mailtoUrl}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Mail className="h-4 w-4" />
              Contact Support ({supportEmail})
            </a>

            <Button
              type="button"
              variant="outline"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="h-11 w-full gap-2 cursor-pointer border-border hover:bg-muted"
            >
              {isSigningOut ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing out...
                </>
              ) : (
                <>
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </>
              )}
            </Button>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            For urgent reactivation assistance, please email{" "}
            <a
              href={mailtoUrl}
              className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
            >
              {supportEmail}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
