# Project Context for AI Agents & Developers

- **Role:** Expert Senior Fullstack Software Engineer

## Project Overview

**Name:** Nochuay (Notion Clone)
**Type:** Hierarchical Note-Taking Application
**Goal:** MVP (v1.0.0) by Feb 19, 2026.
**Core Complexity:**

1.  **Recursive Data Structures:** Pages can be infinitely nested inside other pages.
2.  **Structured Content:** Page content is stored as block-based JSON, not HTML strings.

**About this Project:**
Nochuay web application is an application for taking notes, Work schedule, other like diary, project, etc. upgraded note taking web application. Mimic the layout of Notion which is sidebar to the left and space for user to taking note.

## Tech Stack & Architecture

### Backend (Golang)

- **Version:** Latest Stable
- **Framework:** Standard Library + `Echo` (or lightweight router).
- **Database:** PostgreSQL 17+.
- **ORM/Data Access:** Raw SQL or `sqlc` preferred over heavy ORMs.
- **Auth:** JWT (Stateless) + Argon2 for password hashing.
- **Key Architectural Pattern:**
  - **Layered:** `Handler` -> `Service` -> `Repository`.
  - **Tree Construction:** The "Sidebar" tree is constructed in the **Service Layer** after fetching a flat list from the Repo.
  - **Data Model:** `pages` table uses Adjacency List pattern (`parent_id` references `id`).

### Frontend (Next.js)

- **Framework:** Next.js 14+ (App Router).
- **Language:** TypeScript.
- **State Management:** Zustand (for global sidebar state).
- **Styling:** Tailwind CSS.
- **Editor:** BlockNote
- **UI Components:** `shadcn/ui` (Radix UI primitives). Do NOT build complex interactive components (modals, dropdowns) from scratch.
- **Icons:** `lucide-react`. Use these exclusively to match the Notion aesthetic.

### Infrastructure

- **Containerization:** Docker & Docker Compose.
- **CI/CD:** GitHub Actions (Build -> Test -> Lint).

---

## Configuration & Secrets (.env)

Agents MUST use these exact variable names for connection strings.

### Backend (.env)

PORT=8080
DB_HOST=db
DB_USER=postgres
DB_PASSWORD=secret
DB_NAME=nochuay_db
JWT_SECRET=change_this_to_something_secure
CORS_ALLOWED_ORIGINS=http://localhost:3000

### Frontend (.env.local)

NEXT_PUBLIC_API_URL=http://localhost:8080/api

---

## Core Data Schema (Source of Truth)

### Database Schema (PostgreSQL)

Agents MUST use this exact schema for migration files.

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES pages(id) ON DELETE CASCADE, -- Adjacency List
    title TEXT NOT NULL DEFAULT 'Untitled',
    icon VARCHAR(50), -- Emoji or URL
    cover_image TEXT,
    content JSONB DEFAULT '[]'::jsonb, -- Store the raw BlockNote JSON array here. Do NOT normalize blocks into a separate table for v1.0.
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_pages_parent_id ON pages(parent_id);
CREATE INDEX idx_pages_user_id ON pages(user_id);
```

### TypeScript Interfaces (Frontend)

Agents MUST use these types to ensure type safety with the backend.

```typescript
interface Page {
  id: string;
  userId: string;
  parentId: string | null;
  title: string;
  icon?: string;
  coverImage?: string;
  content: string; // JSON stringified or Block[]
  createdAt: string;
}

// The Recursive Tree Structure for Sidebar
interface PageNode extends Page {
  children: PageNode[];
  depth: number; // For indentation logic
}
```

---

## Build & Test Commands

### Development Environment

- **Start All Services:** `docker-compose up --build`
- **Backend Only (Hot Reload):** Uses `air`. Run inside container.
- **Frontend Only:** `cd frontend && npm run dev`

### Verification

- **Run Unit Tests (Go):** `go test -v ./...`
- **Run Linting (Go):** `go vet ./...`
- **Build Production Binary:** `go build -o bin/api ./cmd/api`

### Database Migrations

- **Up:** `migrate -path ./migrations -database "$DB_URL" up`
- **Down:** `migrate -path ./migrations -database "$DB_URL" down`

---

## Code Style & Generation Guidelines

### Development Guidelines (Go lang)

- **Write idiomatic Go code** following standard conventions and patterns
- **Apply Clean Architecture** with clear separation between layers
- **Use interface-driven development** with explicit dependency injection
- **Prefer composition over inheritance** with small, purpose-specific interfaces
- **Write short, focused functions** with single responsibility
- **Handle errors explicitly** using wrapped errors for traceability
- **Avoid global state** and use constructor functions for dependency injection

### Golang (Backend)

1.  **Error Handling:**
    - ALWAYS wrap errors with context before returning: `fmt.Errorf("failed to fetch page: %w", err)`.
    - NEVER panic. Return errors gracefully.
2.  **JSON Responses:**
    - Use a standardized `api.Response` struct: `{ "data": ..., "error": ... }`.
3.  **Variable Naming:**
    - Use `pageID`, `userID` (CamelCase with ID capitalized).
    - Use `ctx` for Context.
4.  **SQL Queries:**
    - Use **Recursive CTEs** (Common Table Expressions) for breadcrumbs and tree fetching.
    - Store page content as `JSONB`. Do not normalize blocks into a separate table for v1.0.
5.  **CORS Policy:**
    - You MUST configure CORS middleware (e.g., rs/cors or Echo's middleware).
    - Allow Access-Control-Allow-Origin: http://localhost:3000 (or \* for dev).
    - Allow Headers: Authorization, Content-Type.

#### Backend Structure

```
nochuay-back/
├── cmd/
│ └── api/
│ └── main.go # Entry point (Dependency Injection here)
├── internal/
│ ├── config/ # Load .env variables
│ ├── db/ # Database connection logic
│ ├── handler/ # HTTP Handlers (Parse JSON, Respond)
│ ├── model/ # Structs (User, Page)
│ ├── repository/ # SQL Queries (GORM or Sqlc)
│ └── service/ # Business Logic (Tree construction)
├── migrations/ # SQL migration files (001_init.sql)
├── docker-compose.yml # Infrastructure
├── Dockerfile # Build instructions
├── go.mod # Dependencies
└── .env # Secrets
```

### API Contract (v1.0.0)

All responses must follow this wrapper format:

```json
{
  "data": <Payload>,
  "error": null
}
```

## **Endpoint:**

| Method | Endpoint       | Description                   | Request Body             | Response Data             |
| ------ | -------------- | ----------------------------- | ------------------------ | ------------------------- |
| POST   | /auth/signup   | Register user                 | "{email, password}"      | "{token, user}"           |
| POST   | /auth/login    | Login user                    | "{email, password}"      | "{token, user}"           |
| GET    | /pages/sidebar | Critical: Returns nested tree | -                        | "[PageNode, PageNode...]" |
| POST   | /pages         | Create new page               | "{parentId, title}"      | Page                      |
| GET    | /pages/:id     | Get page details              | -                        | Page                      |
| PATCH  | /pages/:id     | Update properties             | "{title, icon, content}" | Page                      |
| DELETE | /pages/:id     | Delete page & children        | -                        | {success: true}           |

---

### TypeScript (Frontend)

1.  **Components:** Functional components only.
2.  **Props:** Define strict interfaces for all props. Avoid `any`.
3.  **Fetching:** Use Server Components for initial data fetch where possible. For dynamic client-side updates (like the recursive sidebar tree), strictly use **TanStack Query (v5)**. Do not use SWR or standard `useEffect` fetching.

4.  Use the Development Server, not `npm run build`

- Always use `npm run dev` (or `pnpm dev`, `yarn dev`, etc.) while
  iterating on the application. This starts Next.js in development
  mode with hot-reload enabled.
- Do NOT run `npm run build` inside the agent session. Running the
  production build switches the `.next` folder to production assets
  which disables hot reload.

6. Keep Dependencies in Sync

If you add or update dependencies remember to:
6.1. Update the appropriate lockfile
6.2. Re-start the development server so that Next.js picks up the changes
6.3. Coding Conventions - Prefer TypeScript (.tsx/.ts) for new components and utilities - Co-locate component-specific styles in the same folder as the component

7. Useful Commands Recap
   | Command | Purpose |
   |-----------------|------------------------------------------------------|
   | `npm run dev` | Start the Next.js dev server with HMR |
   | `npm run lint` | Run ESLint checks |
   | `npm run test` | Execute the test suite (if present) |
   | `npm run build` | Production build - do not run during agent sessions

8. **Editor State Guardrail:** BlockNote manages its own internal state. Use BlockNote's provided hooks. Do NOT attempt to sync editor keystrokes or raw block data into the global `Zustand` store. Only send the final JSON payload to the API on auto-save/debounce.

#### Frontend Structure

```text
nochuay-front/
├── app/
│   ├── (auth)/                 # Route Group: Auth pages
│   ├── (main)/                 # Route Group: Main app (Sidebar lives in layout.tsx here)
│   │   ├── documents/          # Editor view routes
│   │   └── page.tsx
│   ├── globals.css
│   └── layout.tsx
├── components/
│   ├── editor/                 # BlockNote wrappers
│   ├── layout/                 # Sidebar and SidebarItem (Recursive)
│   ├── modals/
│   └── ui/                     # shadcn/ui generated components
├── hooks/
├── lib/
│   ├── api.ts                  # Axios/Fetch calls matching the API Contract
│   └── utils.ts
├── store/                      # Zustand stores
└── middleware.ts               # JWT route protection
```

---

## Security Considerations (Strict Enforcement)

1.  **Authentication:**
    - All `/api/protected/*` routes MUST check the `Authorization: Bearer <token>` header.
    - The `user_id` must be extracted from the token claims, NOT the request body.
2.  **Authorization (Row Level Security logic):**
    - Every SQL query accessing `pages` MUST include `WHERE user_id = $1`.
    - Prevent IDOR (Insecure Direct Object Reference): A user cannot fetch/edit a page unless the `user_id` matches.
3.  **Input Validation:**
    - Sanitize all inputs.
    - Validate UUID format before querying the DB.
4.  **Boundaries**:
    - Never commit secrets, API keys, or credentials
    - Use environment variables for sensitive configuration
    - Review any changes to authentication or authorization code carefully

---

## Testing Instructions for AI Generation

When generating tests, follow this priority:

1.  **Unit Tests (Service Layer):** Focus on the **Tree Construction Algorithm**.
    - _Scenario:_ Given a flat list of pages [A (root), B (child of A), C (child of B)], verify the JSON output is nested correctly A -> B -> C.
2.  **Integration Tests (Repository Layer):**
    - _Scenario:_ Insert a page, insert a child, delete the parent. Verify the child is also deleted (Cascade).
