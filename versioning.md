# Versioning

## 2026-04-28

### v1.3.0 UI Refinement + Account/Search Support

- Auth UI polish:
  - Added reusable auth header with centered Nochuay text logo
  - Refined login/register form styling for friendlier focus/hover states
  - Preserved light/dark consistency and mobile layout
- Document page improvements:
  - Breadcrumb and title now feel seamless (no hard visual split)
  - Inline editable page title with debounced save + blur commit
  - Title changes no longer sync to the editor heading; Heading 1 is user-owned
  - Page title typography enlarged to match or slightly exceed Heading 1
- Sidebar Search:
  - Backend search endpoint `GET /pages/search?q=...` (user-scoped, case-insensitive)
  - Prefix-first, then A-Z title ordering
  - Frontend search modal with debounced live results and navigation
- Settings modal + account management:
  - Settings modal with Account + Preference categories
  - Protected account endpoints:
    - `PATCH /auth/account/email`
    - `PATCH /auth/account/password`
  - Frontend account mutations with immediate email sync in store
  - Theme control moved from profile menu to Settings > Preference
- Tests and validation updates:
  - Added backend service + handler coverage for account updates
  - Added frontend tests for account API and user email update
  - Targeted lint and Jest runs validated
- UI version label updated to `Nochuay v1.3.0`

### Purpose

- Deliver a polished v1.3.0 UI release with search, settings, and account management, while keeping the editor heading independent from the page title.

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
