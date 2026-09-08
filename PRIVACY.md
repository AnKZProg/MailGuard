# Privacy & Terms of Use

MailGuard is a local, self-hosted application. There is no MailGuard server, no MailGuard account, and no telemetry — this document describes what the code actually does, not a generic boilerplate policy.

## What MailGuard accesses

Connecting a Gmail or Outlook account grants MailGuard delegated access to that account via the provider's official OAuth API (you can revoke this at any time from your Google/Microsoft account security settings). MailGuard reads **headers and metadata** — sender, subject, date, SPF/DKIM/DMARC results, attachment presence — to classify mail, organize it, and audit the account for suspicious forwarding rules.

## What MailGuard never does

- **Email bodies are never read for classification.** The classifier scores mail using structured signals only (headers, sender domain, known patterns) — never message content. This is a deliberate anti-prompt-injection boundary, not just a privacy choice: a malicious email cannot manipulate its own classification.
- **Nothing is sent to a third party.** No telemetry, no analytics, no network calls beyond the official Google/Microsoft APIs you configure yourself with your own OAuth app credentials.
- **Quarantine never permanently deletes.** Mail classified as spam/phishing moves to your provider's own Trash — recoverable normally, never force-deleted by the automation.

## Where your data lives

Everything stays in a local SQLite database (`data/mailguard.db`) on the machine you run MailGuard on. OAuth tokens are encrypted at rest with AES-256-GCM, using a key **only you** hold (generated locally, never transmitted). Losing that key means reconnecting your accounts — it cannot be recovered by anyone else, including the project's maintainers.

## Your responsibilities

- Keep your encryption key and `.env.local` file secure — they protect your account access tokens.
- Create and manage your own OAuth credentials (Google Cloud Console / Azure) — MailGuard doesn't provide or proxy any.
- Review the classifier's decisions, especially early on — it can be wrong. Shadow/observation mode exists specifically for this: it skips auto-quarantine so you can review verdicts before trusting the automation.

## License and warranty

MailGuard is distributed under the MIT License, **with no warranty of any kind**. The software is provided as-is; using it against your own mail accounts is entirely your own responsibility. See [LICENSE](LICENSE) for the full text.
