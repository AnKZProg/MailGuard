# Contributing to MailGuard

Thanks for your interest in improving MailGuard! This guide walks you through development setup, testing, and submitting pull requests.

## Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/<your-org>/mailguard.git
   cd mailguard
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment:
   ```bash
   # Generate encryption key
   openssl rand -base64 32
   
   # Copy template and fill it in
   cp .env.example .env.local
   # Edit .env.local and paste the encryption key
   # Optionally add OAuth credentials for testing
   ```

4. Initialize database:
   ```bash
   npm run db:push
   ```

5. Start dev server:
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Code Style & Standards

This project follows ECC (Encoding Culture Codebook) standards:

- **Immutability first**: Use spread operators and `Object.assign()` to create new objects, never mutate in place.
- **Explicit types**: TypeScript types on all public APIs and exports; use `Zod` for input validation.
- **No `any`**: Use `unknown` for untrusted input and narrow safely.
- **Error handling**: Catch and handle errors explicitly; never silently fail.
- **No hardcoded secrets**: All secrets via environment variables only.
- **Clean code**: Functions under 50 lines; files under 800 lines; minimal nesting (≤4 levels).

## Running Tests

```bash
# Run all tests once
npm test

# Watch mode (re-run on changes)
npm run test:watch
```

**Coverage targets:**
- Classification engine (`src/lib/classify/`): ≥ 95%
- Overall project: ≥ 80%

Test coverage report is printed after each run.

## Linting & Type Checking

```bash
# Check for linting issues
npm run lint

# Type check (TypeScript)
tsc --noEmit
```

## Before Submitting a PR

1. **Run tests** — all tests must pass and coverage must meet targets.
   ```bash
   npm test
   ```

2. **Run linter** — fix any style issues.
   ```bash
   npm run lint
   ```

3. **Type check** — ensure no TypeScript errors.
   ```bash
   tsc --noEmit
   ```

4. **Test your changes manually** — especially if you're touching OAuth, classification, or sync logic.

5. **Write tests for new features** — use the test-driven development workflow:
   - Write a failing test first (RED)
   - Implement code to pass the test (GREEN)
   - Refactor while keeping tests green (IMPROVE)

## Making Changes

### Structure & Architecture

- **Pages** (`src/app/`) — Next.js pages and API routes
- **Components** (`src/components/`) — Reusable React UI components
- **Business logic** (`src/lib/`) — Classification, OAuth, sync, and database logic
- **Database** (`src/prisma/`) — Schema definition

### Key Files to Know

- `src/lib/classify/` — Classification engine using structured signals (highly tested, changes here are critical)
- `src/lib/providers/google/oauth.ts` — Google OAuth flow (PKCE)
- `src/lib/providers/microsoft/oauth.ts` — Microsoft OAuth flow (PKCE)
- `src/lib/crypto/token-cipher.ts` — Token encryption/decryption
- `src/lib/db.ts` — Prisma client
- `prisma/schema.prisma` — SQLite schema

### Classification Engine (High Priority)

The `src/lib/classify/` directory is the most security-sensitive part of MailGuard. If you modify anything here:

- Write and run tests (coverage must stay ≥ 95%)
- Document your signal logic with comments
- Never add email body analysis; use only headers and metadata
- Test with real email headers in your test cases

### OAuth & Token Handling

Token encryption and OAuth flow integrity are critical:

- Never log unencrypted tokens
- Always use PKCE for authorization code flow
- Test both Google and Microsoft flows if changing OAuth logic
- Verify redirect URI matches what's configured in the console

## Commit Messages

Use conventional commits:

```
feat: add newsletter unsubscribe button
fix: handle missing sender domain gracefully
test: increase classify coverage to 95%
docs: clarify encryption key setup
refactor: extract signal calculation logic
```

## Testing Your OAuth Changes

If you modify OAuth flows:

1. Create test credentials in Google Cloud Console and Azure
2. Update `.env.local` with test client IDs/secrets
3. Manually test the full auth flow in your browser
4. Verify tokens are encrypted in the database: `npm run db:studio` and inspect the `MailAccount` table

## Database Schema Changes

If you add or modify the Prisma schema:

1. Edit `prisma/schema.prisma`
2. Run `npm run db:push` to apply changes
3. Add a test that verifies the schema works as expected
4. Document the change in your PR description

## Performance Considerations

- Avoid N+1 queries — use Prisma relations or batch queries
- Keep message syncs fast; do not fetch email bodies unless absolutely necessary
- Lazy-load UI components where appropriate
- Test with larger mailboxes (1000+ messages) before shipping

## Security Checklist

Before submitting a PR that touches sensitive areas:

- [ ] No hardcoded secrets (API keys, tokens, passwords)
- [ ] All user input validated with Zod or similar
- [ ] SQL injection prevention (Prisma uses parameterized queries by default)
- [ ] No email body content used in classification
- [ ] Tokens encrypted before storage
- [ ] No debug logs that expose sensitive data
- [ ] HTTPS assumed for OAuth redirects (enforced via `APP_URL`)

### Known `npm audit` findings

A fresh `npm install` currently reports 4 HIGH-severity transitive advisories (`deepmerge-ts`, `mysql2`) pulled in via `@prisma/config` → `prisma`. These come from the Prisma **CLI** (used for `db:push`/`db:studio`), not `@prisma/client`, which is the only Prisma package the running app actually imports at runtime — and MailGuard only ever uses the SQLite driver adapter, never MySQL. Not reachable in the shipped app; don't spend time chasing these until Prisma ships a patched release upstream.

## Reporting Issues

### Bug Reports

- **Title**: Brief description of the issue
- **Environment**: OS, Node version, browser (if UI issue)
- **Steps to reproduce**: Exact steps to trigger the bug
- **Actual behavior**: What happened
- **Expected behavior**: What should have happened
- **Logs**: Any error messages from the console or server

### Feature Requests

- **Title**: What you want to build
- **Use case**: Why do you need this?
- **Alternatives**: Any workarounds you've tried
- **Design notes**: How should it work? (optional)

### Security Issues

**Do not open a public issue for security bugs.** Contact the maintainer directly with details.

## Questions?

- Check existing [Issues](https://github.com/<your-org>/mailguard/issues) and [Discussions](https://github.com/<your-org>/mailguard/discussions)
- Read the [README](README.md) and setup docs (`docs/setup-*.md`)
- Open a discussion if you're unsure about something

## What Happens After You Submit a PR

1. GitHub Actions runs linting, type check, and tests automatically
2. Maintainer reviews the code and tests
3. Any feedback will be posted as comments
4. Once approved, your PR is merged and deployed

Thanks for contributing! 🎉
