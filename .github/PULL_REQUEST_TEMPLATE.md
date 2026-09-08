## Summary

<!-- What does this PR change, and why? -->

## Related issue

<!-- Closes #... (if applicable) -->

## Test plan

- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] `npm test` passes (coverage stays ≥ 80%, ≥ 95% for `src/lib/classify/`)
- [ ] `npm run build` succeeds
- [ ] Manually tested the affected flow (describe below)

<!-- Describe manual testing, if any -->

## Security checklist

- [ ] No secrets, tokens, or personal mailbox data added to the diff
- [ ] No new code path treats email body/header content as instructions (see README "Security Principles")
- [ ] Any new external request goes through the SSRF guard (`src/lib/unsubscribe/ssrf-guard.ts`) if it fetches a user-supplied URL
