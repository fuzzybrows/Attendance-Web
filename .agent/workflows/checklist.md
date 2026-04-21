---
description: Checklist to follow before completing any code change
---

## Pre-Completion Checklist

Before considering any code change complete, **always** run through these steps:

### 1. Tests
- **Did you modify or add a component/page?** → Add or update tests in `src/__tests__/`
- **Did you fix a bug?** → Add a regression test that would have caught it
- **Did you change permissions/visibility?** → Add positive AND negative permission assertions
- Run `/testing` to verify all tests pass

### 2. Verification
- Run `npx vitest run` and confirm all tests pass
- Check the dev server for visual regressions if UI was changed

### 3. Tour Updates
- If you added a new admin feature or button, update `CalendarTour.jsx` or relevant tour component

This workflow is **automatically applicable** to every code change. You do not need to be asked to follow it.
