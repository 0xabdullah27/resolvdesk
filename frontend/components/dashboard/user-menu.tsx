"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";
import { toast } from "sonner";

import { signOutOwnerAction } from "@/actions/auth-actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface UserMenuProps {
  name?: string;
  email?: string;
}

export function UserMenu({ name, email }: UserMenuProps) {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = React.useState(false);

  const displayName = name || "Owner";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOutOwnerAction();
      toast.success("Signed out successfully");
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("Failed to sign out. Please try again.");
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            className="relative size-9 rounded-full p-0 cursor-pointer focus-visible:ring-ring"
            aria-label="Open user menu"
          >
            <Avatar className="size-9 border border-border">
              <AvatarFallback className="bg-primary/10 text-primary font-medium text-xs">
                {initials || <User className="size-4" />}
              </AvatarFallback>
            </Avatar>
          </Button>
        }
      />
      <DropdownMenuContent className="w-56" align="end">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none text-foreground">
              {displayName}
            </p>
            {email && (
              <p className="text-xs leading-none text-muted-foreground truncate">
                {email}
              </p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={isSigningOut}
          onClick={handleSignOut}
          className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
        >
          <LogOut className="mr-2 size-4" />
          <span>{isSigningOut ? "Signing out..." : "Sign Out"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
