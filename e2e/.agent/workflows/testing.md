---
description: How to run E2E tests with Playwright
---

## Prerequisites

Both the backend and frontend dev servers must be running:
- Backend: `make dev` in `Attendance Server/` (port 8000)
- Frontend: `make dev` in `Attendance Web/` (port 5173)

The E2E admin user must exist in the database. See `scripts/seed.ts` for details.

## Running E2E Tests

// turbo-all

1. Install dependencies (first time only):
```bash
cd e2e && npm install && npx playwright install chromium && cd ..
```

2. Run all E2E tests (headless):
```bash
cd e2e && npx playwright test && cd ..
```

3. Run E2E tests with UI (interactive):
```bash
cd e2e && npx playwright test --ui && cd ..
```

4. Run a specific test file:
```bash
cd e2e && npx playwright test tests/auth/login.spec.ts && cd ..
```

5. View the HTML report:
```bash
cd e2e && npx playwright show-report && cd ..
```

## Seed & Teardown

The test suite automatically seeds and tears down test data via `globalSetup` and `globalTeardown`. You can also run them manually:

```bash
cd e2e && npx tsx scripts/seed.ts && cd ..
cd e2e && npx tsx scripts/teardown.ts && cd ..
```

## Notes

- Auth state is saved to `fixtures/.auth/admin.json` after the setup test
- Tests run sequentially with a single worker for state isolation
- Videos and screenshots are captured on failure in `test-results/`
