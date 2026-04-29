# Nochuay Documentation

Comprehensive documentation for the Nochuay project — a hierarchical note-taking web application (Notion clone).

**Version:** v2.0.0  
**Last Updated:** April 29, 2026

---

## Documentation Index

| #   | Document                                                   | Description                                       |
| --- | ---------------------------------------------------------- | ------------------------------------------------- |
| 01  | [Getting Started](./doc/01-getting-started.md)             | Prerequisites, setup, first run, verification     |
| 02  | [Architecture Overview](./doc/02-architecture-overview.md) | System design, layered backend, frontend patterns |
| 03  | [API Reference](./doc/03-api-reference.md)                 | All REST endpoints with request/response examples |
| 04  | [Database Guide](./doc/04-database-guide.md)               | Schema, adjacency list, migrations, JSONB content |
| 05  | [Frontend Guide](./doc/05-frontend-guide.md)               | Components, state management, editor integration  |
| 06  | [Development Workflow](./doc/06-development-workflow.md)   | Docker, hot reload, debugging, adding features    |
| 07  | [Testing Guide](./doc/07-testing-guide.md)                 | Test strategy, running tests, writing new tests   |
| 08  | [Production Deployment](./doc/08-production-deployment.md) | Render setup, env vars, migrations, operations    |
| —   | [Test Results](./doc/test-results.md)                      | Test suite snapshot and run instructions          |

---

## Quick Start

```bash
# 1. Clone and configure
git clone https://github.com/Northalis/Nochuay.git
cd Nochuay

# 2. Set up environment files (see 01-getting-started.md)

# 3. Start all services
docker-compose up --build

# 4. Open http://localhost:3000
```

---

## Project at a Glance

| Aspect         | Technology                          |
| -------------- | ----------------------------------- |
| Backend        | Go 1.25+ (stdlib + pgx)             |
| Frontend       | Next.js 16+ / React 19 / TypeScript |
| Database       | PostgreSQL 17                       |
| Editor         | BlockNote 0.46                      |
| State          | Zustand 5 + TanStack Query 5        |
| Auth           | JWT (HS256, 72h) + bcrypt           |
| Infrastructure | Docker Compose (4 services)         |
| Tests          | Go + Jest (see 07-testing-guide.md) |
