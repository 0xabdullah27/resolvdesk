import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.NEXT_PUBLIC_APP_URL &&
  !process.env.NEXT_PUBLIC_APP_URL.includes("localhost")
    ? process.env.NEXT_PUBLIC_APP_URL
    : "https://resolvdesk.vercel.app");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "ResolvDesk - Autonomous Multi-Tenant AI Support Platform",
    template: "%s | ResolvDesk",
  },
  description:
    "Empower your website and ecommerce storefront with an autonomous, grounded AI customer support assistant featuring instant RAG search, embeddable widget, and human ticket escalation.",
  keywords: [
    "AI Customer Support",
    "Autonomous Support Agent",
    "Grounded RAG",
    "Ecommerce Chatbot",
    "Shopify Support Bot",
    "WooCommerce AI Support",
    "Embeddable Chat Widget",
    "Ticket Escalation",
    "Multi-Tenant AI Helpdesk",
    "ResolvDesk",
    "Abdullah Qureshi",
  ],
  authors: [
    {
      name: "Abdullah Qureshi",
      url: "https://abdullah-qureshi.vercel.app",
    },
  ],
  creator: "Abdullah Qureshi",
  publisher: "ResolvDesk",
  alternates: {
    canonical: siteUrl,
  },
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "ResolvDesk - Autonomous Multi-Tenant AI Support Platform",
    description:
      "Autonomous multi-tenant AI customer support platform with grounded RAG, embeddable storefront widget, and real-time ticket escalation.",
    url: siteUrl,
    siteName: "ResolvDesk",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ResolvDesk - Autonomous Multi-Tenant AI Support Platform",
    description:
      "Autonomous multi-tenant AI customer support platform with grounded RAG, embeddable storefront widget, and real-time ticket escalation.",
    creator: "@abdullahqureshi",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? {
        verification: {
          google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
        },
      }
    : {}),
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": ["Organization", "SoftwareApplication"],
      "@id": `${siteUrl}/#organization`,
      name: "ResolvDesk",
      alternateName: ["ResolvDesk AI", "ResolvDesk Platform"],
      url: siteUrl,
      description:
        "Autonomous multi-tenant AI customer support platform with grounded RAG, embeddable storefront widget, and real-time ticket escalation.",
      applicationCategory: "BusinessApplication",
      operatingSystem: "All (Web-based)",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        description:
          "Free tier with premium multi-tenant customer support capabilities",
      },
      founder: {
        "@type": "Person",
        name: "Abdullah Qureshi",
        url: "https://abdullah-qureshi.vercel.app",
        sameAs: [
          "https://www.linkedin.com/in/abdullahqureshi27",
          "https://github.com/abdullahqureshi27",
        ],
      },
      sameAs: [
        "https://github.com/abdullahqureshi27/resolvdesk",
        "https://resolvdesk.vercel.app",
      ],
      knowsAbout: [
        "Autonomous AI Customer Support",
        "Retrieval-Augmented Generation (RAG)",
        "Storefront Support Widgets",
        "Shopify & WooCommerce AI Chatbots",
        "Multi-Tenant Database Isolation",
        "Real-Time Human Escalation",
      ],
      featureList: [
        "Autonomous streaming AI responses grounded strictly in merchant documentation",
        "Universal 1-line script embed for Shopify, WooCommerce, Wix, Squarespace, and custom websites",
        "Automated human ticket escalation with complete preserved conversation transcripts",
        "Multi-tenant data isolation enforced at database query level",
        "Instant sub-16ms client-side cached dashboard navigation",
        "Zero-downtime 24-hour dual-key API key rotation",
        "Multi-format document ingestion (PDF, DOCX, TXT, MD) with semantic chunking",
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: siteUrl,
      name: "ResolvDesk - AI Support Agent Platform",
      description:
        "Empower your ecommerce storefront and web app with an autonomous, grounded AI customer support assistant.",
      publisher: {
        "@id": `${siteUrl}/#organization`,
      },
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
