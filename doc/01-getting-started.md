# Getting Started

This guide walks you through setting up the Nochuay development environment from scratch.

---

## Prerequisites

| Tool           | Version | Purpose                                  |
| -------------- | ------- | ---------------------------------------- |
| Docker         | 24+     | Container runtime                        |
| Docker Compose | v2+     | Multi-container orchestration            |
| Git            | 2.x     | Source control                           |
| Node.js        | 22+     | Frontend development (optional, for IDE) |
| Go             | 1.25+   | Backend development (optional, for IDE)  |

> **Note:** Docker handles all runtime dependencies. Node.js and Go are only needed if you want IDE support (autocompletion, linting) outside containers.

---

## 1. Clone the Repository

```bash
git clone https://github.com/Northalis/Nochuay.git
cd Nochuay
```

---

## 2. Configure Environment Variables

### Backend (`nochuay-back/.env`)

Create the file `nochuay-back/.env` with the following contents:

```env
PORT=8080
DB_HOST=db
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=secret
DB_NAME=nochuay_db
JWT_SECRET=change_this_to_something_secure
CORS_ALLOWED_ORIGINS=http://localhost:3000
UPLOAD_DIR=uploads
MAX_UPLOAD_SIZE_BYTES=10485760
```

### Frontend (`nochuay-front/.env.local`)

Create the file `nochuay-front/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

> **Security:** Never commit `.env` or `.env.local` files to version control. They are listed in `.gitignore`.

---

## 3. Start All Services

From the project root, run:

```bash
docker-compose up --build
```

This starts four services in order:

| Service    | Container          | Port   | Description                       |
| ---------- | ------------------ | ------ | --------------------------------- |
| `db`       | `nochuay_db`       | `5432` | PostgreSQL 17 database            |
| `migrate`  | `nochuay_migrate`  | —      | Runs SQL migrations, then exits   |
| `app`      | `nochuay_api`      | `8080` | Go backend API (hot reload w/Air) |
| `frontend` | `nochuay_frontend` | `3000` | Next.js dev server (HMR)          |

Wait for the log message:

```
nochuay_api  | Nochuay API server starting on :8080
```

---

## 4. Verify the Setup

### Health Check

```bash
curl http://localhost:8080/health
```

Expected response:

```json
{
  "data": { "status": "ok" },
  "error": null
}
```

### Open the Frontend

Navigate to [http://localhost:3000](http://localhost:3000) in your browser. You should see the login page.

### Register a Test User

```bash
curl -X POST http://localhost:8080/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'
```

Expected response:

```json
{
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
      "email": "test@example.com",
      "createdAt": "2026-02-20T..."
    }
  },
  "error": null
}
```

---

## 5. Stopping Services

```bash
docker-compose down
```

To also remove the database volume (wipes all data):

```bash
docker-compose down -v
```

---

## 6. Running Individual Services

### Backend Only (with hot reload)

```bash
docker-compose up app db migrate
```

### Frontend Only (local, outside Docker)

```bash
cd nochuay-front
npm install
npm run dev
```

> Make sure the backend is running at `localhost:8080` for API calls.

---

## Troubleshooting

| Problem                      | Solution                                                             |
| ---------------------------- | -------------------------------------------------------------------- |
| Port 5432 already in use     | Stop local PostgreSQL: `sudo systemctl stop postgresql`              |
| Port 8080 already in use     | Change `PORT` in `nochuay-back/.env` and update `docker-compose.yml` |
| Port 3000 already in use     | Stop any process on 3000 or change the frontend port                 |
| Migration fails              | Check DB credentials in `.env` match `docker-compose.yml`            |
| `DB_PASSWORD is required`    | Ensure `nochuay-back/.env` exists and has `DB_PASSWORD` set          |
| Frontend can't reach backend | Verify `NEXT_PUBLIC_API_URL` matches the backend address             |

---

## Next Steps

- Read the [Architecture Overview](02-architecture-overview.md) to understand how the system is structured
- See the [API Reference](03-api-reference.md) for all available endpoints
- Check the [Development Workflow](06-development-workflow.md) for day-to-day development practices
