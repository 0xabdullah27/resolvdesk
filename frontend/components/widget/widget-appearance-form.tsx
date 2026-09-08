"use client";

import * as React from "react";
import type { UseFormReturn } from "react-hook-form";
import { Sliders, RotateCcw, Save, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { WidgetColorPicker } from "./widget-color-picker";
import { WidgetPositionPicker } from "./widget-position-picker";
import { WidgetDomainsCard } from "./widget-domains-card";
import type { WidgetFormValues } from "@/lib/validations/widget";

interface WidgetAppearanceFormProps {
  form: UseFormReturn<WidgetFormValues>;
  onSave: () => void;
  onRequestReset: () => void;
  isSaving: boolean;
}

export function WidgetAppearanceForm({
  form,
  onSave,
  onRequestReset,
  isSaving,
}: WidgetAppearanceFormProps) {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form;

  const botDisplayName = watch("bot_display_name") || "";
  const welcomeMessage = watch("welcome_message") || "";
  const primaryColor = watch("primary_color") || "#4F46E5";
  const widgetPlacement = watch("widget_placement") || "bottom-right";
  const restrictedDomains = watch("restricted_domains") || "";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave();
      }}
      className="space-y-6"
    >
      {/* 1. Appearance & Branding Card */}
      <Card className="border-border/70 bg-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
            <Sliders className="size-4 text-primary" />
            Branding & Personality
          </CardTitle>
          <CardDescription className="text-xs">
            Customize the name, greeting, accent color, and screen position for your live chat assistant.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Bot Display Name */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="bot-name-input" className="text-xs font-medium text-foreground">
                Bot Display Name
              </Label>
              <span className="text-[11px] text-muted-foreground font-mono">
                {botDisplayName.length}/100
              </span>
            </div>
            <Input
              id="bot-name-input"
              {...register("bot_display_name")}
              placeholder="e.g. Support Assistant"
              maxLength={100}
              className={errors.bot_display_name ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            {errors.bot_display_name ? (
              <p className="text-xs font-medium text-destructive">{errors.bot_display_name.message}</p>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Displayed in the chat header when visitors open the widget.
              </p>
            )}
          </div>

          {/* Welcome Message */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="welcome-msg-input" className="text-xs font-medium text-foreground">
                Welcome Greeting
              </Label>
              <span className="text-[11px] text-muted-foreground font-mono">
                {welcomeMessage.length}/500
              </span>
            </div>
            <Textarea
              id="welcome-msg-input"
              {...register("welcome_message")}
              placeholder="Hi! How can I help you today?"
              rows={3}
              maxLength={500}
              className={`resize-none ${errors.welcome_message ? "border-destructive focus-visible:ring-destructive" : ""}`}
            />
            {errors.welcome_message ? (
              <p className="text-xs font-medium text-destructive">{errors.welcome_message.message}</p>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                The first message visitors see as an automated greeting.
              </p>
            )}
          </div>

          {/* Color Picker */}
          <WidgetColorPicker
            value={primaryColor}
            onChange={(c) => setValue("primary_color", c, { shouldDirty: true, shouldValidate: true })}
            error={errors.primary_color?.message}
          />

          {/* Widget Position Picker */}
          <WidgetPositionPicker
            value={widgetPlacement}
            onChange={(val) =>
              setValue("widget_placement", val, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
            error={errors.widget_placement?.message}
          />
        </CardContent>
      </Card>

      {/* 2. Allowed Domains Card */}
      <WidgetDomainsCard
        restrictedDomains={restrictedDomains}
        onRestrictedDomainsChange={(domains) =>
          setValue("restricted_domains", domains, { shouldDirty: true, shouldValidate: true })
        }
        error={errors.restricted_domains?.message}
      />

      {/* 3. Form Action Bar */}
      <div className="flex items-center justify-between pt-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRequestReset}
          disabled={isSaving}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="mr-1.5 size-3.5" />
          Reset to Defaults
        </Button>

        <Button
          type="submit"
          size="sm"
          disabled={isSaving}
          className="min-w-[120px] text-xs font-medium"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 size-3.5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-1.5 size-3.5" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
