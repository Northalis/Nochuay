# Testing Guide

This document covers the testing strategy, test structure, how to run tests, and guidelines for writing new tests in the Nochuay project.

---

## Test Summary

| Layer                | Suite                          | Focus                                  | Framework                 |
| -------------------- | ------------------------------ | -------------------------------------- | ------------------------- |
| Backend — Service    | `auth_service_test.go`         | Password hashing + verification        | Go `testing`              |
| Backend — Service    | `auth_account_service_test.go` | Account email/password updates         | Go `testing`              |
| Backend — Service    | `page_service_test.go`         | Tree construction                      | Go `testing`              |
| Backend — Handler    | `auth_handler_test.go`         | Auth endpoints + account updates       | Go `testing` + `httptest` |
| Backend — Handler    | `page_handler_test.go`         | Pages, content, search, trash, uploads | Go `testing` + `httptest` |
| Backend — Middleware | `auth_middleware_test.go`      | JWT auth middleware                    | Go `testing` + `httptest` |
| Frontend — Store     | `use-user-store.test.ts`       | Auth store                             | Jest + ts-jest            |
| Frontend — Store     | `use-sidebar-store.test.ts`    | Sidebar store                          | Jest + ts-jest            |
| Frontend — Store     | `use-theme-store.test.ts`      | Theme preference store                 | Jest + ts-jest            |
| Frontend — Hooks     | `use-pages.keys.test.ts`       | User-scoped query keys                 | Jest + ts-jest            |
| Frontend — Lib       | `api.test.ts`                  | `apiFetch` wrapper                     | Jest + ts-jest            |
| Frontend — Lib       | `auth-api.test.ts`             | Account API helper calls               | Jest + ts-jest            |
| Frontend — Lib       | `page-api.test.ts`             | Page API helper calls                  | Jest + ts-jest            |
| Frontend — Lib       | `breadcrumb.test.ts`           | Breadcrumb path building               | Jest + ts-jest            |

**Status:** Run the test commands below to generate the latest results.

---

## Running Tests

### Backend (Go)

```bash
# Run all backend tests
cd nochuay-back
go test -v ./...

# Run specific test file
go test -v ./internal/service/ -run TestBuildTree

# Run with race detector
go test -race -v ./...

# Run with coverage
go test -cover ./...
```

### Frontend (TypeScript/Jest)

```bash
# Run all frontend tests
cd nochuay-front
npx jest --roots ./test/frontend --verbose

# Run specific test file
npx jest test/frontend/store/use-user-store.test.ts --verbose

# Run with coverage
npx jest --coverage

# Run in watch mode
npx jest --watch
```

---

## Backend Tests

### Test Architecture

Backend tests use the Go standard `testing` package with two approaches:

1. **Service layer tests** — Direct unit tests of exported functions (no mocks needed for pure logic)
2. **Handler/middleware tests** — Mock-based tests using `httptest.NewRecorder()` and mock service implementations

### File Locations

```
nochuay-back/
├── internal/service/
│   ├── auth_service_test.go      # Password hashing tests
│   └── page_service_test.go      # Tree construction tests
└── test/
    ├── handler/
    │   ├── mock_services.go      # Mock implementations
    │   ├── auth_handler_test.go  # Auth endpoint tests
    │   └── page_handler_test.go  # Page endpoint tests
    └── middleware/
        └── auth_middleware_test.go # JWT middleware tests
```

### Service Layer Tests

#### `auth_service_test.go` — Password Hashing (6 tests)

Tests the bcrypt hashing and verification functions directly:

| Test                                              | Validates                                      |
| ------------------------------------------------- | ---------------------------------------------- |
| `TestHashPassword_ProducesValidHash`              | Hash is non-empty and has bcrypt prefix (`$`)  |
| `TestVerifyPassword_CorrectPassword`              | Correct password verifies successfully         |
| `TestVerifyPassword_WrongPassword`                | Wrong password fails verification              |
| `TestHashPassword_DifferentHashesForSamePassword` | Same password produces different hashes (salt) |
| `TestVerifyPassword_InvalidHash`                  | Invalid hash string returns false              |
| `TestVerifyPassword_EmptyPassword`                | Empty password fails against valid hash        |

#### `page_service_test.go` — Tree Construction (7 tests)

Tests the `BuildTree()` function that converts a flat page list into a nested tree:

| Test                                           | Input                     | Validates                         |
| ---------------------------------------------- | ------------------------- | --------------------------------- |
| `TestBuildTree_EmptyList`                      | `nil`                     | Returns empty slice               |
| `TestBuildTree_SingleRoot`                     | 1 root page               | Single node, depth 0, no children |
| `TestBuildTree_LinearChain`                    | A → B → C                 | Chain nesting, depths 0/1/2       |
| `TestBuildTree_MultipleRoots`                  | 2 roots + 1 child         | Multiple root nodes               |
| `TestBuildTree_MultipleChildrenSameParent`     | 1 root + 3 children       | All children at depth 1           |
| `TestBuildTree_DeepNesting`                    | 5 levels (L0→L1→L2→L3→L4) | Correct depth at each level       |
| `TestBuildTree_ChildrenHaveEmptyChildrenSlice` | 1 leaf page               | Children is `[]` not `nil`        |

**Helper function:**

```go
func makePage(title string, parentID *uuid.UUID) model.Page
```

Creates a test page with auto-generated UUID and fixed test user ID.

### Handler Layer Tests

Handler tests use mock service implementations (defined in `test/handler/mock_services.go`) with `httptest` for HTTP testing.

**Pattern:**

```go
func TestCreatePage_Success(t *testing.T) {
    // 1. Create mock service with predefined behavior
    mockService := &MockPageService{
        CreatePageFn: func(ctx, userID, parentID, title) (*model.Page, error) {
            return &model.Page{...}, nil
        },
    }

    // 2. Create handler with mock
    handler := handler.NewPageHandler(mockService)

    // 3. Create HTTP request
    body := `{"title": "Test Page"}`
    req := httptest.NewRequest("POST", "/pages", strings.NewReader(body))

    // 4. Inject userID into context (simulating auth middleware)
    ctx := context.WithValue(req.Context(), middleware.UserIDKey, testUserID)
    req = req.WithContext(ctx)

    // 5. Record response
    rr := httptest.NewRecorder()
    handler.CreatePage(rr, req)

    // 6. Assert
    assert(rr.Code == http.StatusCreated)
}
```

#### `auth_handler_test.go` — Auth Endpoints (12 tests)

| Test                             | Endpoint          | Status | Description              |
| -------------------------------- | ----------------- | ------ | ------------------------ |
| `TestSignup_Success`             | POST /auth/signup | 201    | Valid signup             |
| `TestSignup_EmptyEmail`          | POST /auth/signup | 400    | Empty email rejected     |
| `TestSignup_EmptyPassword`       | POST /auth/signup | 400    | Empty password rejected  |
| `TestSignup_ShortPassword`       | POST /auth/signup | 400    | Password < 6 chars       |
| `TestSignup_InvalidEmailFormat`  | POST /auth/signup | 400    | Email without `@`        |
| `TestSignup_DuplicateEmail`      | POST /auth/signup | 409    | Duplicate email conflict |
| `TestSignup_InvalidJSON`         | POST /auth/signup | 400    | Malformed JSON body      |
| `TestLogin_Success`              | POST /auth/login  | 200    | Valid login              |
| `TestLogin_EmptyCredentials`     | POST /auth/login  | 400    | Empty credentials        |
| `TestLogin_InvalidCredentials`   | POST /auth/login  | 401    | Wrong password           |
| `TestLogin_InvalidJSON`          | POST /auth/login  | 400    | Malformed JSON body      |
| `TestLogin_ServiceInternalError` | POST /auth/login  | 500    | Database error handling  |

#### `page_handler_test.go` — Page Endpoints (23 tests)

Covers all page CRUD endpoints including sidebar, content save/get, and error cases. See `doc/test-results.md` for the full test matrix.

### Middleware Tests

#### `auth_middleware_test.go` — JWT Middleware (6 tests)

| Test                                  | Validates                                     |
| ------------------------------------- | --------------------------------------------- |
| `TestAuth_MissingAuthorizationHeader` | No header → 401 response                      |
| `TestAuth_InvalidHeaderFormat`        | Non-Bearer prefix → 401                       |
| `TestAuth_InvalidToken`               | Invalid JWT → 401, handler not called         |
| `TestAuth_ValidToken`                 | Valid JWT → handler called, userID in context |
| `TestAuth_BearerOnly_NoToken`         | `Bearer` without token → 401                  |
| `TestGetUserID_NotPresent`            | No userID in context returns `(_, false)`     |

### Mock Data

Test fixture JSON files are in `nochuay-back/test/mockdata/`:

| File                           | Used For                    |
| ------------------------------ | --------------------------- |
| `auth-signup.json`             | Valid signup request body   |
| `auth-signup-invalid.json`     | Invalid signup request      |
| `auth-login.json`              | Valid login request body    |
| `auth-login-invalid.json`      | Invalid login request       |
| `page-create.json`             | Root page creation          |
| `page-create-child.json`       | Child page creation         |
| `page-update-title.json`       | Title-only update           |
| `page-update-icon.json`        | Icon-only update            |
| `page-update-content.json`     | Content update              |
| `page-update-multiple.json`    | Multi-field update          |
| `page-save-content.json`       | Content save (PUT endpoint) |
| `page-save-content-empty.json` | Empty content save          |

---

## Frontend Tests

### Test Architecture

Frontend tests use **Jest** with **ts-jest** for TypeScript compilation, running in a `jsdom` environment.

**Configuration:** `nochuay-front/jest.config.js`

### File Locations

```
nochuay-front/test/frontend/
├── hooks/
│   └── use-pages.keys.test.ts    # Query key scoping tests
├── lib/
│   ├── api.test.ts               # apiFetch wrapper tests
│   ├── auth-api.test.ts          # Account API helper tests
│   ├── breadcrumb.test.ts        # Breadcrumb path builder tests
│   └── page-api.test.ts          # Page API function tests
└── store/
    ├── use-sidebar-store.test.ts # Sidebar store tests
    ├── use-theme-store.test.ts   # Theme store tests
    └── use-user-store.test.ts    # Auth store tests
```

### Store Tests

#### `use-user-store.test.ts` — Auth Store (6 tests)

Tests the Zustand auth store including localStorage persistence:

| Test                                       | Validates                  |
| ------------------------------------------ | -------------------------- |
| Initial state is null                      | Default state verification |
| `setAuth` stores in state and localStorage | Auth persistence           |
| `logout` clears state and localStorage     | Clean logout               |
| `hydrate` restores from localStorage       | Page refresh recovery      |
| `hydrate` handles missing data             | No stored data → null      |
| `hydrate` handles corrupted JSON           | Parse error → null user    |

#### `use-sidebar-store.test.ts` — Sidebar Store (8 tests)

Tests the Zustand sidebar state (expand/collapse, rename):

| Test                           | Validates                          |
| ------------------------------ | ---------------------------------- |
| Initial state                  | Empty `expandedIds`, null renaming |
| `toggle` adds id               | Expand a node                      |
| `toggle` removes id            | Collapse a node                    |
| `expand` is targeted           | Adds specific id only              |
| `expand` is idempotent         | Double expand is safe              |
| `collapse` removes specific id | Targeted collapse                  |
| `collapse` on non-existing id  | No-op behavior                     |
| `setRenamingId` set and clear  | Rename mode management             |

#### `use-theme-store.test.ts` — Theme Store

Validates default mode, explicit set, toggle behavior, and hydration from localStorage.

### Hook Tests

#### `use-pages.keys.test.ts` — Query Key Scoping

Ensures page-related query keys are scoped by user ID and query input to prevent cache leakage.

### API Tests

#### `api.test.ts` — apiFetch Wrapper (7 tests)

Tests the generic fetch wrapper including auth header injection and error handling:

| Test                                     | Validates                    |
| ---------------------------------------- | ---------------------------- |
| GET request returns unwrapped data       | `{data}` response extraction |
| Attaches Authorization when token exists | Bearer token injection       |
| No Authorization without token           | Public route behavior        |
| POST with JSON body                      | Request body serialization   |
| Throws error from API error response     | Error message extraction     |
| Throws generic error for non-JSON error  | Fallback error handling      |
| Passes custom headers                    | Header merging               |

#### `page-api.test.ts` — Page API Functions (8 tests)

Tests the typed page API wrapper functions:

| Test               | API Call           | Validates                 |
| ------------------ | ------------------ | ------------------------- |
| `fetchSidebarTree` | GET /pages/sidebar | Correct path              |
| Create root page   | POST /pages        | No parentId               |
| Create child page  | POST /pages        | With parentId             |
| Default title      | POST /pages        | `"Untitled"` fallback     |
| Fetch page by id   | GET /pages/:id     | Correct path construction |
| PATCH with title   | PATCH /pages/:id   | Title field only          |
| PATCH with icon    | PATCH /pages/:id   | Icon field only           |
| DELETE page        | DELETE /pages/:id  | Returns `{success: true}` |

#### `auth-api.test.ts` — Account API Functions

Validates request construction for account email and password updates.

#### `breadcrumb.test.ts` — Breadcrumb Builder

Validates breadcrumb path generation, collapse behavior, and fallback handling.

---

## Writing New Tests

### Backend Test Guidelines

1. **Service layer:** Test pure logic directly. Use the `makePage()` helper for test data.
2. **Handler layer:** Use mock services and `httptest`:
   - Create mock service with configurable function fields
   - Use `httptest.NewRequest()` and `httptest.NewRecorder()`
   - Inject `userID` into context to simulate auth middleware
3. **Always test:** Success path, validation errors, not-found cases, unauthorized access
4. **Error messages:** Assert specific error message strings from `response.Error()`

### Frontend Test Guidelines

1. **Store tests:** Test state transitions directly via Zustand's `getState()` and `setState()`
2. **API tests:** Mock `fetch` globally, verify request construction and response parsing
3. **Mock localStorage:** Clear between tests to prevent state leakage
4. **Types:** Use TypeScript interfaces to type test fixtures

### Test Naming Convention

**Backend (Go):**

```go
func TestMethodName_Scenario(t *testing.T) { ... }
// Example: TestBuildTree_EmptyList, TestSignup_DuplicateEmail
```

**Frontend (Jest):**

```typescript
describe("module name", () => {
  it("describes the expected behavior", () => { ... });
});
```

---

## Coverage Areas

### What Is Tested

| Area                     | Coverage                                      |
| ------------------------ | --------------------------------------------- |
| Password hashing         | bcrypt hash, verify, salt uniqueness          |
| Tree construction        | Empty, single, chain, multi-root, deep nest   |
| Auth handlers            | Success, validation, duplicate, malformed     |
| Page CRUD handlers       | All endpoints, all error codes                |
| Auth middleware          | Missing/invalid/valid token, context inject   |
| Zustand stores (auth)    | setAuth, logout, hydrate, corrupted data      |
| Zustand stores (sidebar) | expand, collapse, toggle, rename              |
| API client (apiFetch)    | Auth headers, error handling, response unwrap |
| Page API functions       | All CRUD calls, default values                |

### What Is Not Yet Tested

| Area                         | Reason                               |
| ---------------------------- | ------------------------------------ |
| React component rendering    | Requires React Testing Library setup |
| BlockNote editor integration | Complex browser API dependencies     |
| Database integration tests   | Requires live PostgreSQL instance    |
| End-to-end flows             | Requires Playwright/Cypress setup    |
| TanStack Query hooks         | Requires test query client wrapper   |

---

## Continuous Integration

Tests run in GitHub Actions on push and pull request. The CI pipeline:

1. **Build** — Compile backend binary, install frontend dependencies
2. **Test** — Run `go test ./...` and `npx jest --roots ./test/frontend --verbose`
3. **Lint** — Run `go vet ./...` and `npm run lint`

See `.github/workflows/` for pipeline configuration.
