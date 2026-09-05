"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  widgetFormSchema,
  type WidgetFormValues,
  WIDGET_DEFAULTS,
  normalizeDomains,
} from "@/lib/validations/widget";
import type { WidgetConfig, WidgetPlacement } from "@/types/widget";
import {
  updateWidgetConfigAction,
  rotateWidgetKeyAction,
} from "@/actions/widget-actions";

import { WidgetAppearanceForm } from "./widget-appearance-form";
import { WidgetLivePreview } from "./widget-live-preview";
import { WidgetEmbedCard } from "./widget-embed-card";
import { WidgetResetDialog } from "./widget-reset-dialog";
import { WidgetRotateDialog } from "./widget-rotate-dialog";

interface WidgetCustomizerViewProps {
  initialConfig: WidgetConfig;
}

export function WidgetCustomizerView({ initialConfig }: WidgetCustomizerViewProps) {
  // Live widget key and grace window state (updated on key rotation)
  const [currentConfig, setCurrentConfig] = React.useState<WidgetConfig>(initialConfig);

  // Dialog & pending states
  const [isSaving, setIsSaving] = React.useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = React.useState(false);
  const [isRotateDialogOpen, setIsRotateDialogOpen] = React.useState(false);
  const [isRotating, setIsRotating] = React.useState(false);

  // Initialize form with existing configuration
  const isInitialAllDomains =
    !initialConfig.allowed_origins || initialConfig.allowed_origins.trim() === "*";

  const form = useForm<WidgetFormValues>({
    resolver: zodResolver(widgetFormSchema),
    defaultValues: {
      bot_display_name: initialConfig.bot_display_name || WIDGET_DEFAULTS.bot_display_name,
      welcome_message: initialConfig.welcome_message || WIDGET_DEFAULTS.welcome_message,
      primary_color: initialConfig.primary_color || WIDGET_DEFAULTS.primary_color,
      widget_placement: initialConfig.widget_placement || WIDGET_DEFAULTS.widget_placement,
      domain_scope: isInitialAllDomains ? "all" : "restricted",
      restricted_domains: isInitialAllDomains ? "" : initialConfig.allowed_origins,
    },
  });

  const { watch, handleSubmit, reset } = form;

  // Real-time reactive preview synchronization (<50ms via watch)
  const watchedBotName = watch("bot_display_name");
  const watchedGreeting = watch("welcome_message");
  const watchedColor = watch("primary_color");
  const watchedPlacement = watch("widget_placement");

  // Save changes handler
  const onSave = handleSubmit(async (values: WidgetFormValues) => {
    setIsSaving(true);

    let resolvedOrigins = "*";
    if (values.domain_scope === "restricted") {
      const cleaned = normalizeDomains(values.restricted_domains || "");
      resolvedOrigins = cleaned || "*";
    }

    try {
      const res = await updateWidgetConfigAction({
        bot_display_name: values.bot_display_name,
        welcome_message: values.welcome_message,
        primary_color: values.primary_color,
        widget_placement: values.widget_placement as WidgetPlacement,
        allowed_origins: resolvedOrigins,
      });

      if (res.success && res.data) {
        setCurrentConfig(res.data);
        reset({
          bot_display_name: res.data.bot_display_name,
          welcome_message: res.data.welcome_message,
          primary_color: res.data.primary_color,
          widget_placement: res.data.widget_placement,
          domain_scope: res.data.allowed_origins === "*" ? "all" : "restricted",
          restricted_domains: res.data.allowed_origins === "*" ? "" : res.data.allowed_origins,
        });
        toast.success("Widget configuration updated successfully!");
      } else {
        toast.error(res.error || "Failed to save widget configuration.");
      }
    } catch {
      toast.error("An unexpected error occurred while saving widget configuration.");
    } finally {
      setIsSaving(false);
    }
  });

  // Factory reset confirmation handler
  const handleConfirmReset = () => {
    reset({
      bot_display_name: WIDGET_DEFAULTS.bot_display_name,
      welcome_message: WIDGET_DEFAULTS.welcome_message,
      primary_color: WIDGET_DEFAULTS.primary_color,
      widget_placement: WIDGET_DEFAULTS.widget_placement,
      domain_scope: WIDGET_DEFAULTS.domain_scope,
      restricted_domains: WIDGET_DEFAULTS.restricted_domains,
    });
    toast.info("Form reset to defaults. Click 'Save Changes' to apply.");
  };

  // Safe key rotation handler
  const handleConfirmRotate = async () => {
    setIsRotating(true);
    try {
      const res = await rotateWidgetKeyAction();
      if (res.success && res.data) {
        setCurrentConfig((prev) => ({
          ...prev,
          widget_key: res.data!.new_widget_key,
          previous_widget_key: res.data!.previous_widget_key,
          grace_expires_at: res.data!.grace_expires_at,
          has_grace_key: true,
          embed_snippet: res.data!.embed_snippet,
        }));
        setIsRotateDialogOpen(false);
        toast.success("Widget key rotated successfully! 24-hour grace period started.");
      } else {
        toast.error(res.error || "Failed to rotate widget key.");
      }
    } catch {
      toast.error("An unexpected error occurred during key rotation.");
    } finally {
      setIsRotating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground">
          Widget Customizer
        </h2>
        <p className="text-sm text-muted-foreground">
          Customize your autonomous AI assistant&apos;s brand appearance, welcome greeting, placement, and retrieve your live embed code.
        </p>
      </div>

      {/* Main 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Form & Embed Details */}
        <div className="lg:col-span-7 space-y-6">
          <WidgetAppearanceForm
            form={form}
            onSave={onSave}
            onRequestReset={() => setIsResetDialogOpen(true)}
            isSaving={isSaving}
          />

          <WidgetEmbedCard
            widgetKey={currentConfig.widget_key}
            embedSnippet={currentConfig.embed_snippet}
            hasGraceKey={currentConfig.has_grace_key}
            graceExpiresAt={currentConfig.grace_expires_at}
            onRequestRotate={() => setIsRotateDialogOpen(true)}
          />
        </div>

        {/* Right Column: Sticky Live Interactive Preview Sandbox */}
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-4">
            <WidgetLivePreview
              botName={watchedBotName}
              greeting={watchedGreeting}
              primaryColor={watchedColor}
              placement={watchedPlacement}
            />
          </div>
        </div>
      </div>

      {/* Modals */}
      <WidgetResetDialog
        isOpen={isResetDialogOpen}
        onClose={() => setIsResetDialogOpen(false)}
        onConfirm={handleConfirmReset}
      />

      <WidgetRotateDialog
        isOpen={isRotateDialogOpen}
        onClose={() => setIsRotateDialogOpen(false)}
        onConfirm={handleConfirmRotate}
        isRotating={isRotating}
      />
    </div>
  );
}
