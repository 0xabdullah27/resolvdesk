# Complete SEO, AEO & GEO Implementation Playbook
> **Instructions for AI Agent / Developer:** Use this step-by-step blueprint to configure complete Search Engine Optimization (SEO), Answer Engine Optimization (AEO), and Generative Engine Optimization (GEO) for any business or portfolio website.

---

## 📋 Table of Contents
1. [Phase 1: Google Search Console Verification](#phase-1-google-search-console-verification)
2. [Phase 2: Search Engine Directives (`robots.txt` & `sitemap.xml`)](#phase-2-search-engine-directives-robotstxt--sitemapxml)
3. [Phase 3: Next.js Metadata & OpenGraph Tags](#phase-3-nextjs-metadata--opengraph-tags)
4. [Phase 4: AEO & GEO Structured Data (Schema.org JSON-LD)](#phase-4-aeo--geo-structured-data-schemaorg-json-ld)
5. [Phase 5: Bidirectional Entity Authority (Backlinks)](#phase-5-bidirectional-entity-authority-backlinks)
6. [Phase 6: Verification & Submission Checklist](#phase-6-verification--submission-checklist)

---

## Phase 1: Google Search Console Verification

### Objective
Verify domain ownership on Google Search Console so Google can crawl and index the business.

### Steps:
1. Open [Google Search Console](https://search.google.com/search-console).
2. Choose **URL prefix** and enter the full website URL (e.g., `https://example-business.com`).
3. Under the **HTML file** verification method, copy the filename provided by Google (e.g., `google1234567890abcdef.html`).
4. In the project's `public/` directory, create that file with the exact content:
   ```html
   google-site-verification: google1234567890abcdef.html
   ```
5. Deploy/push to production (e.g., Vercel, Netlify).
6. Return to Google Search Console and click **VERIFY**.

---

## Phase 2: Search Engine Directives (`robots.txt` & `sitemap.xml`)

### 1. `robots.ts` (or `public/robots.txt`)
Tells search engine crawlers which routes are public and where to find the sitemap.

Create `src/app/robots.ts`:
```typescript
import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/admin/"], // Exclude backend routes
    },
    sitemap: "https://example-business.com/sitemap.xml",
  };
}
```

### 2. `sitemap.ts` (or `public/sitemap.xml`)
Provides search engines with an up-to-date index of all priority pages.

Create `src/app/sitemap.ts`:
```typescript
import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://example-business.com",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    // Add additional service/product/landing pages below:
    {
      url: "https://example-business.com/services",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];
}
```

---

## Phase 3: Next.js Metadata & OpenGraph Tags

### Objective
Ensure that search engines, social media (LinkedIn, X, WhatsApp previews), and search cards show high-converting titles, descriptions, and thumbnails.

Inside `src/app/layout.tsx`:
```typescript
import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://example-business.com"),
  title: "Business Name | Primary Service / Offering (Brand / Location)",
  description:
    "Clear 150-160 character description highlighting the core value proposition, services, target audience, and primary keywords.",
  keywords: [
    "Primary Business Keyword",
    "Service 1",
    "Service 2",
    "Location / Target Region Keyword",
    "Brand Name",
    "Industry Keyword",
  ],
  authors: [
    { name: "Founder / Business Name", url: "https://www.linkedin.com/company/your-handle" }
  ],
  creator: "Business Name",
  publisher: "Business Name",
  alternates: {
    canonical: "https://example-business.com",
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Business Name | Primary Service / Offering",
    description: "Clear and compelling summary for social share previews.",
    url: "https://example-business.com",
    siteName: "Business Name",
    images: [
      {
        url: "/og-image.jpg", // 1200x630 recommended
        width: 1200,
        height: 630,
        alt: "Business Name Preview Image",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Business Name | Primary Service / Offering",
    description: "Clear summary for X / Twitter card sharing.",
    creator: "@YourTwitterHandle",
    images: ["/og-image.jpg"],
  },
};
```

---

## Phase 4: AEO & GEO Structured Data (Schema.org JSON-LD)

### Objective
This is the core of **AEO (Answer Engine Optimization)** and **GEO (Generative Engine Optimization)**. It enables AI models (Perplexity, ChatGPT Search, Google Gemini, Google AI Overviews) to understand facts about the business and recommend it as a direct answer.

### Choose either **Organization / LocalBusiness** OR **Person**:

#### Option A: For a Business / Agency / Startup
Add this inside `src/app/layout.tsx` `<head>`:

```tsx
const businessJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization", // or "LocalBusiness", "Corporation", "ProfessionalService"
      "@id": "https://example-business.com/#organization",
      name: "Business Name",
      alternateName: ["Brand Alias", "Short Name"],
      url: "https://example-business.com",
      logo: "https://example-business.com/logo.png",
      image: "https://example-business.com/og-image.jpg",
      description: "Comprehensive summary of what the business does and problems it solves.",
      email: "contact@example-business.com",
      telephone: "+1-555-0199",
      address: {
        "@type": "PostalAddress",
        streetAddress: "123 Business St",
        addressLocality: "City",
        addressRegion: "State / Province",
        postalCode: "12345",
        addressCountry: "US",
      },
      sameAs: [
        "https://www.linkedin.com/company/your-business",
        "https://x.com/your_handle",
        "https://github.com/your-org",
        "https://www.instagram.com/your_handle",
        "https://www.facebook.com/your_page",
      ],
      knowsAbout: [
        "Core Skill 1",
        "Industry Specialization",
        "Primary Technology / Product",
        "Service Category",
      ],
      offers: {
        "@type": "AggregateOffer",
        priceCurrency: "USD",
        description: "Services and solutions offered by the company",
      },
    },
    {
      "@type": "WebSite",
      "@id": "https://example-business.com/#website",
      url: "https://example-business.com",
      name: "Business Name Official Website",
      description: "Official online portal for Business Name",
      publisher: {
        "@id": "https://example-business.com/#organization",
      },
    },
  ],
};

// In layout.tsx component return:
<head>
  <script
    type="application/ld+json"
    dangerouslySetInnerHTML={{ __html: JSON.stringify(businessJsonLd) }}
  />
</head>
```

---

## Phase 5: Bidirectional Entity Authority (Backlinks)

### Objective
Search engines determine authority through **cross-referenced links**. When major authority platforms link to the site and the site links back with structured schema, the entity gains maximum ranking power.

### Action Checklist:
1. **LinkedIn Profile / Company Page:**
   - Add website URL into the Header custom button ("Visit website").
   - Add website URL in the "About" > "Website" field.
2. **GitHub Organization / Profile:**
   - Add website URL to organization/profile website field and `README.md`.
3. **X / Twitter & Instagram:**
   - Add website link into the bio.
4. **Google Business Profile (if applicable):**
   - Register the business at [Google Business Profile](https://www.google.com/business/) and add the website link.

---

## Phase 6: Verification & Submission Checklist

After deploying the code:

1. [ ] **Test Sitemap**: Open `https://example-business.com/sitemap.xml` in browser to confirm it outputs valid XML.
2. [ ] **Test Robots**: Open `https://example-business.com/robots.txt` to confirm it outputs valid rules.
3. [ ] **Google Rich Results Test**: 
   - Visit [Google Rich Results Test](https://search.google.com/test/rich-results)
   - Paste the URL and verify valid `Organization` / `Person` schema without errors.
4. [ ] **Submit Sitemap in Google Search Console**:
   - Go to Search Console > **Sitemaps** > Enter `sitemap.xml` > Click **Submit**.
5. [ ] **Check Live Search Index**:
   - Search Google for: `site:example-business.com` to inspect active crawled pages.

---
*Playbook created for reuse across web and business projects.*
