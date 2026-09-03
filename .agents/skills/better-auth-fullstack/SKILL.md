---
name: better-auth-fullstack
description: End-to-end full-stack authentication integration using Better Auth with Next.js 16 (Auth Server) and FastAPI (Resource Server). Use this skill whenever configuring Better Auth server plugins (JWT, JWKS), Better Auth client hooks (signIn, signUp, signOut, token), Next.js JWKS endpoint exposing public keys, Axios JWT Bearer interceptors, and FastAPI PyJWKClient token verification dependencies.
---

# Better Auth Full-Stack (Next.js + FastAPI JWKS)

Comprehensive guide for implementing full-stack authentication where **Next.js** acts as the Authentication Authority (via Better Auth) and **FastAPI** acts as a stateless Resource Server verifying RSA-signed JWTs via JWKS.

---

## 🧭 Scope & Architecture Pattern (Pattern A)

```
Next.js (Auth Authority)                   FastAPI (Resource Server)
┌────────────────────────────────┐         ┌────────────────────────────────┐
│  Better Auth Server (auth.ts)  │         │  FastAPI Endpoints             │
│  - User signup / signin        │         │  - Receives Bearer Token       │
│  - Manages sessions & tables   │         │  - Fetches JWKS Public Keys    │
│  - Signs JWTs (RS256)          │──JWKS──▶│  - Validates signature & sub   │
│  - Exposes /.well-known/jwks   │         │  - Enforces User Isolation     │
└────────────────────────────────┘         └────────────────────────────────┘
```

| Area | Ownership |
|---|---|
| **Better Auth Server Config** | ✅ **Covered in this skill** (`auth.ts`, PostgreSQL pool, `jwt()` plugin) |
| **Better Auth Client Config** | ✅ **Covered in this skill** (`auth-client.ts`, `jwtClient()`, token storage) |
| **JWKS Key Verification (FastAPI)** | ✅ **Covered in this skill** (`PyJWKClient`, `get_current_user` dependency) |
| **Axios Token Interceptor** | ✅ **Covered in this skill** (Attaching Bearer token to API requests) |
| **Custom Backend JWT Issuance** | ❌ **NOT covered here**. For manual JWT creation in FastAPI with refresh cookies, use `production-jwt-auth`. |

---

## 🖥️ Next.js Server Configuration (`better-auth`)

Install dependencies in frontend:
```bash
npm install better-auth @neondatabase/serverless
```

### 1. Server Configuration (`src/lib/auth.ts`)
```typescript
import { betterAuth } from "better-auth";
import { jwt } from "better-auth/plugins";
import { Pool } from "@neondatabase/serverless";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const auth = betterAuth({
  database: pool,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  secret: process.env.BETTER_AUTH_SECRET!,
  trustedOrigins: [
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  ],
  plugins: [
    jwt({
      jwks: {
        jwksPath: "/.well-known/jwks.json", // Exposes JWKS endpoint
      },
    }),
  ],
});

export type Session = typeof auth.$Infer.Session;
```

### 2. Next.js Auth Route Handler (`src/app/api/auth/[...all]/route.ts`)
```typescript
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
```

---

## 💻 Next.js Client Configuration

### 1. Auth Client with JWT Plugin (`src/lib/auth-client.ts`)
```typescript
"use client";

import { createAuthClient } from "better-auth/react";
import { jwtClient } from "better-auth/client/plugins";

const JWT_STORAGE_KEY = "better_auth_jwt";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  plugins: [
    jwtClient({
      jwks: {
        jwksPath: "/.well-known/jwks.json",
      },
    }),
  ],
  fetchOptions: {
    onSuccess: (ctx) => {
      // Capture JWT token from response headers on session refresh
      const token = ctx.response.headers.get("set-auth-jwt");
      if (token && typeof window !== "undefined") {
        localStorage.setItem(JWT_STORAGE_KEY, token);
      }
    },
  },
});

export const { signIn, signUp, signOut, useSession } = authClient;

export function getStoredJwt(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(JWT_STORAGE_KEY);
}

export async function fetchAndStoreJwt(): Promise<string | null> {
  try {
    const { data, error } = await authClient.token();
    if (error || !data?.token) return null;
    if (typeof window !== "undefined") {
      localStorage.setItem(JWT_STORAGE_KEY, data.token);
    }
    return data.token;
  } catch {
    return null;
  }
}
```

### 2. Axios Request Interceptor (`src/lib/api-client.ts`)
```typescript
import axios from "axios";
import { getStoredJwt } from "./auth-client";

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
});

apiClient.interceptors.request.use((config) => {
  const token = getStoredJwt();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

---

## 🐍 FastAPI JWT Verification (JWKS)

Install dependencies in backend:
```bash
uv add pyjwt[crypto] requests
```

### 1. PyJWKClient Security Dependency (`src/core/security.py`)
```python
import jwt
from jwt import PyJWKClient
from typing import Dict, Any, Annotated
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from src.core.config import settings

# Point to Next.js JWKS endpoint
JWKS_URL = f"{settings.better_auth_url}/api/auth/.well-known/jwks.json"
jwks_client = PyJWKClient(JWKS_URL, cache_keys=True, max_cached_keys=10)

security_scheme = HTTPBearer()

def verify_jwt(token: str) -> Dict[str, Any]:
    """Decodes and validates RSA-signed JWT using Next.js JWKS public keys."""
    try:
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            options={"verify_aud": False}, # Adjust if audience is configured in Better Auth
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token has expired.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security_scheme)]
) -> str:
    """Dependency that extracts and returns verified user_id (sub claim)."""
    token = credentials.credentials
    payload = verify_jwt(token)
    user_id: str | None = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing user subject claim (sub).",
        )
    return user_id

# Type alias for clean endpoint injection
CurrentUser = Annotated[str, Depends(get_current_user)]
```

### 2. Protecting FastAPI Endpoints
```python
# src/routers/tasks.py
from fastapi import APIRouter
from src.core.security import CurrentUser

router = APIRouter(prefix="/api/tasks", tags=["Tasks"])

@router.get("/")
async def get_user_tasks(user_id: CurrentUser):
    # user_id is cryptographically guaranteed from verified JWT
    return {"user_id": user_id, "tasks": []}
```

---

## 🧪 Testing JWT Verification in FastAPI

```python
# tests/test_auth.py
import pytest
from unittest.mock import patch

def test_protected_route_without_token(client):
    response = client.get("/api/tasks/")
    assert response.status_code == 403 or response.status_code == 401

@patch("src.core.security.verify_jwt")
def test_protected_route_with_valid_jwt(mock_verify, client):
    mock_verify.return_value = {"sub": "user_12345"}
    
    headers = {"Authorization": "Bearer mock.valid.jwt"}
    response = client.get("/api/tasks/", headers=headers)
    
    assert response.status_code == 200
```
