import * as React from "react";
import type { Metadata } from "next";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Owner Sign In - ResolvDesk",
  description: "Sign in to your ResolvDesk business owner dashboard.",
};

export default function LoginPage() {
  return (
    <Card className="border-border/80 bg-card/80 shadow-xl backdrop-blur-xl">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold tracking-tight">
          Welcome Back
        </CardTitle>
        <CardDescription>
          Enter your email and password to access your dashboard
        </CardDescription>
      </CardHeader>
      <CardContent>
        <React.Suspense
          fallback={
            <div className="py-8 text-center text-sm text-muted-foreground">
              Loading form...
            </div>
          }
        >
          <LoginForm />
        </React.Suspense>
      </CardContent>
      <CardFooter className="flex flex-col space-y-2 border-t border-border/40 pt-4 text-center text-sm text-muted-foreground">
        <div>
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-medium text-foreground underline underline-offset-4 hover:text-primary transition-colors"
          >
            Create a workspace
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
