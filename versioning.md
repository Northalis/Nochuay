# Versioning

## 2026-04-15

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
