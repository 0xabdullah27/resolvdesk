---
name: nextjs-app-router
description: Best practices, architecture, and conventions for building modern web applications with Next.js 15/16 App Router, TypeScript, Tailwind CSS v4, React Hook Form, Zod, Axios, Server-Sent Events (SSE) consumption, and Jest/React Testing Library. Use this skill whenever creating or modifying Next.js routes, server and client components, forms, validation schemas, HTTP client setup, UI styling with Tailwind v4, streaming client hooks, and frontend unit/integration tests.
---

# Next.js App Router & Frontend Architecture

Comprehensive guide for building full-stack web applications using Next.js 15/16 App Router, TypeScript, Tailwind CSS v4, React Hook Form, Zod, and Axios.

---

## 🧭 Scope & Anti-Conflict Boundaries

| Area | Ownership |
|---|---|
| **Routing & RSC Architecture** | ✅ **Covered in this skill** (App Router, Server vs Client components, layouts, error/loading) |
| **Styling & UI** | ✅ **Covered in this skill** (Tailwind CSS v4 `@theme`, utility classes, CVA components) |
| **Forms & Validation** | ✅ **Covered in this skill** (React Hook Form, Zod schema resolvers) |
| **API Client & SSE Consumption**| ✅ **Covered in this skill** (Axios client base setup, SSE stream hooks) |
| **Frontend Testing** | ✅ **Covered in this skill** (Jest, React Testing Library, MSW mocks) |
| **Authentication & Tokens** | ❌ **NOT covered here**. For Better Auth use `better-auth-fullstack`. For manual JWT cookies use `production-jwt-auth`. |
| **Global State Management** | ❌ **NOT covered here**. For Redux store & RTK Query use `redux-toolkit-typescript`. |

---

## 🏗️ Project Structure Conventions

```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Root layout (fonts, providers, global styles)
│   │   ├── page.tsx           # Landing / home page (Server Component)
│   │   ├── (auth)/            # Auth route group (sign-in, sign-up)
│   │   ├── dashboard/         # Protected application layout & pages
│   │   └── api/               # Next.js Route Handlers (if needed)
│   ├── components/            # Reusable UI components
│   │   ├── ui/                # Base design system primitives (Button, Input, Modal)
│   │   └── tasks/             # Domain-specific components (TaskList, TaskCard)
│   ├── hooks/                 # Custom React hooks (useSSEStream, useDebounce)
│   ├── lib/
│   │   ├── api-client.ts      # Configured Axios instance
│   │   ├── utils.ts           # clsx / tailwind-merge helper (cn)
│   │   └── validations/       # Zod schemas
│   └── types/                 # TypeScript interfaces and types
├── public/                    # Static assets
└── package.json
```

---

## ⚡ React Server Components (RSC) vs Client Components

*   **Server Components (Default)**: Use for data fetching, backend API calls, and static content. No browser APIs (`window`, `localStorage`) or React hooks (`useState`, `useEffect`).
*   **Client Components (`"use client"`)**: Keep boundaries small and low in the DOM tree. Use only for user interactivity, event listeners, form inputs, and browser state.

```tsx
// src/app/tasks/page.tsx (Server Component)
import { Suspense } from "react";
import TaskList from "@/components/tasks/TaskList";
import TaskLoadingSkeleton from "@/components/tasks/TaskLoadingSkeleton";

export default async function TasksPage() {
  return (
    <main className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Your Tasks</h1>
      <Suspense fallback={<TaskLoadingSkeleton />}>
        <TaskList />
      </Suspense>
    </main>
  );
}
```

---

## 🎨 Tailwind CSS v4 Configuration (CSS-First)

Tailwind v4 eliminates `tailwind.config.js` in favor of native CSS `@theme` directives in `src/app/globals.css`.

```css
/* src/app/globals.css */
@import "tailwindcss";

@theme {
  --color-primary-50: #eff6ff;
  --color-primary-500: #3b82f6;
  --color-primary-600: #2563eb;
  --font-sans: var(--font-inter), sans-serif;
  --radius-custom: 0.75rem;
}

@layer utilities {
  .glassmorphism {
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }
}
```

### Class Merging Utility (`cn`)
```typescript
// src/lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

## 📝 Forms & Schema Validation (React Hook Form + Zod)

```typescript
// src/lib/validations/task.ts
import { z } from "zod";

export const taskSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title is too long"),
  description: z.string().max(2000, "Description max 2000 characters").optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
});

export type TaskFormValues = z.infer<typeof taskSchema>;
```

```tsx
// src/components/tasks/TaskForm.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { taskSchema, type TaskFormValues } from "@/lib/validations/task";
import { cn } from "@/lib/utils";

interface TaskFormProps {
  onSubmit: (data: TaskFormValues) => Promise<void>;
  isLoading?: boolean;
}

export default function TaskForm({ onSubmit, isLoading }: TaskFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: { title: "", description: "", priority: "medium" },
  });

  const handleFormSubmit = async (values: TaskFormValues) => {
    await onSubmit(values);
    reset();
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Task Title</label>
        <input
          {...register("title")}
          className={cn(
            "w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary-500",
            errors.title && "border-red-500"
          )}
          placeholder="What needs to be done?"
        />
        {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-500 disabled:opacity-50"
      >
        {isLoading ? "Saving..." : "Create Task"}
      </button>
    </form>
  );
}
```

---

## 🌐 Axios HTTP Client Setup

Create a centralized Axios instance with baseURL and error formatting. (Auth tokens are attached via interceptors defined in the Auth skill).

```typescript
// src/lib/api-client.ts
import axios from "axios";

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.detail || error.message || "An unexpected error occurred.";
    return Promise.reject(new Error(message));
  }
);
```

---

## 📡 Consuming Server-Sent Events (SSE) in React

```typescript
// src/hooks/useSSEStream.ts
"use client";

import { useState, useCallback } from "react";

export function useSSEStream() {
  const [data, setData] = useState<string>("");
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const startStream = useCallback(async (url: string, token?: string) => {
    setIsStreaming(true);
    setData("");
    setError(null);

    try {
      const response = await fetch(url, {
        headers: {
          Accept: "text/event-stream",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok || !response.body) {
        throw new Error(`Stream connection failed: ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const payload = line.slice(6).trim();
            if (payload === "[DONE]") {
              setIsStreaming(false);
              return;
            }
            try {
              const parsed = JSON.parse(payload);
              if (parsed.token) setData((prev) => prev + parsed.token);
            } catch {
              setData((prev) => prev + payload);
            }
          }
        }
      }
    } catch (err: any) {
      setError(err.message || "Streaming error occurred");
    } finally {
      setIsStreaming(false);
    }
  }, []);

  return { data, isStreaming, error, startStream };
}
```

---

## 🧪 Testing with Jest & React Testing Library

```tsx
// src/components/tasks/TaskForm.test.tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import TaskForm from "./TaskForm";

describe("TaskForm Component", () => {
  it("renders input field and submit button", () => {
    render(<TaskForm onSubmit={jest.fn()} />);
    expect(screen.getByPlaceholderText(/what needs to be done/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create task/i })).toBeInTheDocument();
  });

  it("shows validation error on empty submission", async () => {
    render(<TaskForm onSubmit={jest.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /create task/i }));

    await waitFor(() => {
      expect(screen.getByText(/title is required/i)).toBeInTheDocument();
    });
  });
});
```
