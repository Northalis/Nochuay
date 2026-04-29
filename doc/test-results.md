# Nochuay — Test Suite Snapshot

**Date:** April 29, 2026  
**Purpose:** Reference list of current automated test suites. Update after running tests.

---

## How to Regenerate Results

```bash
cd nochuay-back
go test -v ./...

cd ../nochuay-front
npx jest --roots ./test/frontend --verbose
```

---

## Backend Test Suites

| Suite                 | Location                                                     | Notes                         |
| --------------------- | ------------------------------------------------------------ | ----------------------------- |
| Auth service tests    | `nochuay-back/internal/service/auth_service_test.go`         | Password hashing + verify     |
| Account service tests | `nochuay-back/internal/service/auth_account_service_test.go` | Account email/password flows  |
| Page service tests    | `nochuay-back/internal/service/page_service_test.go`         | Tree construction             |
| Auth handler tests    | `nochuay-back/test/handler/auth_handler_test.go`             | Auth endpoints + account      |
| Page handler tests    | `nochuay-back/test/handler/page_handler_test.go`             | Pages, search, trash, uploads |
| Auth middleware tests | `nochuay-back/test/middleware/auth_middleware_test.go`       | JWT middleware                |

---

## Frontend Test Suites

| Suite               | Location                                                      | Notes                     |
| ------------------- | ------------------------------------------------------------- | ------------------------- |
| User store tests    | `nochuay-front/test/frontend/store/use-user-store.test.ts`    | Auth store + persistence  |
| Sidebar store tests | `nochuay-front/test/frontend/store/use-sidebar-store.test.ts` | Sidebar state             |
| Theme store tests   | `nochuay-front/test/frontend/store/use-theme-store.test.ts`   | Theme preference          |
| Query key tests     | `nochuay-front/test/frontend/hooks/use-pages.keys.test.ts`    | User-scoped query keys    |
| apiFetch tests      | `nochuay-front/test/frontend/lib/api.test.ts`                 | Response unwrap + headers |
| Account API tests   | `nochuay-front/test/frontend/lib/auth-api.test.ts`            | Account update requests   |
| Page API tests      | `nochuay-front/test/frontend/lib/page-api.test.ts`            | Page CRUD + helpers       |
| Breadcrumb tests    | `nochuay-front/test/frontend/lib/breadcrumb.test.ts`          | Breadcrumb path builder   |

---

## Test Architecture Notes

### Backend Testing Strategy

- **Service layer tests** run directly against exported functions (password hashing, tree construction) — no mocks needed
- **Handler layer tests** use `httptest.NewRequest` / `httptest.NewRecorder` with mock service implementations injected via interfaces
- **Middleware tests** verify JWT extraction and context injection using mock `AuthService.ValidateToken`
- All tests are **pure unit tests** — no database or network required

### Frontend Testing Strategy

- **Store tests** use Zustand's `getState()` / `setState()` for synchronous state verification with a mocked `localStorage`
- **API utility tests** mock `global.fetch` to verify request construction, header injection, and error handling
- **Page API tests** mock `apiFetch` to verify correct path/method/body composition for each endpoint
- All tests use **Jest** with **ts-jest** for TypeScript support in a **jsdom** environment

---

## How to Reproduce

### Run Backend Tests

```bash
cd nochuay-back
go test -v ./...
```

### Run Frontend Tests

```bash
cd nochuay-front
npx jest --roots ./test/frontend --verbose
```

### Run All Tests

```bash
# Backend
cd nochuay-back && go test -v ./... && cd ..

# Frontend
cd nochuay-front && npx jest --roots ./test/frontend --verbose && cd ..
```
