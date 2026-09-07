import * as React from "react";
import type { Metadata } from "next";
import { WidgetCustomizerContainer } from "@/components/widget/widget-customizer-container";

export const metadata: Metadata = {
  title: "Widget Customizer - ResolvDesk",
  description: "Customize appearance, greeting, allowed domains, and embed your autonomous support widget.",
};

export default function WidgetPage() {
  return <WidgetCustomizerContainer />;
}
