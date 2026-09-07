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
    default:
      "ResolvDesk - Free AI Chatbot for Website & Ecommerce | 1-Line Embed",
    template: "%s | ResolvDesk - Free AI Chatbot for Website",
  },
  description:
    "Add a free AI chatbot to your website or ecommerce store in 2 minutes. Just paste 1 line of HTML code to answer customer questions 24/7, resolve tickets, and boost sales.",
  keywords: [
    "free ai chatbot for website",
    "free ecommerce chatbot",
    "add chatbot to website",
    "1 line code chatbot",
    "free shopify ai chatbot",
    "woocommerce ai chatbot",
    "free customer support bot",
    "website chat widget",
    "ai assistant for online store",
    "embed ai chatbot",
    "free website chatbot",
    "customer service chatbot",
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
    title: "ResolvDesk - Free AI Chatbot for Website & Ecommerce | 1-Line Embed",
    description:
      "Add a free AI customer support chatbot to any website in under 2 minutes with 1 line of code. Completely free, works on Shopify, WooCommerce, and custom websites.",
    url: siteUrl,
    siteName: "ResolvDesk",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ResolvDesk - Free AI Chatbot for Website & Ecommerce | 1-Line Embed",
    description:
      "Add a free AI customer support chatbot to any website in under 2 minutes with 1 line of code. Completely free, works on Shopify, WooCommerce, and custom websites.",
    creator: "@abdullahqur27",
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
      alternateName: [
        "ResolvDesk Free AI Chatbot",
        "ResolvDesk Website Chatbot Widget",
        "ResolvDesk Ecommerce Bot",
      ],
      url: siteUrl,
      description:
        "Free AI customer support chatbot for websites and ecommerce stores. Add an intelligent 24/7 assistant to Shopify, WooCommerce, or any website with a single line of HTML code.",
      applicationCategory: "BusinessApplication",
      operatingSystem: "All (Web-based)",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        description:
          "100% Free AI chatbot with unlimited website visitor support",
      },
      founder: {
        "@type": "Person",
        name: "Abdullah Qureshi",
        url: "https://abdullah-qureshi.vercel.app",
        sameAs: [
          "https://www.linkedin.com/in/abdullahqureshi27",
          "https://github.com/abdullahqureshi27",
          "https://x.com/abdullahqur27",
        ],
      },
      sameAs: [
        "https://github.com/abdullahqureshi27/resolvdesk",
        "https://resolvdesk.vercel.app",
      ],
      knowsAbout: [
        "Free AI Chatbot for Website",
        "Ecommerce Customer Support",
        "Shopify AI Chatbot",
        "WooCommerce Support Widget",
        "1-Line Website Embed",
        "24/7 Customer Service Automation",
        "Ticket Escalation",
      ],
      featureList: [
        "100% Free AI customer support chatbot for websites and online stores",
        "Simple 1-line HTML copy-paste embed code (ready in under 2 minutes)",
        "Answers visitor questions 24/7 automatically from your store FAQs & documents",
        "Seamless compatibility with Shopify, WooCommerce, Wix, Squarespace, and custom websites",
        "Instant human ticket escalation with complete preserved conversation history",
        "Fast dashboard with instant document uploads and key management",
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: siteUrl,
      name: "ResolvDesk - Free AI Chatbot for Website",
      description:
        "Add a free AI customer support chatbot to your website or online store in 2 minutes with 1 line of code.",
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
