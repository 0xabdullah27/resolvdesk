"use client";

import * as React from "react";
import { ShieldCheck, Lock } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface WidgetDomainsCardProps {
  restrictedDomains: string;
  onRestrictedDomainsChange: (domains: string) => void;
  error?: string;
}

export function WidgetDomainsCard({
  restrictedDomains,
  onRestrictedDomainsChange,
  error,
}: WidgetDomainsCardProps) {
  return (
    <Card className="border-border/70 bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" />
            Allowed Domains (CORS Security)
          </CardTitle>
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
            <Lock className="size-3" />
            Restricted Origins Enforced
          </span>
        </div>
        <CardDescription className="text-xs">
          Control which websites are authorized to load and display your chat widget. Only requests matching these hostnames will be accepted.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="restricted-domains-input" className="text-xs font-medium text-foreground">
              Authorized Hostnames
            </Label>
            <span className="text-[11px] text-muted-foreground">
              Comma or newline separated
            </span>
          </div>
          <Textarea
            id="restricted-domains-input"
            value={restrictedDomains}
            onChange={(e) => onRestrictedDomainsChange(e.target.value)}
            placeholder="yourstore.com&#10;shop.yourstore.com&#10;localhost"
            rows={3}
            className={`font-mono text-xs resize-none ${error ? "border-destructive focus-visible:ring-destructive" : ""}`}
          />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Enter hostnames authorized to execute your widget snippet. Protocols (<code>https://</code>) and paths are automatically stripped. Wildcard (<code>*</code>) is prohibited to prevent unauthorized usage.
          </p>
          {error && <p className="text-xs font-medium text-destructive">{error}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
