---
description: How to run tests and linting for the frontend
---

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
