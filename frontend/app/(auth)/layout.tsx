import * as React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Bot } from "lucide-react";
import { auth } from "@/lib/auth";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    const headerList = await headers();
    const session = await auth.api.getSession({
      headers: headerList,
    });
    if (session?.user) {
      redirect("/dashboard");
    }
  } catch (err: any) {
    if (err?.digest?.startsWith("NEXT_REDIRECT")) {
      throw err;
    }
  }
  return (
    <div className="relative min-h-screen flex flex-col justify-center items-center p-4 sm:p-6 bg-background">
      {/* Background ambient lighting */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 size-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 left-1/2 -translate-x-1/2 size-96 rounded-full bg-accent/20 blur-3xl" />
      </div>

      {/* Brand Header */}
      <div className="mb-6 flex flex-col items-center text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 rounded-xl border border-border/80 bg-card/60 px-3.5 py-1.5 shadow-sm backdrop-blur-md transition-all hover:bg-card hover:shadow"
        >
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Bot className="size-4" />
          </div>
          <span className="font-heading text-lg font-semibold tracking-tight text-foreground">
            ResolvDesk
          </span>
        </Link>
      </div>

      {/* Auth Card Content */}
      <div className="w-full max-w-md">{children}</div>

      {/* Footer */}
      <footer className="mt-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} ResolvDesk. Autonomous Support Agent Platform.
      </footer>
    </div>
  );
}
