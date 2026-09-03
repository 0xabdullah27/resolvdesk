---
name: redux-toolkit-typescript
description: Best practices and architecture for state management in Next.js 15/16 App Router using Redux Toolkit (RTK), RTK Query, and TypeScript. Covers makeStore per-request isolation, StoreProvider client wrappers, pre-typed hooks (useAppDispatch, useAppSelector), RTK Query API slices, cache tags, invalidation, optimistic updates, and React Server Component (RSC) boundary rules. Use this skill whenever setting up Redux state, creating RTK slices, building RTK Query endpoints, or managing complex client-side application state.
---

# Redux Toolkit & RTK Query (Next.js App Router + TypeScript)

Comprehensive guide for type-safe state management in Next.js App Router using Redux Toolkit (RTK) and RTK Query.

---

## 🧭 Scope & Anti-Conflict Boundaries

| Area | Ownership |
|---|---|
| **Redux Store Architecture** | ✅ **Covered in this skill** (`makeStore` factory, `StoreProvider` client boundary) |
| **Typed Hooks & Slices** | ✅ **Covered in this skill** (`useAppDispatch`, `useAppSelector`, `createSlice`) |
| **RTK Query & Caching** | ✅ **Covered in this skill** (`createApi`, cache tags, mutations, optimistic updates) |
| **RSC Integration Rules** | ✅ **Covered in this skill** (When to fetch in RSC vs RTK Query) |
| **Authentication State** | ❌ **NOT covered here**. Token persistence & headers belong to `better-auth-fullstack` or `production-jwt-auth`. |
| **Backend Route Handlers** | ❌ **NOT covered here**. Backend REST implementations belong to `fastapi-python-backend`. |

---

## 🏗️ Architecture in Next.js App Router

In Next.js App Router, **never** export a global singleton store instance. Because server requests run concurrently, sharing a global store across requests causes data leaks between users. Always use a `makeStore` factory function.

```
frontend/src/lib/redux/
├── store.ts             # makeStore, RootState, AppDispatch, AppStore
├── hooks.ts             # useAppDispatch, useAppSelector withTypes
├── StoreProvider.tsx    # Client Component wrapper using useRef
├── api/
│   └── apiSlice.ts      # RTK Query root API definition & tag types
└── features/
    ├── tasks/           # taskSlice.ts, tasksApi.ts
    └── ui/              # uiSlice.ts (modals, theme, sidebar state)
```

---

## 📦 Store Configuration (`src/lib/redux/store.ts`)

```typescript
import { configureStore } from "@reduxjs/toolkit";
import { apiSlice } from "./api/apiSlice";
import uiReducer from "./features/ui/uiSlice";

export const makeStore = () => {
  return configureStore({
    reducer: {
      [apiSlice.reducerPath]: apiSlice.reducer,
      ui: uiReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(apiSlice.middleware),
  });
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
```

---

## 🪝 Pre-Typed Hooks (`src/lib/redux/hooks.ts`)

Always use `useDispatch.withTypes` and `useSelector.withTypes` for full TypeScript inference.

```typescript
import { useDispatch, useSelector, useStore } from "react-redux";
import type { RootState, AppDispatch, AppStore } from "./store";

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
export const useAppStore = useStore.withTypes<AppStore>();
```

---

## 🛡️ StoreProvider (`src/lib/redux/StoreProvider.tsx`)

Use `useRef` to guarantee that the store is instantiated only once per client session.

```tsx
"use client";

import { useRef } from "react";
import { Provider } from "react-redux";
import { makeStore, type AppStore } from "./store";

export default function StoreProvider({ children }: { children: React.ReactNode }) {
  const storeRef = useRef<AppStore | null>(null);
  
  if (!storeRef.current) {
    storeRef.current = makeStore();
  }

  return <Provider store={storeRef.current}>{children}</Provider>;
}
```

Wrap your root layout with `StoreProvider`:
```tsx
// src/app/layout.tsx
import StoreProvider from "@/lib/redux/StoreProvider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
```

---

## 🌐 RTK Query API Slices & Cache Invalidation

```typescript
// src/lib/redux/features/tasks/tasksApi.ts
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export interface Task {
  id: number;
  title: string;
  description?: string;
  completed: boolean;
}

export const tasksApi = createApi({
  reducerPath: "tasksApi",
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api",
    prepareHeaders: (headers) => {
      // Access token retrieval from auth storage
      const token = typeof window !== "undefined" ? localStorage.getItem("better_auth_jwt") : null;
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ["Tasks"],
  endpoints: (builder) => ({
    getTasks: builder.query<Task[], void>({
      query: () => "/tasks/",
      providesTags: (result) =>
        result
          ? [...result.map(({ id }) => ({ type: "Tasks" as const, id })), { type: "Tasks", id: "LIST" }]
          : [{ type: "Tasks", id: "LIST" }],
    }),
    addTask: builder.mutation<Task, Partial<Task>>({
      query: (body) => ({
        url: "/tasks/",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Tasks", id: "LIST" }],
    }),
    toggleTask: builder.mutation<Task, { id: number; completed: boolean }>({
      query: ({ id, ...patch }) => ({
        url: `/tasks/${id}`,
        method: "PATCH",
        body: patch,
      }),
      // Optimistic UI Update
      async onQueryStarted({ id, completed }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          tasksApi.util.updateQueryData("getTasks", undefined, (draft) => {
            const task = draft.find((t) => t.id === id);
            if (task) task.completed = completed;
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo(); // Roll back on failure
        }
      },
      invalidatesTags: (result, error, { id }) => [{ type: "Tasks", id }],
    }),
  }),
});

export const { useGetTasksQuery, useAddTaskMutation, useToggleTaskMutation } = tasksApi;
```

---

## ⚖️ When to Use RSC vs RTK Query

*   **Use React Server Components (RSC)**: For initial static page loads, SEO-critical content, and data that does not change rapidly with client interaction.
*   **Use RTK Query**: For dynamic client-side interactivity, live searches, frequent mutations (creating/editing tasks), modal dialog states, and real-time polling.
