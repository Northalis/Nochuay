# Nochuay — Test Results Report

**Date:** February 20, 2026  
**Phase:** 3.75 — Testing & Optimization  
**Total Tests:** 54 passed, 0 failed  
**Overall Status:** ✅ ALL PASS

---

## Summary

| Layer                | Suite                       | Tests  | Passed | Failed | Duration |
| -------------------- | --------------------------- | ------ | ------ | ------ | -------- |
| Backend — Service    | `auth_service_test.go`      | 6      | 6      | 0      | 0.56s    |
| Backend — Service    | `page_service_test.go`      | 7      | 7      | 0      | cached   |
| Backend — Handler    | `auth_handler_test.go`      | 12     | 12     | 0      | 0.57s    |
| Backend — Handler    | `page_handler_test.go`      | 23     | 23     | 0      | —        |
| Backend — Middleware | `auth_middleware_test.go`   | 6      | 6      | 0      | 0.57s    |
| Frontend — Store     | `use-user-store.test.ts`    | 6      | 6      | 0      | —        |
| Frontend — Store     | `use-sidebar-store.test.ts` | 8      | 8      | 0      | —        |
| Frontend — Lib       | `api.test.ts`               | 7      | 7      | 0      | —        |
| Frontend — Lib       | `page-api.test.ts`          | 8      | 8      | 0      | —        |
| **Total**            |                             | **83** | **83** | **0**  | ~3.5s    |

---

## Backend Tests (Go)

**Command:** `go test -v ./test/... ./internal/service/...`  
**Framework:** Go `testing` standard library  
**Pattern:** Mock-based unit tests with `httptest`

### Service Layer Tests (`internal/service/`)

#### `auth_service_test.go` — Password Hashing (6 tests)

| #   | Test Name                                         | Status  | Description                                    |
| --- | ------------------------------------------------- | ------- | ---------------------------------------------- |
| 1   | `TestHashPassword_ProducesValidHash`              | ✅ PASS | Bcrypt hash is non-empty and starts with `$`   |
| 2   | `TestVerifyPassword_CorrectPassword`              | ✅ PASS | Correct password verifies against its hash     |
| 3   | `TestVerifyPassword_WrongPassword`                | ✅ PASS | Wrong password fails verification              |
| 4   | `TestHashPassword_DifferentHashesForSamePassword` | ✅ PASS | Same password produces different hashes (salt) |
| 5   | `TestVerifyPassword_InvalidHash`                  | ✅ PASS | Invalid hash string returns false              |
| 6   | `TestVerifyPassword_EmptyPassword`                | ✅ PASS | Empty password fails against valid hash        |

#### `page_service_test.go` — Tree Construction Algorithm (7 tests)

| #   | Test Name                                      | Status  | Description                            |
| --- | ---------------------------------------------- | ------- | -------------------------------------- |
| 1   | `TestBuildTree_EmptyList`                      | ✅ PASS | Nil input returns empty slice          |
| 2   | `TestBuildTree_SingleRoot`                     | ✅ PASS | Single root page, depth 0, no children |
| 3   | `TestBuildTree_LinearChain`                    | ✅ PASS | A → B → C chain, depths 0/1/2          |
| 4   | `TestBuildTree_MultipleRoots`                  | ✅ PASS | Two roots, one with a child            |
| 5   | `TestBuildTree_MultipleChildrenSameParent`     | ✅ PASS | One root with 3 children, all depth 1  |
| 6   | `TestBuildTree_DeepNesting`                    | ✅ PASS | 5 levels deep (L0→L1→L2→L3→L4)         |
| 7   | `TestBuildTree_ChildrenHaveEmptyChildrenSlice` | ✅ PASS | Leaf children have `[]` not `nil`      |

### Handler Layer Tests (`test/handler/`)

#### `auth_handler_test.go` — Auth Endpoint Handlers (12 tests)

| #   | Test Name                        | Status  | Endpoint            | HTTP Status        | Description                       |
| --- | -------------------------------- | ------- | ------------------- | ------------------ | --------------------------------- |
| 1   | `TestSignup_Success`             | ✅ PASS | `POST /auth/signup` | 201 Created        | Valid signup returns token + user |
| 2   | `TestSignup_EmptyEmail`          | ✅ PASS | `POST /auth/signup` | 400 Bad Request    | Empty email rejected              |
| 3   | `TestSignup_EmptyPassword`       | ✅ PASS | `POST /auth/signup` | 400 Bad Request    | Empty password rejected           |
| 4   | `TestSignup_ShortPassword`       | ✅ PASS | `POST /auth/signup` | 400 Bad Request    | Password < 6 chars rejected       |
| 5   | `TestSignup_InvalidEmailFormat`  | ✅ PASS | `POST /auth/signup` | 400 Bad Request    | Email without `@` rejected        |
| 6   | `TestSignup_DuplicateEmail`      | ✅ PASS | `POST /auth/signup` | 409 Conflict       | Existing email returns conflict   |
| 7   | `TestSignup_InvalidJSON`         | ✅ PASS | `POST /auth/signup` | 400 Bad Request    | Malformed JSON body rejected      |
| 8   | `TestLogin_Success`              | ✅ PASS | `POST /auth/login`  | 200 OK             | Valid login returns token + user  |
| 9   | `TestLogin_EmptyCredentials`     | ✅ PASS | `POST /auth/login`  | 400 Bad Request    | Empty credentials rejected        |
| 10  | `TestLogin_InvalidCredentials`   | ✅ PASS | `POST /auth/login`  | 401 Unauthorized   | Wrong password returns 401        |
| 11  | `TestLogin_InvalidJSON`          | ✅ PASS | `POST /auth/login`  | 400 Bad Request    | Malformed JSON body rejected      |
| 12  | `TestLogin_ServiceInternalError` | ✅ PASS | `POST /auth/login`  | 500 Internal Error | Database errors handled           |

#### `page_handler_test.go` — Page CRUD Endpoint Handlers (23 tests)

| #   | Test Name                        | Status  | Endpoint                  | HTTP Status        | Description                    |
| --- | -------------------------------- | ------- | ------------------------- | ------------------ | ------------------------------ |
| 1   | `TestCreatePage_Success`         | ✅ PASS | `POST /pages`             | 201 Created        | Root page creation             |
| 2   | `TestCreatePage_WithParent`      | ✅ PASS | `POST /pages`             | 201 Created        | Child page with parentId       |
| 3   | `TestCreatePage_Unauthorized`    | ✅ PASS | `POST /pages`             | 401 Unauthorized   | No auth token → 401            |
| 4   | `TestCreatePage_InvalidJSON`     | ✅ PASS | `POST /pages`             | 400 Bad Request    | Malformed JSON rejected        |
| 5   | `TestCreatePage_InvalidParentID` | ✅ PASS | `POST /pages`             | 400 Bad Request    | Invalid UUID format rejected   |
| 6   | `TestCreatePage_ParentNotFound`  | ✅ PASS | `POST /pages`             | 404 Not Found      | Non-existent parent → 404      |
| 7   | `TestGetPage_Success`            | ✅ PASS | `GET /pages/{id}`         | 200 OK             | Valid page retrieval           |
| 8   | `TestGetPage_NotFound`           | ✅ PASS | `GET /pages/{id}`         | 404 Not Found      | Non-existent page → 404        |
| 9   | `TestGetPage_InvalidID`          | ✅ PASS | `GET /pages/{id}`         | 400 Bad Request    | Invalid UUID → 400             |
| 10  | `TestGetPage_Unauthorized`       | ✅ PASS | `GET /pages/{id}`         | 401 Unauthorized   | No auth → 401                  |
| 11  | `TestUpdatePage_Success`         | ✅ PASS | `PATCH /pages/{id}`       | 200 OK             | Title update succeeds          |
| 12  | `TestUpdatePage_NoFields`        | ✅ PASS | `PATCH /pages/{id}`       | 400 Bad Request    | Empty update body rejected     |
| 13  | `TestUpdatePage_NotFound`        | ✅ PASS | `PATCH /pages/{id}`       | 404 Not Found      | Update non-existent page → 404 |
| 14  | `TestDeletePage_Success`         | ✅ PASS | `DELETE /pages/{id}`      | 200 OK             | Successful deletion            |
| 15  | `TestDeletePage_NotFound`        | ✅ PASS | `DELETE /pages/{id}`      | 404 Not Found      | Delete non-existent page → 404 |
| 16  | `TestDeletePage_Unauthorized`    | ✅ PASS | `DELETE /pages/{id}`      | 401 Unauthorized   | No auth → 401                  |
| 17  | `TestGetSidebar_Success`         | ✅ PASS | `GET /pages/sidebar`      | 200 OK             | Returns nested tree            |
| 18  | `TestGetSidebar_Empty`           | ✅ PASS | `GET /pages/sidebar`      | 200 OK             | Empty tree for new user        |
| 19  | `TestGetSidebar_Unauthorized`    | ✅ PASS | `GET /pages/sidebar`      | 401 Unauthorized   | No auth → 401                  |
| 20  | `TestGetSidebar_ServiceError`    | ✅ PASS | `GET /pages/sidebar`      | 500 Internal Error | Service failure handled        |
| 21  | `TestSaveContent_Success`        | ✅ PASS | `PUT /pages/{id}/content` | 200 OK             | BlockNote JSON saved           |
| 22  | `TestSaveContent_InvalidJSON`    | ✅ PASS | `PUT /pages/{id}/content` | 400 Bad Request    | Invalid JSON rejected          |
| 23  | `TestGetContent_Success`         | ✅ PASS | `GET /pages/{id}/content` | 200 OK             | Content retrieval              |
| 24  | `TestGetContent_NotFound`        | ✅ PASS | `GET /pages/{id}/content` | 404 Not Found      | Non-existent page → 404        |

### Middleware Tests (`test/middleware/`)

#### `auth_middleware_test.go` — JWT Auth Middleware (6 tests)

| #   | Test Name                             | Status  | Description                                       |
| --- | ------------------------------------- | ------- | ------------------------------------------------- |
| 1   | `TestAuth_MissingAuthorizationHeader` | ✅ PASS | No `Authorization` header → 401                   |
| 2   | `TestAuth_InvalidHeaderFormat`        | ✅ PASS | Non-Bearer prefix → 401                           |
| 3   | `TestAuth_InvalidToken`               | ✅ PASS | Invalid JWT → 401, handler not called             |
| 4   | `TestAuth_ValidToken`                 | ✅ PASS | Valid JWT → handler called with userID in context |
| 5   | `TestAuth_BearerOnly_NoToken`         | ✅ PASS | `Bearer` without token value → 401                |
| 6   | `TestGetUserID_NotPresent`            | ✅ PASS | No userID in context returns `(_, false)`         |

---

## Frontend Tests (TypeScript / Jest)

**Command:** `npx jest --config jest.config.js --verbose`  
**Framework:** Jest + ts-jest  
**Test Suites:** 4 passed, 4 total  
**Tests:** 30 passed, 30 total  
**Time:** ~2.3s

### Zustand Store Tests

#### `use-user-store.test.ts` — Auth Store (6 tests)

| #   | Test Name                                                 | Status  | Description                |
| --- | --------------------------------------------------------- | ------- | -------------------------- |
| 1   | `initial state is null token and null user`               | ✅ PASS | Default state verification |
| 2   | `setAuth stores token and user in state and localStorage` | ✅ PASS | Auth persistence           |
| 3   | `logout clears state and localStorage`                    | ✅ PASS | Clean logout               |
| 4   | `hydrate restores token and user from localStorage`       | ✅ PASS | Page refresh recovery      |
| 5   | `hydrate handles missing localStorage data gracefully`    | ✅ PASS | No stored data → null      |
| 6   | `hydrate handles corrupted user JSON gracefully`          | ✅ PASS | Parse error → null user    |

#### `use-sidebar-store.test.ts` — Sidebar Store (8 tests)

| #   | Test Name                                                 | Status  | Description        |
| --- | --------------------------------------------------------- | ------- | ------------------ |
| 1   | `initial state has empty expandedIds and null renamingId` | ✅ PASS | Default state      |
| 2   | `toggle adds an id to expandedIds`                        | ✅ PASS | Expand a node      |
| 3   | `toggle removes an already expanded id`                   | ✅ PASS | Collapse a node    |
| 4   | `expand adds id without affecting others`                 | ✅ PASS | Targeted expand    |
| 5   | `expand is idempotent`                                    | ✅ PASS | Double expand safe |
| 6   | `collapse removes a specific id`                          | ✅ PASS | Targeted collapse  |
| 7   | `collapse on non-existing id does nothing`                | ✅ PASS | No-op collapse     |
| 8   | `setRenamingId sets the renaming page id`                 | ✅ PASS | Rename mode start  |
| 9   | `setRenamingId(null) clears the renaming state`           | ✅ PASS | Rename mode end    |

### API Utility Tests

#### `api.test.ts` — apiFetch Wrapper (7 tests)

| #   | Test Name                                                  | Status  | Description               |
| --- | ---------------------------------------------------------- | ------- | ------------------------- |
| 1   | `makes GET request and returns data from response wrapper` | ✅ PASS | Unwraps `{data}` response |
| 2   | `attaches Authorization header when token exists`          | ✅ PASS | Bearer token injection    |
| 3   | `does not attach Authorization header when no token`       | ✅ PASS | Public route behavior     |
| 4   | `makes POST request with JSON body`                        | ✅ PASS | Body serialization        |
| 5   | `throws error with message from API error response`        | ✅ PASS | Error message extraction  |
| 6   | `throws generic error when API returns non-JSON error`     | ✅ PASS | Fallback error handling   |
| 7   | `passes custom headers alongside defaults`                 | ✅ PASS | Header merging            |

#### `page-api.test.ts` — Page API Functions (8 tests)

| #   | Test Name                                        | Status  | Description               |
| --- | ------------------------------------------------ | ------- | ------------------------- |
| 1   | `fetchSidebarTree calls apiFetch correctly`      | ✅ PASS | `GET /pages/sidebar`      |
| 2   | `creates a root page with title`                 | ✅ PASS | `POST /pages` no parent   |
| 3   | `creates a child page with parentId`             | ✅ PASS | `POST /pages` with parent |
| 4   | `defaults title to 'Untitled' when not provided` | ✅ PASS | Default title behavior    |
| 5   | `fetches a page by id`                           | ✅ PASS | `GET /pages/:id`          |
| 6   | `sends PATCH with title update`                  | ✅ PASS | `PATCH /pages/:id`        |
| 7   | `sends PATCH with icon update`                   | ✅ PASS | Icon update via PATCH     |
| 8   | `sends DELETE request and returns success`       | ✅ PASS | `DELETE /pages/:id`       |

---

## Test File Locations

### Backend (Go)

| File              | Location                                               |
| ----------------- | ------------------------------------------------------ |
| Service — Auth    | `nochuay-back/internal/service/auth_service_test.go`   |
| Service — Page    | `nochuay-back/internal/service/page_service_test.go`   |
| Handler — Auth    | `nochuay-back/test/handler/auth_handler_test.go`       |
| Handler — Page    | `nochuay-back/test/handler/page_handler_test.go`       |
| Handler — Mocks   | `nochuay-back/test/handler/mock_services.go`           |
| Middleware — Auth | `nochuay-back/test/middleware/auth_middleware_test.go` |

### Frontend (TypeScript)

| File          | Location                                        |
| ------------- | ----------------------------------------------- |
| User Store    | `test/frontend/store/use-user-store.test.ts`    |
| Sidebar Store | `test/frontend/store/use-sidebar-store.test.ts` |
| API Wrapper   | `test/frontend/lib/api.test.ts`                 |
| Page API      | `test/frontend/lib/page-api.test.ts`            |

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
go test -v ./test/... ./internal/service/...
```

### Run Frontend Tests

```bash
cd nochuay-front
npx jest --config jest.config.js --verbose
```

### Run All Tests

```bash
# Backend
cd nochuay-back && go test -v ./... && cd ..

# Frontend
cd nochuay-front && npx jest --config jest.config.js && cd ..
```
