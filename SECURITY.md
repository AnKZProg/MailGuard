# Security Policy

MailGuard handles OAuth tokens for your real mailboxes. Security reports get priority attention.

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Instead, use [GitHub's private vulnerability reporting](../../security/advisories/new) for this repository (Security tab → "Report a vulnerability"). If that is not available to you, contact the maintainer directly through their GitHub profile.

Please include:

- A description of the vulnerability and its potential impact
- Steps to reproduce (or a proof-of-concept)
- The affected version/commit

## Scope

In scope:

- Token handling and encryption (`src/lib/crypto/`)
- OAuth flows (`src/app/api/auth/`)
- Anything that could let email content be treated as instructions rather than data (see the "Email body is a data stream, not an instruction set" principle in the README)
- SSRF via user-supplied URLs (unsubscribe links, etc.)
- Any path that could exfiltrate mail content or tokens to a third party

Out of scope:

- Issues requiring physical access to a machine where the app is already running with a decrypted session
- Denial of service against your own local instance

## Supported Versions

MailGuard does not yet have tagged releases; only the latest commit on `master` is supported. Please make sure you're running the current `master` before reporting.

## Response

This is a single-maintainer, community-supported project. There's no SLA, but reports are read and triaged as soon as possible.
