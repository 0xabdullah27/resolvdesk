# ResolvDesk Frontend & Dashboard

Modern, high-performance web interface for ResolvDesk built with **Next.js 16 App Router**, **TypeScript**, **Tailwind CSS v4**, **Better Auth**, and **Redux Toolkit**.

<p align="center">
  <strong>Developed by <a href="https://abdullah-qureshi.vercel.app">Abdullah Qureshi</a></strong>
</p>

---

## 🚀 Key Highlights

- **Next.js 16 App Router**: Leverages Turbopack, React Server Components (RSC), and Server Actions for optimal performance and SEO.
- **Client-Side In-Memory Caching (<16ms)**: Persistent `DashboardProvider` caches overview metrics, documents, conversations, transcripts, and widget settings for zero-latency intra-dashboard navigation.
- **Better Auth Integration**: Stateful session management with automatic cookie issuance and an exposed JWKS public keys endpoint for stateless backend token verification.
- **Live Embeddable Storefront Widget**: Embeddable floating chat widget with online status indicator, bot customization preview, and non-technical installation guides for Shopify, WordPress, Wix, and Squarespace.
- **Optimistic UI Updates**: Status toggles (open/resolved) and document removals update the interface immediately with automatic rollback on network failure.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router with Turbopack)
- **Language**: TypeScript 5+
- **Styling**: Tailwind CSS v4, shadcn/ui
- **State Management**: Redux Toolkit & React Context
- **Authentication**: Better Auth with JWT & JWKS plugin
- **Icons & Visualization**: Lucide React, Recharts

---

## 💻 Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   Create a `.env.local` file in `frontend/`:
   ```env
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   BETTER_AUTH_URL=http://localhost:3000
   BETTER_AUTH_SECRET=resolvdesk-development-auth-secret-key-32chars
   DATABASE_URL=postgresql://<username>:<password>@<neon-host>/<database>?sslmode=require
   BACKEND_API_URL=http://localhost:8000
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```
   Access the app at [http://localhost:3000](http://localhost:3000).

---

## 🧪 Verification Commands

```bash
# Type check without emitting files
npx tsc --noEmit

# Production build verification
npm run build
```

---

## 👤 Author

**Abdullah Qureshi**
- 🌐 [Portfolio](https://abdullah-qureshi.vercel.app)
- 💼 [LinkedIn](https://www.linkedin.com/in/abdullahqureshi27)
- 🐙 [GitHub](https://github.com/abdullahqureshi27)
- 🐦 [X (Twitter)](https://x.com/abdullahqur27)
