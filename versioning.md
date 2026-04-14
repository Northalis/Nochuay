# Versioning

## 2026-04-15

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
