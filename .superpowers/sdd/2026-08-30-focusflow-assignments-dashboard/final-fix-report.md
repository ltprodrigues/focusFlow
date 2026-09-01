# Assignment milestone final stabilization report

## Reviewer findings

- **Next deadline:** addressed. It now comes from an independent, unbounded `from=now` request, selects the first incomplete API-sorted result, owns and aborts stale requests, and refreshes alongside weekly data after create/update/delete.
- **HTTP validation:** addressed. Required strings reject whitespace, due date and priority are nullable-required request fields, invalid JSON values return validation-problem responses through real HTTP-pipeline tests, and the named priority enum contract is preserved.
- **Top-level error boundary:** addressed with recovery copy, a reload action, and component coverage.
- **Migration/backfill:** addressed by changing the unreleased assignment migration's required `Course` default from blank to `General`. The snapshot needs no change because the default is a migration-only backfill choice. An idempotent SQL script from the fresh migration chain contains `DEFAULT 'General'`.
- **Development sample tasks:** addressed with two small, development-only, idempotent records tied to the configured demo user.
- **Accessible success feedback:** addressed with a visually-hidden `role=status` announcement after successful create/update/delete.
- **Non-JSON API failures:** addressed; plain-text failures now become useful `ApiError` messages.
- **Demo user fail-fast:** addressed; missing/non-positive demo user IDs throw during service construction.
- **Open findings:** none.

## RED / GREEN evidence

- RED frontend: independent future deadline absent, error-boundary module absent, and plain-text HTTP failure threw `response.json is not a function`.
- GREEN frontend focused: 26/26 tests passed.
- RED backend: development task seed count was zero; HTTP validation coverage drove test-host exposure; missing demo ID failed because no exception was thrown.
- GREEN backend focused: validation/seeder 8/8 passed; demo-user behavior passed in the full suite.

## Verification

- `dotnet test backend.Tests/backend.Tests.csproj`: 22 passed.
- `dotnet build backend/backend.csproj -c Release --no-restore`: succeeded, 0 warnings/errors.
- `npm.cmd test -- --run`: 45 passed.
- `npm.cmd run lint`: passed.
- `npm.cmd run build`: passed.
- EF idempotent migration SQL: `Course text NOT NULL DEFAULT 'General'`.
- `git diff --check`: passed (line-ending notices only).

## Commit

- Functional stabilization and initial report: `6ad5cad` (`fix: stabilize assignment milestone`).
