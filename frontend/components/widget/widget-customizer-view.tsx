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
  onConfigUpdated?: (config: WidgetConfig) => void;
}

export function WidgetCustomizerView({
  initialConfig,
  onConfigUpdated,
}: WidgetCustomizerViewProps) {
  // Live widget key and grace window state (updated on key rotation)
  const [currentConfig, setCurrentConfig] = React.useState<WidgetConfig>(initialConfig);

  // Dialog & pending states
  const [isSaving, setIsSaving] = React.useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = React.useState(false);
  const [isRotateDialogOpen, setIsRotateDialogOpen] = React.useState(false);
  const [isRotating, setIsRotating] = React.useState(false);

  // Initialize form with existing configuration
  const initialDomains =
    !initialConfig.allowed_origins || initialConfig.allowed_origins.trim() === "*"
      ? "localhost"
      : initialConfig.allowed_origins;

  const form = useForm<WidgetFormValues>({
    resolver: zodResolver(widgetFormSchema),
    defaultValues: {
      bot_display_name: initialConfig.bot_display_name || WIDGET_DEFAULTS.bot_display_name,
      welcome_message: initialConfig.welcome_message || WIDGET_DEFAULTS.welcome_message,
      primary_color: initialConfig.primary_color || WIDGET_DEFAULTS.primary_color,
      widget_placement: initialConfig.widget_placement || WIDGET_DEFAULTS.widget_placement,
      restricted_domains: initialDomains,
    },
  });

  const { watch, handleSubmit, reset } = form;

  // Synchronize internal state & form when initialConfig updates from server or cache
  React.useEffect(() => {
    setCurrentConfig(initialConfig);
    const resolvedDomains =
      !initialConfig.allowed_origins || initialConfig.allowed_origins.trim() === "*"
        ? "localhost"
        : initialConfig.allowed_origins;
    reset({
      bot_display_name: initialConfig.bot_display_name || WIDGET_DEFAULTS.bot_display_name,
      welcome_message: initialConfig.welcome_message || WIDGET_DEFAULTS.welcome_message,
      primary_color: initialConfig.primary_color || WIDGET_DEFAULTS.primary_color,
      widget_placement: initialConfig.widget_placement || WIDGET_DEFAULTS.widget_placement,
      restricted_domains: resolvedDomains,
    });
  }, [initialConfig, reset]);

  // Real-time reactive preview synchronization (<50ms via watch)
  const watchedBotName = watch("bot_display_name");
  const watchedGreeting = watch("welcome_message");
  const watchedColor = watch("primary_color");
  const watchedPlacement = watch("widget_placement");

  // Save changes handler
  const onSave = handleSubmit(async (values: WidgetFormValues) => {
    setIsSaving(true);

    const cleaned = normalizeDomains(values.restricted_domains || "");
    const resolvedOrigins = cleaned || "localhost";

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
        onConfigUpdated?.(res.data);
        reset({
          bot_display_name: res.data.bot_display_name,
          welcome_message: res.data.welcome_message,
          primary_color: res.data.primary_color,
          widget_placement: res.data.widget_placement,
          restricted_domains: res.data.allowed_origins || "localhost",
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
      restricted_domains: WIDGET_DEFAULTS.restricted_domains,
    });
    toast.info("Form reset to defaults. Click 'Save Changes' to apply.");
  };

  // Native bottom-boundary sticky sidebar for desktop live preview
  const previewStickyRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = previewStickyRef.current;
    if (!el) return;

    // Detect closest scrollable ancestor (<main className="overflow-y-auto"> in dashboard or window)
    const getScrollParent = (node: HTMLElement | null): HTMLElement | Window => {
      let parent = node?.parentElement;
      while (parent && parent !== document.body && parent !== document.documentElement) {
        const { overflowY } = window.getComputedStyle(parent);
        if (overflowY === "auto" || overflowY === "scroll") {
          return parent;
        }
        parent = parent.parentElement;
      }
      return window;
    };

    const scrollParent = getScrollParent(el);
    const isWindow = scrollParent === window;

    const getViewportHeight = () =>
      isWindow ? window.innerHeight : (scrollParent as HTMLElement).clientHeight;

    const updateSticky = () => {
      // Standard layout on mobile/tablet screens (< 1024px)
      if (window.innerWidth < 1024) {
        el.style.position = "";
        el.style.top = "";
        return;
      }

      const topPadding = 16;
      const bottomPadding = 16;
      const viewportHeight = getViewportHeight();
      const elHeight = el.offsetHeight;

      el.style.position = "sticky";

      // If sidebar preview fits within viewport, stick at top padding
      if (elHeight + topPadding + bottomPadding <= viewportHeight) {
        el.style.top = `${topPadding}px`;
      } else {
        // Taller than viewport: both scroll from top, and right locks at bottom edge
        // On upward scroll, it stays pinned until scroll reaches back to the top of the section
        const minTop = viewportHeight - elHeight - bottomPadding;
        el.style.top = `${minTop}px`;
      }
    };

    window.addEventListener("resize", updateSticky);

    const resizeObserver = new ResizeObserver(() => {
      updateSticky();
    });
    resizeObserver.observe(el);

    updateSticky();

    return () => {
      window.removeEventListener("resize", updateSticky);
      resizeObserver.disconnect();
    };
  }, []);

  // Safe key rotation handler
  const handleConfirmRotate = async () => {
    setIsRotating(true);
    try {
      const res = await rotateWidgetKeyAction();
      if (res.success && res.data) {
        const rotatedConfig: WidgetConfig = {
          ...currentConfig,
          widget_key: res.data.new_widget_key,
          previous_widget_key: res.data.previous_widget_key,
          grace_expires_at: res.data.grace_expires_at,
          has_grace_key: true,
          embed_snippet: res.data.embed_snippet,
        };
        setCurrentConfig(rotatedConfig);
        onConfigUpdated?.(rotatedConfig);
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
          <div ref={previewStickyRef}>
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
