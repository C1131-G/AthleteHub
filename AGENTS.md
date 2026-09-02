<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Which skill to load

Load the skill before writing the code, not after. Two or more rows can apply at once. Load all matching rows. Every skill named here is installed — verify with `ls ~/.claude/skills` before adding a row, and do not reference a skill that does not resolve.

| When | Load |
| --- | --- |
| Any code change, in any language | `enforce-code-quality` |
| Editing a `.ts` or `.tsx` file | `enforce-typescript-strict` |
| Parsing, validating, or narrowing untrusted data | `type-safety-validation` |
| Choosing feature folders or reviewing React structure | `design-frontend-architecture` |
| Any Next.js App Router page, layout, cache, or server/client boundary | `nextjs-react-typescript` |
| About to write or edit a `useEffect` | `audit-react-effects` |
| An interaction has pending, loading, or transition behavior | `apply-react-async-ui` |
| Adding or moving a Suspense boundary | `apply-react-suspense` |
| A route or view transition, or `ViewTransition` | `apply-react-transitions` |
| A mutation that should feel instant | `apply-react-optimistic` |
| Showing the user a message about something that happened | `apply-toasts` |
| Route transitions, gestures, tap feedback, safe areas, or mobile viewport | `apply-native-feel-nav` |
| A Next.js layout shell, sidebar, private session chrome, or streaming boundary | `apply-next-shell-nav` |
| Writing a unit test | `vitest` |
| Auditing existing code against the installed skills | `audit-with-skills` |
| A broad quality pass over a feature | `impeccable` |
| Onboarding a repository, or this table needs updating | `setup-agent-rules` |
| Reading or reviewing a research paper | `read-research-paper` |

There is no installed accessibility skill. Accessibility is enforced here by the `@axe-core/playwright` scans in `e2e/` — add a scan when you add a route, and keep `bun run test:instant` at zero violations.

### TanStack skills ship inside `node_modules`

These installed packages carry their own agent skills (the `tanstack-intent` keyword in their `package.json` marks them). Read the relevant skill from disk before writing TanStack code — it describes the installed version, which the public examples often do not:

| Package                 | Skills                                       |
| ----------------------- | -------------------------------------------- |
| `@tanstack/react-table` | `node_modules/@tanstack/react-table/skills/` |
| `@tanstack/table-core`  | `node_modules/@tanstack/table-core/skills/`  |
| `@tanstack/charts`      | `node_modules/@tanstack/charts/skills/`      |

`use-tanstack-table`, `use-tanstack-query`, `use-tanstack-router`, and `use-tanstack-form` are installed as leaf skills; load the matching one alongside the package's own skills.

This repo is on Table **v9**, whose API differs from the v8 examples that most documentation and the shadcn data-table recipe still show: `useTable` not `useReactTable`, a `features` option not row-model options, `table.state` not `getState()`, and `<table.FlexRender />` not a bare `flexRender` call. Charts follow `@tanstack/charts` v0.16: `defineChart` definitions must be memoized, and marks need a stable `key`.

# Ultracite Code Standards

This project uses **Ultracite**, a zero-config preset that enforces strict code quality standards through automated formatting and linting.

## Quick Reference

- **Format code**: `bun x ultracite fix`
- **Check for issues**: `bun x ultracite check`
- **Diagnose setup**: `bun x ultracite doctor`

Oxlint + Oxfmt (the underlying engine) provides robust linting and formatting. Most issues are automatically fixable.

---

## Core Principles

Write code that is **accessible, performant, type-safe, and maintainable**. Focus on clarity and explicit intent over brevity.

### Type Safety & Explicitness

- Use explicit types for function parameters and return values when they enhance clarity
- Prefer `unknown` over `any` when the type is genuinely unknown
- Use const assertions (`as const`) for immutable values and literal types
- Leverage TypeScript's type narrowing instead of type assertions
- Use meaningful variable names instead of magic numbers - extract constants with descriptive names

### Modern JavaScript/TypeScript

- Use arrow functions for callbacks and short functions
- Prefer `for...of` loops over `.forEach()` and indexed `for` loops
- Use optional chaining (`?.`) and nullish coalescing (`??`) for safer property access
- Prefer template literals over string concatenation
- Use destructuring for object and array assignments
- Use `const` by default, `let` only when reassignment is needed, never `var`

### Async & Promises

- Always `await` promises in async functions - don't forget to use the return value
- Use `async/await` syntax instead of promise chains for better readability
- Handle errors appropriately in async code with try-catch blocks
- Don't use async functions as Promise executors

### React & JSX

- Use function components over class components
- Call hooks at the top level only, never conditionally
- Specify all dependencies in hook dependency arrays correctly
- Use the `key` prop for elements in iterables (prefer unique IDs over array indices)
- Nest children between opening and closing tags instead of passing as props
- Don't define components inside other components
- Use semantic HTML and ARIA attributes for accessibility:
  - Provide meaningful alt text for images
  - Use proper heading hierarchy
  - Add labels for form inputs
  - Include keyboard event handlers alongside mouse events
  - Use semantic elements (`<button>`, `<nav>`, etc.) instead of divs with roles

### Error Handling & Debugging

- Remove `console.log`, `debugger`, and `alert` statements from production code
- Throw `Error` objects with descriptive messages, not strings or other values
- Use `try-catch` blocks meaningfully - don't catch errors just to rethrow them
- Prefer early returns over nested conditionals for error cases

### Code Organization

- Keep functions focused and under reasonable cognitive complexity limits
- Extract complex conditions into well-named boolean variables
- Use early returns to reduce nesting
- Prefer simple conditionals over nested ternary operators
- Group related code together and separate concerns

### Security

- Add `rel="noopener"` when using `target="_blank"` on links
- Avoid `dangerouslySetInnerHTML` unless absolutely necessary
- Don't use `eval()` or assign directly to `document.cookie`
- Validate and sanitize user input

### Performance

- Avoid spread syntax in accumulators within loops
- Use top-level regex literals instead of creating them in loops
- Prefer specific imports over namespace imports
- Avoid barrel files (index files that re-export everything)
- Use proper image components (e.g., Next.js `<Image>`) over `<img>` tags

### Framework-Specific Guidance

**Next.js:**

- Use Next.js `<Image>` component for images
- Use `next/head` or App Router metadata API for head elements
- Use Server Components for async data fetching instead of async Client Components

**React 19+:**

- Use ref as a prop instead of `React.forwardRef`

**Solid/Svelte/Vue/Qwik:**

- Use `class` and `for` attributes (not `className` or `htmlFor`)

---

## Testing

- Write assertions inside `it()` or `test()` blocks
- Avoid done callbacks in async tests - use async/await instead
- Don't use `.only` or `.skip` in committed code
- Keep test suites reasonably flat - avoid excessive `describe` nesting

## When Oxlint + Oxfmt Can't Help

Oxlint + Oxfmt's linter will catch most issues automatically. Focus your attention on:

1. **Business logic correctness** - Oxlint + Oxfmt can't validate your algorithms
2. **Meaningful naming** - Use descriptive names for functions, variables, and types
3. **Architecture decisions** - Component structure, data flow, and API design
4. **Edge cases** - Handle boundary conditions and error states
5. **User experience** - Accessibility, performance, and usability considerations
6. **Documentation** - Add comments for complex logic, but prefer self-documenting code

---

Most formatting and common issues are automatically fixed by Oxlint + Oxfmt. Run `bun x ultracite fix` before committing to ensure compliance.

## Verification

Run the project scripts for the affected change:

- `bun run check`
- `bun run typecheck`
- `bun run build`
- `bun run standalone` for Electron packaging changes

Official shadcn-generated files live under `components/ui`. Review them against the project rules after generation. Do not silently ignore new violations. If generated code conflicts with Ultracite, fix the affected code or record the exact exception in the final report.
