# Architecture Overview

This document describes the high-level architecture of the Nochuay application — a hierarchical note-taking web application inspired by Notion.

---

## System Architecture

Nochuay follows a **client-server architecture** with a clear separation between the frontend (Next.js) and backend (Go) communicating over a REST API.

```
┌──────────────────────────────────────────────────────────┐
│                      Browser (Port 3000)                 │
│  ┌────────────────────────────────────────────────────┐  │
│  │              Next.js App Router (React)             │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │  │
│  │  │  Zustand  │  │ TanStack │  │  BlockNote Editor │ │  │
│  │  │  Stores   │  │  Query   │  │  (Rich Text)      │ │  │
│  │  └──────────┘  └──────────┘  └──────────────────┘ │  │
│  └──────────────────────┬─────────────────────────────┘  │
│                         │ HTTP (fetch + Bearer JWT)       │
└─────────────────────────┼────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────┐
│                 Go Backend API (Port 8080)                │
│  ┌──────────┐  ┌──────────┐  ┌────────────────────────┐ │
│  │ Handlers │→ │ Services │→ │     Repositories        │ │
│  │ (HTTP)   │  │ (Logic)  │  │     (SQL/pgx)           │ │
│  └──────────┘  └──────────┘  └────────────┬───────────┘ │
│  ┌──────────────────────┐                 │              │
│  │ Middleware (JWT Auth) │                 │              │
│  └──────────────────────┘                 │              │
└───────────────────────────────────────────┼──────────────┘
                                            │
                                            ▼
                              ┌───────────────────────┐
                              │  PostgreSQL 17 (5432)  │
                              │  ┌─────────────────┐   │
                              │  │  users table     │   │
                              │  │  pages table     │   │
                              │  └─────────────────┘   │
                              └───────────────────────┘
```

---

## Backend Architecture (Go)

The backend follows a strict **Layered Architecture** with three distinct layers:

### Layer Diagram

```
HTTP Request
     │
     ▼
┌─────────────────────────────────────────┐
│              CORS Middleware             │  ← Sets Access-Control headers
├─────────────────────────────────────────┤
│              Auth Middleware             │  ← Validates JWT, injects userID
├─────────────────────────────────────────┤
│                                         │
│              Handler Layer              │  ← Parse HTTP, validate input,
│         (auth_handler.go,               │     format response
│          page_handler.go)               │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│              Service Layer              │  ← Business logic,
│         (auth_service.go,               │     tree construction,
│          page_service.go)               │     content validation
│                                         │
├─────────────────────────────────────────┤
│                                         │
│           Repository Layer              │  ← Raw SQL queries,
│         (user_repository.go,            │     database interaction
│          page_repository.go)            │
│                                         │
└─────────────────────────────────────────┘
                   │
                   ▼
            PostgreSQL (pgx pool)
```

### Layer Responsibilities

| Layer          | Location               | Responsibility                                                                                                                                 |
| -------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Handler**    | `internal/handler/`    | Parse HTTP requests, validate input format, call service, send response. Uses the standardized `response.JSON()` / `response.Error()` wrapper. |
| **Service**    | `internal/service/`    | Business logic: password hashing, JWT generation, tree construction from flat page list, content validation (JSON array check).                |
| **Repository** | `internal/repository/` | Direct database access via `pgx`. Parameterized SQL queries. Returns domain models.                                                            |
| **Middleware** | `internal/middleware/` | Cross-cutting concerns: JWT token extraction, userID injection into request context.                                                           |
| **Model**      | `internal/model/`      | Shared data structures (`User`, `Page`, `PageNode`).                                                                                           |
| **Config**     | `internal/config/`     | Environment variable loading with defaults and validation.                                                                                     |

### Dependency Injection

All dependencies are wired manually in `cmd/api/main.go`:

```go
// Repository -> Service -> Handler (bottom-up construction)
userRepo    := repository.NewUserRepository(pool)
pageRepo    := repository.NewPageRepository(pool)
authService := service.NewAuthService(userRepo, cfg.JWTSecret)
pageService := service.NewPageService(pageRepo)
authHandler := handler.NewAuthHandler(authService)
pageHandler := handler.NewPageHandler(pageService)
```

Each layer depends only on the **interface** of the layer below it:

- `AuthHandler` depends on the `AuthService` interface
- `AuthService` depends on the `UserRepository` interface
- `PageHandler` depends on the `PageService` interface
- `PageService` depends on the `PageRepository` interface

This enables unit testing each layer in isolation using mock implementations.

---

## Frontend Architecture (Next.js)

The frontend uses **Next.js App Router** with the following structure:

### Route Groups

```
app/
├── layout.tsx              ← Root layout (fonts, QueryProvider)
├── (auth)/                 ← Public route group (no sidebar)
│   ├── login/page.tsx      ← Login form
│   └── register/page.tsx   ← Registration form
└── (main)/                 ← Protected route group (sidebar + content)
    ├── layout.tsx          ← MainLayout (AuthGuard, Sidebar, content area)
    ├── page.tsx            ← Dashboard landing
    └── documents/
        └── [id]/page.tsx   ← Individual page editor view
```

### State Management

| Store               | Library        | Purpose                                                                       | Persistence    |
| ------------------- | -------------- | ----------------------------------------------------------------------------- | -------------- |
| `useUserStore`      | Zustand        | Auth state: `token`, `user`, `setAuth()`, `logout()`                          | `localStorage` |
| `useSidebarStore`   | Zustand        | UI state: `expandedIds` (Set), `renamingId`                                   | In-memory only |
| Sidebar tree data   | TanStack Query | `GET /pages/sidebar` via `pageKeys.sidebar.byUser(userID)`                    | Query cache    |
| Page detail data    | TanStack Query | `GET /pages/{id}` via `pageKeys.detail(userID, id)`                           | Query cache    |
| Search results      | TanStack Query | `GET /pages/search?q=...` via `pageKeys.search.byUser(userID, query)`         | Query cache    |
| Trash list          | TanStack Query | `GET /pages/trash` via `pageKeys.trash.byUser(userID)`                        | Query cache    |
| Page CRUD mutations | TanStack Query | Mutations: create, update, delete, restore, delete permanently, upload assets | —              |

### Data Flow

```
User Action (click, type)
     │
     ▼
Component (e.g., SidebarItem)
     │
     ├── Local state change (expand/collapse) → useSidebarStore
     │
     └── API mutation (create/delete page) → TanStack Mutation
              │
              ├── POST/PATCH/DELETE to backend via apiFetch()
              │
                ├── onSuccess → invalidateQueries(pageKeys.sidebar.all)
                │              invalidateQueries(pageKeys.search.all)
                │              invalidateQueries(pageKeys.detailPrefix)
                │              invalidateQueries(pageKeys.trash.all)
                                    │
                                    ▼
                              Sidebar re-renders with fresh data
```

### Editor Integration

The BlockNote editor is the core content editing component:

1. **Initialization:** `BlockNoteEditor` receives `pageId` and `initialContent` (JSON string)
2. **Editing:** User edits trigger `onChange` on every keystroke
3. **Auto-save:** Changes are debounced (1 second) then sent via `PATCH /pages/:id`
4. **Custom blocks:** A custom "page" block type allows embedding nested page links
5. **Slash menu:** Extended with a "Page" command that creates a child page and inserts a page block

---

## Core Data Pattern: Adjacency List

The most important architectural decision is the **Adjacency List** pattern for hierarchical pages:

```sql
pages.parent_id → pages.id  (self-referencing foreign key)
```

- A page with `parent_id = NULL` is a **root page**
- A page with `parent_id = <some UUID>` is a **child page**
- `ON DELETE CASCADE` ensures deleting a parent deletes all descendants

### Tree Construction

The sidebar tree is built in the **Service Layer** (not the database):

1. `Repository.GetPagesByUserID()` fetches a **flat list** of all user's pages
2. `Service.BuildTree()` constructs the nested `PageNode[]` tree in memory:
   - Creates a `map[UUID]*treeNode` for O(1) lookups
   - Iterates pages, linking children to parents via pointers
   - Recursively materializes the tree with depth values
3. The nested tree is sent as JSON to the frontend

This approach keeps the database queries simple while handling arbitrary nesting depths.

---

## Authentication Flow

```
1. User submits email + password
       │
       ▼
2. POST /auth/login (or /auth/signup)
       │
       ▼
3. Backend validates credentials (bcrypt verify)
       │
       ▼
4. Backend generates JWT (HS256, 72h expiry)
   Claims: { user_id: UUID, exp, iat }
       │
       ▼
5. Response: { token, user: { id, email } }
       │
       ▼
6. Frontend stores in localStorage + Zustand
       │
       ▼
7. All subsequent API calls include:
   Authorization: Bearer <JWT>
       │
       ▼
8. Auth middleware extracts userID → context
       │
       ▼
9. Handlers read userID from context (never from request body)
```

---

## Infrastructure

### Docker Compose Services

| Service    | Image/Build          | Depends On       | Purpose                               |
| ---------- | -------------------- | ---------------- | ------------------------------------- |
| `db`       | `postgres:17-alpine` | —                | PostgreSQL database with health check |
| `migrate`  | Backend Dockerfile   | `db` (healthy)   | Run SQL migrations then exit          |
| `app`      | Backend Dockerfile   | `db` + `migrate` | Go API with Air hot reload            |
| `frontend` | Frontend Dockerfile  | `app`            | Next.js dev server                    |

### Named Volumes

| Volume                  | Purpose                          |
| ----------------------- | -------------------------------- |
| `postgres_data`         | Persist database across restarts |
| `go_modules`            | Cache Go module downloads        |
| `frontend_node_modules` | Cache npm packages in container  |

---

## File Structure Summary

```
Nochuay/
├── docker-compose.yml          # Orchestrates all services
├── AGENTS.md                   # Project spec (source of truth)
├── doc/                        # Documentation (this folder)
├── nochuay-back/               # Go backend
│   ├── cmd/api/main.go         # Entry point + DI
│   ├── internal/               # Application code (layered)
│   ├── migrations/             # SQL migration files
│   └── Dockerfile              # Multi-stage: dev → builder → prod
└── nochuay-front/              # Next.js frontend
    ├── app/                    # App Router pages
    ├── components/             # React components
    ├── hooks/                  # TanStack Query hooks
    ├── lib/                    # API client + types
    ├── store/                  # Zustand stores
    └── Dockerfile              # Multi-stage: dev → deps → builder → prod
```

---

## Next Steps

- See the [API Reference](03-api-reference.md) for detailed endpoint documentation
- Read the [Database Guide](04-database-guide.md) for schema details
- Review the [Frontend Guide](05-frontend-guide.md) for component details
