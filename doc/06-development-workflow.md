# Development Workflow

This document covers day-to-day development practices, Docker setup, hot reloading, running tests, adding features, and debugging.

---

## Quick Reference

| Task                        | Command                                                          |
| --------------------------- | ---------------------------------------------------------------- |
| Start all services          | `docker-compose up --build`                                      |
| Start services (background) | `docker-compose up -d --build`                                   |
| Stop all services           | `docker-compose down`                                            |
| Stop + remove data          | `docker-compose down -v`                                         |
| View logs                   | `docker-compose logs -f <service>`                               |
| Run backend tests           | `cd nochuay-back && go test -v ./...`                            |
| Run frontend tests          | `cd nochuay-front && npx jest --roots ./test/frontend --verbose` |
| Run frontend linting        | `cd nochuay-front && npm run lint`                               |
| Run Go linting              | `cd nochuay-back && go vet ./...`                                |
| Rebuild a single service    | `docker-compose up --build <service>`                            |

---

## Development Environment

### Starting the Full Stack

```bash
docker-compose up --build
```

This starts four services:

1. **`db`** — PostgreSQL 17, waits for health check before proceeding
2. **`migrate`** — Runs SQL migrations, then exits
3. **`app`** — Go backend with Air hot reload on port 8080
4. **`frontend`** — Next.js dev server with HMR on port 3000

### Service URLs

| Service  | URL                          | Purpose             |
| -------- | ---------------------------- | ------------------- |
| Frontend | http://localhost:3000        | Web application     |
| Backend  | http://localhost:8080        | REST API            |
| Health   | http://localhost:8080/api/health | API health check    |
| Database | localhost:5432               | PostgreSQL (direct) |

### Viewing Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
docker-compose logs -f frontend
docker-compose logs -f db
```

---

## Hot Reloading

### Backend (Air)

The Go backend uses [Air](https://github.com/air-verse/air) for automatic rebuilding on file changes. When you edit any `.go` file in `nochuay-back/`, Air detects the change, rebuilds, and restarts the server.

**How it works:**

- The `nochuay-back/` directory is volume-mounted into the container
- Air watches for file changes and triggers `go build`
- No manual restart needed

### Frontend (Next.js HMR)

The Next.js development server provides Hot Module Replacement (HMR). Editing `.tsx`, `.ts`, or `.css` files triggers instant updates in the browser without a full page reload.

**How it works:**

- The `nochuay-front/` directory is volume-mounted into the container
- Next.js watches for file changes and updates modules in-place
- Most changes are reflected instantly in the browser

> **Important:** Do NOT run `npm run build` during development. This creates production assets and disables HMR. Always use `npm run dev`.

---

## Working Outside Docker

For faster iteration with IDE support, you can run services directly on your host machine.

### Backend (local)

```bash
cd nochuay-back

# Set environment variables
export DB_HOST=localhost
export DB_PORT=5432
export DB_USER=postgres
export DB_PASSWORD=secret
export DB_NAME=nochuay_db
export JWT_SECRET=change_this_to_something_secure
export CORS_ALLOWED_ORIGINS=http://localhost:3000

# Run directly
go run ./cmd/api

# Or use Air for hot reload (install: go install github.com/air-verse/air@latest)
air
```

> **Prerequisite:** PostgreSQL must be running locally or via Docker (`docker-compose up db`).

### Frontend (local)

```bash
cd nochuay-front
npm install
npm run dev
```

Ensure `nochuay-front/.env.local` has:

```env
NEXT_PUBLIC_API_URL=http://localhost:8080/api
```

---

## Adding New Features

### Adding a New API Endpoint

Follow the layered architecture (Repository → Service → Handler):

1. **Model** — Add/modify structs in `internal/model/model.go` if needed

2. **Repository** — Add the data access method:
   - Define the method on the `Repository` interface
   - Implement the SQL query in the repository struct
   - Always include `WHERE user_id = $x` for page queries

3. **Service** — Add business logic:
   - Define the method on the `Service` interface
   - Implement validation, authorization checks, and orchestration
   - Write unit tests in `*_test.go`

4. **Handler** — Add the HTTP handler:
   - Parse request (JSON body, path parameters)
   - Call the service method
   - Return response with `response.JSON()` or `response.Error()`
   - Write handler tests in `test/handler/`

5. **Route** — Register the route in `cmd/api/main.go`:
   ```go
   mux.Handle("GET /new-route", authMiddleware(http.HandlerFunc(handler.NewMethod)))
   ```

### Adding a New Frontend Page

1. Create the route file in `app/(main)/` or `app/(auth)/`
2. Add TypeScript types in `lib/types.ts` if needed
3. Add API functions in `lib/page-api.ts`
4. Add TanStack Query hooks in `hooks/use-pages.ts`
5. Create components in `components/`

### Adding a New Database Migration

1. Create migration files:

   ```bash
   touch nochuay-back/migrations/003_description.up.sql
   touch nochuay-back/migrations/003_description.down.sql
   ```

2. Write the SQL in `up.sql` and the rollback in `down.sql`

3. Restart the `migrate` service:
   ```bash
   docker-compose up migrate
   ```

---

## Debugging

### Backend Debugging

**Check API responses:**

```bash
# Health check
curl http://localhost:8080/api/health

# Login and capture token
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' | jq -r '.data.token')

# Use token for authenticated requests
curl http://localhost:8080/api/pages/sidebar \
  -H "Authorization: Bearer $TOKEN" | jq
```

**View container logs:**

```bash
docker-compose logs -f app
```

**Access database directly:**

```bash
docker exec -it nochuay_db psql -U postgres -d nochuay_db

# Useful queries
SELECT id, title, parent_id FROM pages ORDER BY created_at;
SELECT id, email FROM users;
```

### Frontend Debugging

- Use browser DevTools (F12) → Network tab to inspect API calls
- Check console for auto-save errors or page block cleanup messages
- React DevTools extension for component state inspection
- TanStack Query DevTools (if installed) for query cache state

---

## Database Management

### Reset Database

To wipe all data and start fresh:

```bash
docker-compose down -v
docker-compose up --build
```

The `-v` flag removes named volumes (`postgres_data`), and migrations re-run on next startup.

### Access PostgreSQL Shell

```bash
docker exec -it nochuay_db psql -U postgres -d nochuay_db
```

### Backup Database

```bash
docker exec nochuay_db pg_dump -U postgres nochuay_db > backup.sql
```

### Restore Database

```bash
cat backup.sql | docker exec -i nochuay_db psql -U postgres -d nochuay_db
```

---

## Docker Tips

### Rebuild a Single Service

```bash
docker-compose up --build app      # Rebuild backend only
docker-compose up --build frontend # Rebuild frontend only
```

### Enter a Container Shell

```bash
docker exec -it nochuay_api sh      # Backend container
docker exec -it nochuay_frontend sh # Frontend container
```

### Clear Docker Cache

If builds are behaving unexpectedly:

```bash
docker-compose build --no-cache
```

### Check Container Status

```bash
docker-compose ps
```

---

## Code Quality

### Backend Linting

```bash
cd nochuay-back
go vet ./...
```

### Frontend Linting

```bash
cd nochuay-front
npm run lint
```

### Pre-Commit Checklist

Before committing changes:

1. Run backend tests: `cd nochuay-back && go test -v ./...`
2. Run frontend tests: `cd nochuay-front && npx jest --roots ./test/frontend --verbose`
3. Run linting: `go vet ./...` and `npm run lint`
4. Verify no secrets in committed files
5. Test the feature manually via the UI

---

## Environment Variables Reference

### Backend (`nochuay-back/.env`)

| Variable                | Required | Default                 | Description         |
| ----------------------- | -------- | ----------------------- | ------------------- |
| `PORT`                  | No       | `8080`                  | API server port     |
| `DB_HOST`               | No       | `localhost`             | PostgreSQL host     |
| `DB_PORT`               | No       | `5432`                  | PostgreSQL port     |
| `DB_USER`               | No       | `postgres`              | Database user       |
| `DB_PASSWORD`           | Yes      | —                       | Database password   |
| `DB_NAME`               | No       | `nochuay_db`            | Database name       |
| `DB_SSLMODE`            | No       | `disable`               | PostgreSQL SSL mode |
| `JWT_SECRET`            | Yes      | —                       | JWT signing key     |
| `CORS_ALLOWED_ORIGINS`  | No       | `http://localhost:3000` | Allowed CORS origin |
| `UPLOAD_DIR`            | No       | `uploads`               | File upload root    |
| `MAX_UPLOAD_SIZE_BYTES` | No       | `10485760`              | Upload size limit   |

### Frontend (`nochuay-front/.env.local`)

| Variable              | Required | Default                 | Description          |
| --------------------- | -------- | ----------------------- | -------------------- |
| `NEXT_PUBLIC_API_URL` | No       | `http://localhost:8080` | Backend API base URL |
