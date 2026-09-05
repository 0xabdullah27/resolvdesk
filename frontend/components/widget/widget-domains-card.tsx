"use client";

import * as React from "react";
import { Globe, ShieldCheck } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface WidgetDomainsCardProps {
  domainScope: "all" | "restricted";
  onDomainScopeChange: (scope: "all" | "restricted") => void;
  restrictedDomains: string;
  onRestrictedDomainsChange: (domains: string) => void;
  error?: string;
}

export function WidgetDomainsCard({
  domainScope,
  onDomainScopeChange,
  restrictedDomains,
  onRestrictedDomainsChange,
  error,
}: WidgetDomainsCardProps) {
  return (
    <Card className="border-border/70 bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Globe className="size-4 text-primary" />
          Allowed Domains (CORS Security)
        </CardTitle>
        <CardDescription className="text-xs">
          Control which websites are authorized to load and display your chat widget.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup
          value={domainScope}
          onValueChange={(val) => onDomainScopeChange(val as "all" | "restricted")}
          className="gap-3"
        >
          {/* Option 1: All domains */}
          <div className="flex items-start gap-3 rounded-lg border border-border/60 p-3 hover:border-primary/50 transition-colors bg-card">
            <RadioGroupItem value="all" id="scope-all" className="mt-0.5" />
            <div className="grid gap-1 cursor-pointer" onClick={() => onDomainScopeChange("all")}>
              <Label htmlFor="scope-all" className="font-medium cursor-pointer text-foreground">
                Allow on all websites (*)
              </Label>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Recommended for development, testing, or embedding across multiple stores.
              </p>
            </div>
          </div>

          {/* Option 2: Restricted domains */}
          <div className="flex items-start gap-3 rounded-lg border border-border/60 p-3 hover:border-primary/50 transition-colors bg-card">
            <RadioGroupItem value="restricted" id="scope-restricted" className="mt-0.5" />
            <div className="grid gap-1 cursor-pointer" onClick={() => onDomainScopeChange("restricted")}>
              <Label htmlFor="scope-restricted" className="font-medium cursor-pointer text-foreground flex items-center gap-1.5">
                <ShieldCheck className="size-3.5 text-primary" />
                Specific domains only
              </Label>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Restrict widget execution to verified hostnames to prevent unauthorized embedding.
              </p>
            </div>
          </div>
        </RadioGroup>

        {domainScope === "restricted" && (
          <div className="space-y-2 pt-1 animate-in fade-in-50 duration-200">
            <Label htmlFor="restricted-domains-input" className="text-xs font-medium text-foreground">
              Authorized Hostnames
            </Label>
            <Textarea
              id="restricted-domains-input"
              value={restrictedDomains}
              onChange={(e) => onRestrictedDomainsChange(e.target.value)}
              placeholder="example.com&#10;app.example.com&#10;mystore.myshopify.com"
              rows={3}
              className="font-mono text-xs resize-none"
            />
            <p className="text-[11px] text-muted-foreground">
              Enter one hostname per line or separated by commas. Protocols (<code>https://</code>) and trailing slashes are automatically removed.
            </p>
            {error && <p className="text-xs font-medium text-destructive">{error}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
