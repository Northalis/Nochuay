# Versioning

## 2026-04-23

### v1.3.0 UI Refinement + Account/Search Support

- Phase 1: Auth UI polish
  - Added reusable auth brand/header treatment on login and register pages.
  - Refined form card/input/button visuals for friendlier rounded interactions with clearer hover/focus states.
  - Confirmed responsive behavior and light/dark consistency.
- Phase 2: Document page seamlessness + title UX
  - Smoothed document top layout so breadcrumb/title section feels continuous.
  - Upgraded page title to inline editable control with debounce + blur commit behavior.
  - Removed title/Editor Heading 1 synchronization so page title updates only page metadata.
  - Increased page title visual scale to match/slightly exceed heading emphasis.
- Phase 3: Sidebar Search
  - Added protected backend endpoint `GET /pages/search?q=...` (user-scoped, title-based).
  - Added search ordering preference for prefix matches first, then title A-Z.
  - Added frontend debounced Search modal with loading, empty, error, and click-to-navigate states.
  - Fixed runtime SQL escape issue that caused early-query failures.
- Phase 4: Sidebar Settings modal + account management
  - Added protected account endpoints:
    - `PATCH /auth/account/email`
    - `PATCH /auth/account/password`
  - Implemented backend repository/service/handler flow with password verification and conflict/error handling.
  - Added frontend account API helpers + mutation hooks.
  - Added Settings modal with `Account` and `Preference` sections.
  - Moved theme control from profile dropdown into Settings > Preference.
  - Synced updated email into auth user store on successful email change.
- Phase 5: Tests and verification hardening
  - Added backend service tests for search validation/pass-through/default limit/error wrapping.
  - Added backend handler tests for search/account endpoint paths.
  - Added backend auth account service tests for email/password update logic.
  - Added frontend tests for account API wrappers and user store email synchronization.
  - Validation run:
    - `go test -v ./...` (backend)
    - `go vet ./...` (backend)
    - `npx jest --roots ./test/frontend --verbose` (frontend)
    - targeted `npx eslint <changed files>` (frontend)

### Purpose

- Deliver v1.3.0 as a UI-forward release with stable search and account settings flows while preserving existing architecture and query/store patterns.

## 2026-04-15

### v1.2.0 Feature Implementation

- Added frontend breadcrumb navigation for recursive documents:
  - New breadcrumb segment builder utility for deriving path from sidebar tree data
  - New breadcrumb UI component at the top of document pages
  - Clickable breadcrumb segments for fast ancestor navigation (`main` routes to `/`)
  - Breadcrumb path auto-collapses based on current route depth (example: from `main>page1>page2>page3` to `main>page1`)
- Updated document page layout:
  - Breadcrumb displayed on top with muted neutral colors for light/dark modes
  - Page icon/title moved into a centered section positioned closer to the editor
  - Long breadcrumb paths wrap across lines
- Updated app version label in sidebar footer to `Nochuay v1.2.0`
- Added frontend tests:
  - New unit tests for breadcrumb path builder covering root path, deep path, fallback behavior, and collapse behavior

### Purpose

- Deliver v1.2.0 UX enhancement for recursive navigation clarity and faster jumping across nested pages.

### v1.1.0 Feature Implementation

- Added backend page asset upload endpoint:
  - `POST /pages/{id}/assets` (multipart upload with `kind=image|file` + `file`)
  - Validation for allowed types and configurable max size
  - New config vars:
    - `UPLOAD_DIR` (default: `uploads`)
    - `MAX_UPLOAD_SIZE_BYTES` (default: `10485760`)
- Added static asset serving endpoint:
  - `GET /assets/...` for uploaded file/image retrieval
- Added frontend upload integration:
  - `uploadPageAsset()` in page API layer
  - `apiFetch()` now supports `FormData` without forcing JSON `Content-Type`
  - BlockNote slash menu now supports direct local upload for `Image` and `File`
- Added dark/light theme toggle in sidebar profile menu:
  - Light mode default
  - Zustand theme store persistence (`use-theme-store`)
  - Theme provider + pre-hydration script in root layout
  - BlockNote editor theme now follows current app mode
- Updated UI version label to `Nochuay v1.1.0`
- Added/updated tests:
  - Backend handler tests for upload success, invalid kind/type, and max-size failure
  - Frontend tests for multipart API behavior, upload API helper, and theme store

### Purpose

- Deliver v1.1.0 user-facing enhancements:
  - local file/image uploads in editor
  - user-controlled dark/light theme switching

### Workspace Instruction Update (AGENTS.md)

- Updated project goal context to MVP v1.0.1 stabilization.
- Corrected frontend development command path to `cd nochuay-front && npm run dev`.
- Added frontend verification commands:
  - `cd nochuay-front && npx jest --roots ./test/frontend --verbose`
  - `cd nochuay-front && npx eslint <paths>`
- Updated frontend command recap to use the actual Jest invocation in this workspace.
- Added v1.0.1 data consistency guardrails:
  - user-scoped TanStack Query keys
  - document detail via TanStack Query (not ad-hoc `useEffect` fetch)
  - cache clear + sidebar UI reset on logout
  - targeted lint fallback for generated `.next` noise
- Added documentation index section in `AGENTS.md` to link existing docs rather than duplicate long guidance.

### Purpose

- Keep workspace instructions current with active bug-fix iteration practices.
- Preserve a separate, explicit history log for instruction-level changes.
