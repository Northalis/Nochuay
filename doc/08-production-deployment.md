# Production Deployment (Render)

This guide describes how to deploy Nochuay on Render with separate backend and frontend services, plus a Render-managed PostgreSQL database. It assumes you will point each service to its own root folder:

- Backend root: `nochuay-back`
- Frontend root: `nochuay-front`

---

## Architecture Summary

- **Backend:** Go API service (Dockerfile production stage)
- **Frontend:** Next.js standalone service (Dockerfile production stage)
- **Database:** Render PostgreSQL

---

## 1) Render Services Setup

### Backend (Web Service)

**Service type:** Web Service (Docker)

**Settings:**

- Root directory: `nochuay-back`
- Dockerfile path: `nochuay-back/Dockerfile`
- Port: `8080`
- Health check path: `/health`

**Required environment variables:**

| Variable                | Example                                | Notes                                  |
| ----------------------- | -------------------------------------- | -------------------------------------- |
| `PORT`                  | `8080`                                 | Render sets this for you, keep default |
| `DB_HOST`               | Render DB host                         | Provided by Render Postgres            |
| `DB_PORT`               | `5432`                                 | Default for Postgres                   |
| `DB_USER`               | Render DB user                         | Provided by Render Postgres            |
| `DB_PASSWORD`           | Render DB password                     | Provided by Render Postgres            |
| `DB_NAME`               | Render DB name                         | Provided by Render Postgres            |
| `DB_SSLMODE`            | `require`                              | Render Postgres requires SSL           |
| `JWT_SECRET`            | long random string                     | Required, keep secret                  |
| `CORS_ALLOWED_ORIGINS`  | `https://<your-frontend>.onrender.com` | Frontend Render URL                    |
| `UPLOAD_DIR`            | `uploads`                              | Local disk path                        |
| `MAX_UPLOAD_SIZE_BYTES` | `10485760`                             | Optional                               |

---

### Frontend (Web Service)

**Service type:** Web Service (Docker)

**Settings:**

- Root directory: `nochuay-front`
- Dockerfile path: `nochuay-front/Dockerfile`
- Port: `3000`

**Required environment variables:**

| Variable              | Example                               | Notes                     |
| --------------------- | ------------------------------------- | ------------------------- |
| `NEXT_PUBLIC_API_URL` | `https://<your-backend>.onrender.com` | Must point to backend URL |

---

### Database (Render PostgreSQL)

Create a Render PostgreSQL instance and copy the connection info into backend env vars above. Use SSL.

---

## 2) Database Migrations (Render One-Off Job)

Run migrations as a one-off job or pre-deploy hook. The `migrate` CLI must be available in the job image.

### Option A: One-Off Job (recommended)

Create a Render **Job** that uses the backend repo and runs:

```bash
migrate -path /app/migrations -database "postgres://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME?sslmode=$DB_SSLMODE" up
```

If your job image does not include `migrate`, either:

- Build the job image from the backend `Dockerfile` and ensure it includes `migrate`, or
- Use a custom Docker image that contains `migrate` and the `migrations` folder.

### Option B: Run Migrations Locally or in CI

Using a local `migrate` binary:

```bash
migrate -path ./nochuay-back/migrations -database "postgres://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME?sslmode=require" up
```

---

## 3) CORS and HTTPS

- Set `CORS_ALLOWED_ORIGINS` to the **exact** Render frontend URL.
- Render terminates TLS; keep backend CORS set to the public HTTPS origin.

---

## 4) Uploads and Persistence

Uploads are stored on the Render instance filesystem via `UPLOAD_DIR`. This storage is **ephemeral** and may be lost on deploys or restarts. If you need durable storage, move uploads to object storage (S3, Cloudinary, etc.).

---

## 5) Smoke Test Checklist

1. Backend health check: `GET /health` returns `{ "status": "ok" }`.
2. Frontend loads and can sign up/login.
3. Create a page and verify it persists after refresh.
4. Upload an asset and confirm it renders (note the persistence warning).

---

## 6) Troubleshooting

- **CORS errors:** Verify `CORS_ALLOWED_ORIGINS` matches the frontend URL exactly.
- **DB connection fails:** Ensure SSL is enabled (`DB_SSLMODE=require`).
- **Uploads missing after deploy:** This is expected with local disk storage on Render.
