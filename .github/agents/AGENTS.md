# AGENTS.md
# Copilot agent instructions for this repository
# Read this file before starting any task.

---

## Stack

- **Language**: TypeScript (strict mode enabled)
- **Runtime**: Node.js 20
- **Testing**: Playwright (E2E and component), with `@playwright/test` runner
- **Linting**: ESLint + Prettier
- **Package manager**: npm
- **Issue tracking**: GitHub Issues

---

## Commands

Always run these from the repo root.

| Purpose | Command |
|---|---|
| Install dependencies | `npm ci` |
| Build | `npm run build` |
| Type check | `npm run typecheck` |
| Lint | `npm run lint` |
| Lint + autofix | `npm run lint:fix` |
| Format | `npm run format` |
| Run all tests | `npm run test` |
| Run Playwright tests | `npx playwright test` |
| Run single test file | `npx playwright test <path>` |
| Show Playwright report | `npx playwright show-report` |

**Always run `lint` and `typecheck` before pushing commits.** Fix all errors — do not suppress them with `// eslint-disable` or `@ts-ignore` unless there is a comment explaining why.

---

## Branch naming

```
copilot/<github-issue-number>-<short-slug>
```

Examples:
- `copilot/142-add-signup-validation`
- `copilot/208-fix-checkout-timeout`

---

## Commit message format

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short description>

[optional body]

Refs: <JIRA-TICKET-ID>
```

Types: `feat`, `fix`, `test`, `refactor`, `chore`, `docs`

Examples:
- `feat(auth): add email format validation on signup`
- `test(checkout): add E2E for payment timeout edge case`
- `fix(api): return 422 instead of 500 on invalid input`

Include `Closes #<issue-number>` in the commit body to auto-close the GitHub Issue on merge.

---

## TypeScript rules

- Strict mode is on — do not disable it
- No use of `any` — use `unknown` and narrow with type guards
- All exported functions and classes must have JSDoc comments
- Prefer `interface` over `type` for object shapes
- Use `const` assertions where appropriate
- All async functions must handle errors — no unhandled promise rejections

---

## Playwright testing rules

### Structure
- All tests live in `/tests/e2e/`
- Page Object Models live in `/tests/pages/`
- Fixtures live in `/tests/fixtures/`
- Shared helpers live in `/tests/helpers/`

### Writing tests
- Every new feature or bug fix needs a corresponding Playwright test
- Use Page Object Model pattern — do not write raw `page.locator()` calls inline in test files
- Use `data-testid` attributes for selectors — never CSS classes or text content
- Test the full user journey, not just the happy path
- Every test must include at least one unhappy path / error state scenario
- Tests must be independent — no shared state between tests, use `beforeEach` to reset

### Test plan first
**Before writing any test code**, post a test plan as a PR comment in this format:

```markdown
## 🧪 Test Plan (awaiting approval)

**GitHub issue**: #<issue-number>
**PR**: #<number>

### E2E tests
- [ ] <scenario>: given <precondition>, when <action>, then <expected result>

### Error / edge cases
- [ ] <scenario>: given <precondition>, when <action>, then <expected result>

### Out of scope
- <reason>

---
Reply **"approved"** to proceed, or comment with requested changes.
```

**Do not write any test code until the plan receives an "approved" reply from a human reviewer.**

### Assertions
- Prefer `expect(locator).toBeVisible()` over checking DOM directly
- Use `expect(page).toHaveURL()` for navigation assertions
- Always assert on meaningful user-facing outcomes, not implementation details

### Timeouts and waiting
- Never use `page.waitForTimeout()` — use proper `await expect()` assertions which auto-wait
- If a test is flaky, fix the root cause — do not increase timeouts as a workaround

---

## File structure rules

```
src/           # Application source
tests/
  e2e/         # Playwright test files (*.spec.ts)
  pages/       # Page Object Models
  fixtures/    # Test fixtures and setup
  helpers/     # Shared test utilities
.github/
  workflows/   # GitHub Actions — do not modify without a comment explaining why
```

- Do not create files outside these directories without explaining why in the PR description
- Do not modify files in `/generated/` — these are auto-generated and will be overwritten
- Do not modify `.env.example` — changes to env vars need a separate discussion

---

## Dependencies

- Do not install new npm packages without a comment in the PR description explaining:
  1. Why the existing codebase can't solve this
  2. Why this specific package was chosen
  3. Whether it's a `dependency` or `devDependency`
- Prefer packages that are already in `package.json` before reaching for new ones

---

## What NOT to do

- ❌ Do not write tests that mock everything — test real behavior against the running app
- ❌ Do not write tests that only cover the happy path
- ❌ Do not push if `typecheck` or `lint` fails
- ❌ Do not write test code before the test plan is approved
- ❌ Do not use `page.waitForTimeout()` — ever
- ❌ Do not change the Playwright config (`playwright.config.ts`) without a PR comment explaining why
- ❌ Do not approve or merge your own PRs — human review is required
- ❌ Do not access secrets or API keys — use environment variables only, reference `.env.example`

---

## PR description template

When opening a pull request, use this format:

```markdown
## Summary
<!-- What does this PR do? One paragraph. -->

## GitHub issue
Closes #<issue-number>

## Changes
<!-- Bullet list of what changed and why -->

## Test plan approved
<!-- Link to the PR comment where the test plan was approved -->

## Checklist
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npx playwright test` passes
- [ ] Test plan was approved before tests were written
- [ ] No new dependencies added without explanation
```

---

## GitHub Issues integration

- The GitHub Issue number must appear in the branch name (`copilot/<number>-slug`) and PR description
- When opening a PR, link it to the issue using `Closes #<number>` so it auto-closes on merge
- If any acceptance criterion from the issue is not addressed, note it in the PR description under a "Missing coverage" section

---

## Security

- Never log sensitive data (passwords, tokens, PII) — not even in debug statements
- Never hardcode credentials — use `process.env` only
- All user input must be validated and sanitised before use
- API endpoints must validate request shape before processing
