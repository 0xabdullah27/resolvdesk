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
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Create Your Workspace - ResolvDesk",
  description:
    "Register your business and provision your autonomous AI support workspace.",
};

export default function RegisterPage() {
  return (
    <Card className="border-border/80 bg-card/80 shadow-xl backdrop-blur-xl">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold tracking-tight">
          Create an Account
        </CardTitle>
        <CardDescription>
          Enter your details below to set up your business workspace
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RegisterForm />
      </CardContent>
      <CardFooter className="flex flex-col space-y-2 border-t border-border/40 pt-4 text-center text-sm text-muted-foreground">
        <div>
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-foreground underline underline-offset-4 hover:text-primary transition-colors"
          >
            Sign in
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
