---
description: How to run tests and linting for the frontend
---

## Test Requirements

**When making code changes, always add or update tests:**

- **New component or feature** → Create a new test file in `src/__tests__/` (e.g., `ComponentName.test.jsx`)
- **Modified component** → Update the existing test file to cover the changed behavior
- **Bug fix** → Add a regression test that would have caught the bug
- **Permissions/visibility changes** → Add both positive (user with permission sees it) and negative (user without permission does NOT see it) assertions

### Test Conventions
- Follow existing patterns in `src/__tests__/` for store setup, mocking, and rendering
- Mock external dependencies (axios, react-datepicker, react-big-calendar) at the module level
- Use `screen.findByText` for async content, `screen.getByText` for synchronous
- Use `screen.getAllByRole('combobox')` when multiple dropdowns exist — index by position
- Gate admin-only tests with proper `permissions` in the preloaded auth state
- Always verify tests pass before committing: `npx vitest run`

## Running Tests

// turbo
1. Run the full test suite:
```bash
npx vitest run
```

2. Run a specific test file:
```bash
npx vitest run src/__tests__/QRAttendance.test.jsx
```

3. Run tests in watch mode:
```bash
npm run test:watch
```

4. Run tests with coverage:
```bash
npm run coverage
```

## Running Linting

// turbo
5. Run ESLint on the entire src directory:
```bash
npx eslint src/
```

## Notes

- Test environment is `jsdom` (configured in `vite.config.js`)
- Test setup file is at `src/test/setup.js` (mocks localStorage)
- Tests use `@testing-library/react` and `vitest`
- All test files are in `src/__tests__/`
