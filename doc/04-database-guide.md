# Database Guide

This document covers the Nochuay PostgreSQL database schema, the adjacency list pattern for hierarchical pages, migration management, and connection configuration.

---

## Overview

Nochuay uses **PostgreSQL 17** as its sole data store. The database contains two tables:

- **`users`** — Registered user accounts
- **`pages`** — Hierarchical page documents with block-based content

The database connection is managed through `pgx/v5` with a connection pool configured in `nochuay-back/internal/db/db.go`.

---

## Schema

### `users` Table

**Migration:** `nochuay-back/migrations/001_create_users.up.sql`

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

| Column          | Type         | Constraints        | Description                        |
| --------------- | ------------ | ------------------ | ---------------------------------- |
| `id`            | UUID         | PK, auto-generated | Unique user identifier             |
| `email`         | VARCHAR(255) | UNIQUE, NOT NULL   | User's email address               |
| `password_hash` | VARCHAR(255) | NOT NULL           | bcrypt hash (never exposed in API) |
| `created_at`    | TIMESTAMPTZ  | DEFAULT NOW()      | Account creation timestamp         |

**Rollback:** `001_create_users.down.sql`

```sql
DROP TABLE IF EXISTS users;
DROP EXTENSION IF EXISTS "uuid-ossp";
```

---

### `pages` Table

**Migration:** `nochuay-back/migrations/002_create_pages.up.sql`

```sql
CREATE TABLE pages (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id    UUID REFERENCES pages(id) ON DELETE CASCADE,
    title        TEXT NOT NULL DEFAULT 'Untitled',
    icon         VARCHAR(50),
    cover_image  TEXT,
    content      JSONB DEFAULT '[]'::jsonb,
    is_published BOOLEAN DEFAULT FALSE,
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_pages_parent_id ON pages(parent_id);
CREATE INDEX idx_pages_user_id ON pages(user_id);
```

| Column         | Type        | Constraints                        | Description                           |
| -------------- | ----------- | ---------------------------------- | ------------------------------------- |
| `id`           | UUID        | PK, auto-generated                 | Unique page identifier                |
| `user_id`      | UUID        | FK → `users.id`, CASCADE, NOT NULL | Owner of the page                     |
| `parent_id`    | UUID        | FK → `pages.id`, CASCADE, NULLABLE | Parent page (null = root page)        |
| `title`        | TEXT        | NOT NULL, DEFAULT `'Untitled'`     | Page title                            |
| `icon`         | VARCHAR(50) | NULLABLE                           | Emoji or icon identifier              |
| `cover_image`  | TEXT        | NULLABLE                           | Cover image URL                       |
| `content`      | JSONB       | DEFAULT `'[]'::jsonb`              | BlockNote editor content (JSON array) |
| `is_published` | BOOLEAN     | DEFAULT `FALSE`                    | Publication status (reserved for v2)  |
| `created_at`   | TIMESTAMPTZ | DEFAULT NOW()                      | Creation timestamp                    |
| `updated_at`   | TIMESTAMPTZ | DEFAULT NOW()                      | Last modification timestamp           |

**Indexes:**

| Index                 | Column      | Purpose                              |
| --------------------- | ----------- | ------------------------------------ |
| `idx_pages_parent_id` | `parent_id` | Fast lookup of children for a parent |
| `idx_pages_user_id`   | `user_id`   | Fast lookup of all pages for a user  |

**Rollback:** `002_create_pages.down.sql`

```sql
DROP INDEX IF EXISTS idx_pages_user_id;
DROP INDEX IF EXISTS idx_pages_parent_id;
DROP TABLE IF EXISTS pages;
```

---

## Adjacency List Pattern

The page hierarchy uses an **Adjacency List** — a simple and well-understood pattern for storing tree structures in relational databases.

### How It Works

Each row stores a reference to its parent:

```
┌──────────────────────────────────────────────────────────────────┐
│                         pages table                              │
├──────────┬──────────┬───────────────────┬───────────────────────┤
│    id    │ user_id  │     parent_id     │        title          │
├──────────┼──────────┼───────────────────┼───────────────────────┤
│ aaa-001  │ user-1   │ NULL              │ "My Workspace"        │  ← Root page
│ bbb-002  │ user-1   │ aaa-001           │ "Project Notes"       │  ← Child of aaa-001
│ ccc-003  │ user-1   │ bbb-002           │ "Meeting Minutes"     │  ← Child of bbb-002
│ ddd-004  │ user-1   │ aaa-001           │ "Personal Journal"    │  ← Child of aaa-001
│ eee-005  │ user-1   │ NULL              │ "Quick Notes"         │  ← Another root page
└──────────┴──────────┴───────────────────┴───────────────────────┘
```

This produces the following tree:

```
My Workspace                  (depth 0)
├── Project Notes             (depth 1)
│   └── Meeting Minutes       (depth 2)
└── Personal Journal          (depth 1)
Quick Notes                   (depth 0)
```

### Cascade Deletes

Both foreign keys use `ON DELETE CASCADE`:

- **`user_id → users.id`**: Deleting a user automatically deletes all their pages
- **`parent_id → pages.id`**: Deleting a parent page automatically deletes all descendant pages

This means a single `DELETE FROM pages WHERE id = $1` removes the entire subtree.

### Tree Construction

The tree is built in the Go service layer, not in SQL:

```go
// 1. Fetch flat list from DB
pages, _ := pageRepo.GetPagesByUserID(ctx, userID)
// Returns: [{id: aaa, parentId: nil}, {id: bbb, parentId: aaa}, ...]

// 2. Build nested tree in memory
tree := BuildTree(pages)
// Returns: [{id: aaa, children: [{id: bbb, children: [...], depth: 1}], depth: 0}]
```

The `BuildTree` algorithm (in `nochuay-back/internal/service/page_service.go`):

1. Creates a `map[UUID]*treeNode` for O(1) parent lookups
2. Iterates all pages, linking each child to its parent via the map
3. Collects root nodes (pages with `parent_id = NULL`)
4. Recursively materializes `PageNode` values with correct `depth` values

**Time complexity:** O(n) where n is the number of pages.

---

## Content Storage (JSONB)

Page content is stored as a JSONB column containing a **BlockNote JSON array**. Each element represents a block in the editor.

### Block Schema

```json
[
  {
    "id": "unique-block-id",
    "type": "paragraph",
    "props": {
      "textAlignment": "left",
      "backgroundColor": "default",
      "textColor": "default"
    },
    "content": [
      {
        "type": "text",
        "text": "Hello world",
        "styles": { "bold": true }
      }
    ],
    "children": []
  }
]
```

### Supported Block Types

These are the default BlockNote block types plus the custom `page` type:

| Type               | Description                |
| ------------------ | -------------------------- |
| `paragraph`        | Standard text paragraph    |
| `heading`          | Heading (level 1-3)        |
| `bulletListItem`   | Bulleted list item         |
| `numberedListItem` | Numbered list item         |
| `checkListItem`    | Checkbox list item         |
| `image`            | Image block                |
| `table`            | Table block                |
| `codeBlock`        | Code snippet block         |
| `page`             | Custom: embedded page link |

### Empty Content

A new page starts with content `[]` (empty JSON array). The editor interprets this as a blank document.

---

## Connection Pool Configuration

Configured in `nochuay-back/internal/db/db.go`:

| Setting            | Value      | Description                        |
| ------------------ | ---------- | ---------------------------------- |
| `MaxConns`         | 25         | Maximum simultaneous connections   |
| `MinConns`         | 5          | Minimum idle connections kept open |
| `MaxConnLifetime`  | 5 minutes  | Maximum lifetime of a connection   |
| `MaxConnIdleTime`  | 1 minute   | Maximum idle time before closing   |
| Connection timeout | 10 seconds | Timeout for initial connection     |

### Connection String (DSN)

Built from environment variables in `internal/config/config.go`:

```
postgres://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}?sslmode=disable
```

Default values:

| Variable      | Default      |
| ------------- | ------------ |
| `DB_HOST`     | `localhost`  |
| `DB_PORT`     | `5432`       |
| `DB_USER`     | `postgres`   |
| `DB_PASSWORD` | (required)   |
| `DB_NAME`     | `nochuay_db` |

---

## Migrations

Migrations are managed with [golang-migrate](https://github.com/golang-migrate/migrate) and run automatically via the `migrate` Docker service on startup.

### Migration Files

Located in `nochuay-back/migrations/`:

| File                        | Direction | Description                                   |
| --------------------------- | --------- | --------------------------------------------- |
| `001_create_users.up.sql`   | Up        | Creates `uuid-ossp` extension + `users` table |
| `001_create_users.down.sql` | Down      | Drops `users` table + extension               |
| `002_create_pages.up.sql`   | Up        | Creates `pages` table + indexes               |
| `002_create_pages.down.sql` | Down      | Drops indexes + `pages` table                 |

### Running Migrations Manually

```bash
# Apply all pending migrations
migrate -path ./nochuay-back/migrations \
  -database "postgres://postgres:secret@localhost:5432/nochuay_db?sslmode=disable" up

# Roll back the last migration
migrate -path ./nochuay-back/migrations \
  -database "postgres://postgres:secret@localhost:5432/nochuay_db?sslmode=disable" down 1

# Roll back all migrations
migrate -path ./nochuay-back/migrations \
  -database "postgres://postgres:secret@localhost:5432/nochuay_db?sslmode=disable" down
```

### Adding New Migrations

Create a new pair of files with the next sequence number:

```bash
# Example: adding a "tags" table
touch nochuay-back/migrations/003_create_tags.up.sql
touch nochuay-back/migrations/003_create_tags.down.sql
```

The `up.sql` file creates the schema change; the `down.sql` reverses it.

---

## Security: Row-Level Authorization

Every SQL query that accesses the `pages` table includes `WHERE user_id = $x` to prevent unauthorized access:

```sql
-- Example: GetPageByID
SELECT ... FROM pages WHERE id = $1 AND user_id = $2

-- Example: DeletePage
DELETE FROM pages WHERE id = $1 AND user_id = $2

-- Example: GetPagesByUserID (for sidebar)
SELECT ... FROM pages WHERE user_id = $1 ORDER BY created_at ASC
```

The `user_id` value is always extracted from the JWT token in the auth middleware — never from the request body. This prevents Insecure Direct Object Reference (IDOR) vulnerabilities.

---

## Entity-Relationship Diagram

```
┌───────────────────┐         ┌─────────────────────────────┐
│      users        │         │           pages              │
├───────────────────┤         ├─────────────────────────────┤
│ id (PK)           │◄────────│ user_id (FK, CASCADE)       │
│ email (UNIQUE)    │    1:N  │ id (PK)                     │
│ password_hash     │         │ parent_id (FK, CASCADE) ────┤──┐
│ created_at        │         │ title                        │  │
└───────────────────┘         │ icon                         │  │
                              │ cover_image                  │  │
                              │ content (JSONB)              │  │
                              │ is_published                 │  │
                              │ created_at                   │  │
                              │ updated_at                   │  │
                              └──────────────────────────────┘  │
                                        ▲                       │
                                        │   Self-referencing    │
                                        └───────────────────────┘
                                             0:N (children)
```
