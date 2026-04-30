# Frontend Guide

This document covers the Next.js frontend architecture, component structure, state management, editor integration, and key implementation details.

---

## Tech Stack

| Technology     | Version | Purpose                                         |
| -------------- | ------- | ----------------------------------------------- |
| Next.js        | 16+     | React framework with App Router                 |
| React          | 19      | UI library                                      |
| TypeScript     | 5+      | Type-safe JavaScript                            |
| Zustand        | 5       | Lightweight global state management             |
| TanStack Query | 5       | Server state management (data fetching/caching) |
| BlockNote      | 0.46    | Block-based rich text editor                    |
| Tailwind CSS   | 4       | Utility-first CSS framework                     |
| shadcn/ui      | —       | Radix UI-based component library                |
| Lucide React   | —       | Icon library                                    |

---

## Directory Structure

```
nochuay-front/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout (fonts, QueryProvider)
│   ├── globals.css               # Tailwind CSS + theme variables
│   ├── (auth)/                   # Public route group
│   │   ├── login/page.tsx        # Login page
│   │   └── register/page.tsx     # Registration page
│   └── (main)/                   # Protected route group
│       ├── layout.tsx            # Sidebar + content layout
│       ├── page.tsx              # Dashboard landing
│       └── documents/
│           └── [id]/page.tsx     # Document editor page
├── components/
│   ├── editor/                   # BlockNote editor components
│   │   ├── BlockNoteEditor.tsx   # Editor wrapper with auto-save
│   │   ├── editor-schema.ts     # Custom block schema
│   │   └── page-block.tsx       # Custom "page" block type
│   ├── layout/                   # Navigation components
│   │   ├── BreadcrumbNavigator.tsx # Breadcrumb navigation
│   │   ├── Sidebar.tsx           # Sidebar panel + modals
│   │   └── SidebarItem.tsx       # Recursive page tree item
│   ├── providers/                # Context providers
│   │   ├── auth-guard.tsx        # Auth protection wrapper
│   │   ├── theme-provider.tsx    # Applies persisted dark/light mode
│   │   └── query-provider.tsx    # TanStack Query provider
│   └── ui/                       # shadcn/ui components
│       ├── button.tsx
│       ├── card.tsx
│       ├── input.tsx
│       └── label.tsx
├── hooks/
│   ├── use-account.ts            # Account mutation hooks
│   └── use-pages.ts              # TanStack Query hooks for pages API
├── lib/
│   ├── api.ts                    # Generic fetch wrapper (apiFetch)
│   ├── auth-api.ts               # Account API helper functions
│   ├── breadcrumb.ts             # Breadcrumb path builder
│   ├── page-api.ts               # Page-specific API functions
│   ├── types.ts                  # TypeScript interfaces
│   └── utils.ts                  # Utility functions (cn)
├── store/
│   ├── use-user-store.ts         # Auth state (Zustand)
│   └── use-sidebar-store.ts      # Sidebar UI state (Zustand)
│   └── use-theme-store.ts        # Theme preference (light/dark)
└── middleware.ts                  # Next.js edge middleware
```

---

## Route Architecture

### Route Groups

Next.js route groups (parenthesized folders) organize pages without affecting URL paths:

| Route Group | URL Pattern           | Auth Required | Layout                 |
| ----------- | --------------------- | ------------- | ---------------------- |
| `(auth)`    | `/login`, `/register` | No            | Centered card form     |
| `(main)`    | `/`, `/documents/:id` | Yes           | Sidebar + content area |

### Page Components

| Route             | Component       | Description                                       |
| ----------------- | --------------- | ------------------------------------------------- |
| `/login`          | `LoginPage`     | Email/password form → `POST /api/api/auth/login`          |
| `/register`       | `RegisterPage`  | Email/password/confirm form → `POST /api/api/auth/signup` |
| `/`               | `DashboardPage` | Welcome message, prompts to select/create page    |
| `/documents/[id]` | `DocumentPage`  | Loads page data, renders BlockNote editor         |

---

## State Management

### Zustand Stores

#### `useUserStore` (`store/use-user-store.ts`)

Manages authentication state with localStorage persistence.

| Property        | Type             | Description                                 |
| --------------- | ---------------- | ------------------------------------------- |
| `token`         | `string \| null` | JWT token                                   |
| `user`          | `User \| null`   | User object `{ id, email }`                 |
| `setAuth()`     | function         | Stores token + user in state + localStorage |
| `updateEmail()` | function         | Updates email in state + localStorage       |
| `logout()`      | function         | Clears state + localStorage                 |
| `hydrate()`     | function         | Restores state from localStorage on mount   |

**Usage:**

```tsx
const { token, user, setAuth, logout } = useUserStore();

// After login
setAuth(response.token, response.user);

// On logout
logout();
```

#### `useSidebarStore` (`store/use-sidebar-store.ts`)

Manages sidebar UI state (expand/collapse, inline rename).

| Property          | Type             | Description                        |
| ----------------- | ---------------- | ---------------------------------- |
| `expandedIds`     | `Set<string>`    | Set of expanded page IDs           |
| `toggle(id)`      | function         | Toggle expand/collapse for a page  |
| `expand(id)`      | function         | Expand a specific page             |
| `collapse(id)`    | function         | Collapse a specific page           |
| `renamingId`      | `string \| null` | ID of page currently being renamed |
| `setRenamingId()` | function         | Set/clear rename mode              |

#### `useThemeStore` (`store/use-theme-store.ts`)

Manages light/dark preference with localStorage persistence.

| Property       | Type                | Description                   |
| -------------- | ------------------- | ----------------------------- |
| `mode`         | `"light" \| "dark"` | Current theme mode            |
| `setMode()`    | function            | Set a specific theme mode     |
| `toggleMode()` | function            | Toggle between light and dark |
| `hydrate()`    | function            | Restores stored mode on mount |

### TanStack Query (Server State)

Server data (page tree, page details) is managed through TanStack Query hooks in `hooks/use-pages.ts`.

| Hook                       | Type     | Query Key                               | API Call                      |
| -------------------------- | -------- | --------------------------------------- | ----------------------------- |
| `useSidebarTree`           | Query    | `pageKeys.sidebar.byUser(userID)`       | `GET /api/api/pages/sidebar`          |
| `usePageSearch`            | Query    | `pageKeys.search.byUser(userID, query)` | `GET /api/api/pages/search?q=...`     |
| `useTrashPages`            | Query    | `pageKeys.trash.byUser(userID)`         | `GET /api/api/pages/trash`            |
| `useCreatePage`            | Mutation | —                                       | `POST /api/api/pages`                 |
| `useUpdatePage`            | Mutation | —                                       | `PATCH /api/api/pages/:id`            |
| `useDeletePage`            | Mutation | —                                       | `DELETE /api/api/pages/:id`           |
| `useRestorePage`           | Mutation | —                                       | `PATCH /api/api/pages/:id/restore`    |
| `useDeletePagePermanently` | Mutation | —                                       | `DELETE /api/api/pages/:id/permanent` |

All mutations invalidate `pageKeys.sidebar.all` plus related search/detail/trash keys to keep caches in sync.

The document page fetches page details directly with `useQuery` and a user-scoped key:

```typescript
useQuery({
  queryKey: pageKeys.detail(userID, id),
  queryFn: () => getPage(id),
});
```

**Query Configuration** (set in `query-provider.tsx`):

- `staleTime`: 1 minute — data isn't refetched within 60 seconds
- `retry`: 1 — retry failed queries once

---

## API Client

### `apiFetch<T>()` (`lib/api.ts`)

Generic fetch wrapper that handles authentication and response unwrapping.

```typescript
const data = await apiFetch<Page>("/api/pages/some-uuid");
```

**Behavior:**

1. Reads `NEXT_PUBLIC_API_URL` environment variable for base URL
2. Sets `Content-Type: application/json` header

- Skips `Content-Type` when the body is `FormData` (browser sets boundary)

3. Reads JWT token from `localStorage` and attaches `Authorization: Bearer` header
4. Sends the request
5. On success: parses JSON, extracts `data` field from the `{ data, error }` wrapper
6. On error: throws `Error` with the server's error message

### Page API Functions (`lib/page-api.ts`)

Typed wrapper functions for page-related API calls:

| Function                    | Method | Endpoint               | Parameters                    |
| --------------------------- | ------ | ---------------------- | ----------------------------- |
| `fetchSidebarTree()`        | GET    | `/api/pages/sidebar`       | None                          |
| `searchPages(query)`        | GET    | `/api/pages/search`        | `query: string`               |
| `fetchTrashPages()`         | GET    | `/api/pages/trash`         | None                          |
| `createPage(body)`          | POST   | `/api/pages`               | `{ parentId?, title? }`       |
| `getPage(id)`               | GET    | `/api/pages/:id`           | Page UUID                     |
| `updatePage(id, body)`      | PATCH  | `/api/pages/:id`           | `{ title?, icon?, content? }` |
| `deletePage(id)`            | DELETE | `/api/pages/:id`           | Page UUID                     |
| `restorePage(id)`           | PATCH  | `/api/pages/:id/restore`   | Page UUID                     |
| `deletePagePermanently(id)` | DELETE | `/api/pages/:id/permanent` | Page UUID                     |
| `uploadPageAsset()`         | POST   | `/api/pages/:id/assets`    | `(id, kind, file)`            |

### Account API Functions (`lib/auth-api.ts`)

Helpers for account update endpoints:

| Function                  | Method | Endpoint                 | Parameters                         |
| ------------------------- | ------ | ------------------------ | ---------------------------------- |
| `updateAccountEmail()`    | PATCH  | `/api/auth/account/email`    | `{ currentPassword, newEmail }`    |
| `updateAccountPassword()` | PATCH  | `/api/auth/account/password` | `{ currentPassword, newPassword }` |

`hooks/use-account.ts` wraps these helpers and updates the stored email after a successful change.

---

## TypeScript Interfaces (`lib/types.ts`)

```typescript
interface Page {
  id: string;
  userId: string;
  parentId: string | null;
  title: string;
  icon?: string;
  coverImage?: string;
  content: string; // JSON string or BlockNote JSON array (stringified on save)
  createdAt: string;
  deletedAt?: string | null;
}

interface PageNode extends Page {
  children: PageNode[]; // Recursive children
  depth: number; // Indentation level (0 = root)
}

interface PageSearchResult {
  id: string;
  parentId: string | null;
  title: string;
  icon?: string;
}

interface PageTrashItem {
  id: string;
  parentId: string | null;
  title: string;
  icon?: string;
  deletedAt: string;
}
```

---

## Component Details

### Sidebar (`components/layout/Sidebar.tsx`)

The main navigation panel displayed on the left side of the application.

**Props:** `{ onClose: () => void }` — callback to hide the sidebar.

**Features:**

- **Profile dropdown:** Shows user email and logout button
- **Action buttons:** Search, Settings, Trash, New Page
- **Search modal:** Debounced title search with keyboard focus and results navigation
- **Trash modal:** Filterable list with restore and permanent delete actions
- **Settings modal:** Account (email/password update) and Preference (theme) panels
- **Theme switch:** Light/dark toggle in Settings > Preference
- **Page tree:** Recursively renders `SidebarItem` components from sidebar tree data
- **Loading/error states:** Shows spinner while loading, error message on failure
- **Empty state:** Shows "No pages yet" when user has no pages

**Data source:** `useSidebarTree()` hook (TanStack Query).

### SidebarItem (`components/layout/SidebarItem.tsx`)

Recursive component rendering a single page node in the sidebar tree.

**Props:** `{ node: PageNode }`

**Features:**

- **Navigation:** Click to navigate to `/documents/{id}`
- **Expand/collapse:** Chevron toggle for pages with children (depth-based indentation)
- **Inline rename:** Double-entry via context menu → input field replaces title
- **Add sub-page:** Creates a child page under the current node
- **Delete:** Moves the page to Trash (redirects if viewing the deleted page)
- **Context menu (three-dot):** Rename and Delete options
- **Active state:** Highlighted when current URL matches

**Indentation formula:** `paddingLeft = 12 + (node.depth × 12)` pixels.

### BreadcrumbNavigator (`components/layout/BreadcrumbNavigator.tsx`)

Renders a compact breadcrumb trail for nested pages.

**Props:**

| Prop            | Type                  | Description                                  |
| --------------- | --------------------- | -------------------------------------------- | ------------------------------------------- |
| `segments`      | `BreadcrumbSegment[]` | Ordered breadcrumb path from root to current |
| `currentPageID` | string                | Current page identifier                      |
| `onNavigate`    | `(pageID: string      | null)`                                       | Called when a breadcrumb segment is clicked |

Breadcrumb segments are generated by `buildBreadcrumbSegments()` in `lib/breadcrumb.ts`.

### DocumentPage (`app/(main)/documents/[id]/page.tsx`)

Renders the page editor view with breadcrumb navigation and an editable title field.

**Highlights:**

- Fetches page data with `useQuery` and `pageKeys.detail(userID, id)`
- Renders breadcrumb navigation via `BreadcrumbNavigator`
- Title input debounces updates and commits on blur
- Editor content loads from `page.content` (string or JSON array)

### BlockNoteEditor (`components/editor/BlockNoteEditor.tsx`)

The rich text editor wrapper component. Dynamically imported (no SSR) to avoid BlockNote's browser dependency issues.

**Props:**

| Prop             | Type   | Description                            |
| ---------------- | ------ | -------------------------------------- |
| `pageId`         | string | UUID of the page being edited          |
| `initialContent` | string | JSON-stringified BlockNote block array |

**Features:**

- **Auto-save:** Changes are debounced by 1 second, then sent via `PATCH /api/api/pages/:id`
- **Custom schema:** Extends default BlockNote blocks with a custom `page` block type
- **Direct uploads via slash menu:** `/image` and `/file` now open local file picker and upload to backend, then insert returned URL
- **Slash menu:** Adds a "Page" command that creates a child page and inserts a page block
- **Page block cleanup:** Automatically detects and removes page blocks whose referenced pages have been deleted

### PageBlock (`components/editor/page-block.tsx`)

Custom BlockNote block type for embedded page references.

**Block Props:**

| Prop        | Default      | Description                 |
| ----------- | ------------ | --------------------------- |
| `pageId`    | `""`         | UUID of the referenced page |
| `pageTitle` | `"Untitled"` | Display title               |

Renders as a clickable card with a file icon. Clicking navigates to `/documents/{pageId}`.

### AuthGuard (`components/providers/auth-guard.tsx`)

Client-side authentication wrapper for protected routes.

**Behavior:**

1. On mount: calls `hydrate()` to restore auth state from localStorage
2. Checks if token exists in localStorage
3. If no token: redirects to `/login`
4. If token exists: renders children
5. Watches for token removal (e.g., logout) and redirects immediately

Renders nothing until hydration completes, preventing flash of protected content.

---

## Authentication Flow (Frontend)

```
1. User visits /login or /register
       │
2. Fills form → submits
       │
3. apiFetch("POST /api/api/auth/login") or apiFetch("POST /api/api/auth/signup")
       │
4. On success:
   ├── useUserStore.setAuth(token, user)
   │   ├── localStorage.setItem("token", token)
   │   └── localStorage.setItem("user", JSON.stringify(user))
   └── router.replace("/")
       │
5. MainLayout loads:
   ├── AuthGuard hydrates Zustand from localStorage
   ├── Confirms token exists → renders children
   └── Sidebar loads page tree via useSidebarTree()
       │
6. All API calls include: Authorization: Bearer <token>
       │
7. On logout:
  ├── queryClient.clear()
  ├── useSidebarStore.reset()
  ├── useUserStore.logout()
  │   ├── localStorage.removeItem("token")
  │   └── localStorage.removeItem("user")
  └── router.push("/login")
```

---

## Styling

### Tailwind CSS v4

Global styles are defined in `app/globals.css` with:

- `@import "tailwindcss"` for Tailwind base/components/utilities
- `@import "tw-animate-css"` for animations
- `@import "shadcn/tailwind.css"` for shadcn component styles
- CSS custom properties for light/dark theme tokens (oklch color space)

### `cn()` Utility (`lib/utils.ts`)

Combines `clsx` and `tailwind-merge` for conditional class names:

```typescript
import { cn } from "@/lib/utils";

<div className={cn("flex items-center", isActive && "bg-neutral-200")} />
```

### Theme

The application supports light and dark modes via CSS custom properties defined in `:root` and `.dark` selectors. Key color tokens:

- `--background` / `--foreground` — page background and text
- `--sidebar` / `--sidebar-foreground` — sidebar panel colors
- `--primary` / `--primary-foreground` — primary action colors
- `--destructive` — error/delete action color

Runtime behavior is handled by `useThemeStore` and `ThemeProvider`:

- Default mode is **light**
- Users toggle mode from Settings > Preference
- Preference persists in `localStorage`
- Root layout applies the stored mode before hydration to prevent flicker

---

## Key Patterns

### Dynamic Import for Editor

BlockNote requires browser APIs and cannot be server-rendered. The editor is dynamically imported:

```typescript
const BlockNoteEditor = dynamic(
  () => import("@/components/editor/BlockNoteEditor"),
  { ssr: false },
);
```

### Debounced Auto-Save

The editor auto-saves content 1 second after the last change:

```typescript
const saveContent = useCallback(
  (blocks) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      await apiFetch(`/api/pages/${pageId}`, {
        method: "PATCH",
        body: JSON.stringify({ content: JSON.stringify(blocks) }),
      });
    }, 1000);
  },
  [pageId],
);
```

### Recursive Sidebar Rendering

`SidebarItem` renders its own children recursively:

```tsx
{
  expanded && hasChildren && (
    <div>
      {node.children.map((child) => (
        <SidebarItem key={child.id} node={child} />
      ))}
    </div>
  );
}
```

### Sidebar Query Invalidation

All page mutations refresh sidebar, search, detail, and trash caches:

```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: pageKeys.sidebar.all });
  queryClient.invalidateQueries({ queryKey: pageKeys.search.all });
  queryClient.invalidateQueries({ queryKey: pageKeys.detailPrefix });
  queryClient.invalidateQueries({ queryKey: pageKeys.trash.all });
},
```
