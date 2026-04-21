---
name: React & ESLint Rules
description: Coding rules and lint patterns for the Attendance Web frontend
---

# React & ESLint Rules

This project uses ESLint with strict React hooks rules. Follow these rules to avoid lint failures.

## Mandatory Lint Check

**Always run `npm run lint` after making code changes.** This must pass with 0 errors before any change is considered complete.

## Key ESLint Rules

### `react-hooks/set-state-in-effect`
- **Rule**: Do NOT call `setState` directly inside a `useEffect` body.
- **Why**: Causes cascading renders and hurts performance.
- **Correct patterns**:
  - **Use `key` prop to reset state**: When a parent needs a child to reinitialize, change the `key` prop. React will destroy and remount the component with fresh state.
    ```jsx
    // Parent — changing key remounts the modal with fresh state
    <AddSessionModal key={`modal-${defaultDate}`} defaultDate={defaultDate} />
    ```
  - **Initialize state from props directly**: Use the `useState` initializer to read props at mount time.
    ```jsx
    const [formData, setFormData] = useState(() => ({
        type: availableTypes[0] || '',
        start_time: getDefaultStart(defaultDate),
    }));
    ```
  - **Derive state with `useMemo`**: For computed values that depend on props.
  - **Use event handlers**: Move state updates to onClick/onChange instead of effects.

- **Anti-patterns to avoid**:
  ```jsx
  // ❌ BAD: setState in useEffect to "sync" props
  useEffect(() => {
      setFormData(prev => ({ ...prev, type: props.type }));
  }, [props.type]);

  // ❌ BAD: Suppressing the rule with eslint-disable
  // eslint-disable-next-line react-hooks/set-state-in-effect
  setFormData(prev => ({ ...prev, type: props.type }));
  ```

### `react-hooks/refs`
- **Rule**: Do NOT read or write `ref.current` during render.
- **Why**: Refs are not tracked by React's render cycle; reading them during render causes stale/inconsistent UI.
- **Correct patterns**:
  - Access refs only in `useEffect`, event handlers, or callbacks
  - For one-time initialization, use `if (ref.current == null) { ref.current = ... }`

### `no-unused-vars`
- **Rule**: All variables and imports must be used.
- **Pattern**: Allowed unused vars must match `/^[A-Z_]/u` (uppercase or underscore prefix).
- **Fix**: Remove unused imports. If keeping for future use, prefix with `_`.

## Suppression Rules

- **Avoid suppressing lint rules.** Fix the root cause instead.
- If suppression is truly unavoidable (e.g., interfacing with a third-party library):
  - **Never suppress globally** in `.eslintrc` — always suppress per-line
  - **Always include justification**: `// eslint-disable-next-line <rule> -- <reason>`
  - **Valid reasons**: "Third-party library callback requires this pattern"
  - **Invalid reasons**: "TODO fix later", "Not important", "It works fine"

## Common Patterns

### Resetting Modal/Form State from Props
```jsx
// ✅ Correct — use key prop in parent to remount with fresh state
<MyModal key={`${isOpen}-${contextId}`} contextId={contextId} isOpen={isOpen} />

// Inside MyModal — just use useState initializer, no effects needed
const [data, setData] = useState(() => ({
    field: props.contextId,
}));
```

### Fetching Data in Effects
```jsx
// ✅ Correct — setState in an async callback, not directly in effect body
useEffect(() => {
    axios.get(url).then(res => {
        setData(res.data); // OK: this is in a callback, not the effect body
    });
}, [url]);
```
