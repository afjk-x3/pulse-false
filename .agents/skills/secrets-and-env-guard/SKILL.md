---
name: secrets-and-env-guard
description: Catches leaked secrets, hardcoded API keys, and environment variable misconfiguration before deploy. Use whenever the user adds environment variables, works with .env files, deploys to Vercel or similar platforms, or when new code touches API keys, tokens, or the NEXT_PUBLIC_ prefix convention.
---

# Secrets and Env Guard

Environment variable mistakes are a common source of leaked credentials and broken deploys. Check every relevant change against this list before it ships.

## Checklist

**Client/server boundary (Next.js and similar frameworks)**
- Anything using `NEXT_PUBLIC_` (or equivalent client-exposed prefix) is visible in the browser bundle. Confirm nothing sensitive (API secrets, private keys, service role tokens) uses that prefix.
- Server-only secrets (database connection strings, service role keys, signing secrets) must never be imported into a client component or a file that ships to the browser.
- If unsure whether a variable is client or server scoped, check where it's consumed, not just where it's declared.

**Hardcoded secrets**
- Scan the diff for anything that looks like a key, token, or password written directly in source, not read from an env var.
- Check config files, test files, and comments too. Secrets get hardcoded in "temporary" test code and forgotten.

**.env hygiene**
- `.env` (or `.env.local`) is in `.gitignore`. Confirm it hasn't been committed.
- `.env.example` exists with variable names but placeholder values, so the project is reproducible without exposing real secrets.

**Deploy platform config (Vercel, etc.)**
- Every env var the app needs is actually set in the deploy platform's dashboard, not just locally. A missing var often fails silently or falls back to `undefined` in production.
- Check that preview and production environments have the variables they each need. Values sometimes differ (test vs live API keys) and get mixed up.

**Rotation and scope**
- If a secret was ever committed to git history, flag that it needs rotation, not just removal from the current diff. Removing it from the latest commit doesn't remove it from history.
- Check that API keys use the minimum scope/permission needed, not a full-access key for a task that only needs read access.

## Output format

```
Client-exposed risk: [none found / list of vars incorrectly public]
Hardcoded secrets: [none found / file:line]
.gitignore: [.env covered / missing]
.env.example: [present and current / missing / stale]
Deploy platform: [confirm with user which vars are set — cannot verify from code alone]
Rotation needed: [none / list secrets that hit git history]
```

For deploy platform variables, this skill cannot see the Vercel/hosting dashboard directly. Always ask the user to confirm the variable list matches, rather than assuming.

## What not to do

- Don't print or repeat a secret's actual value back, even to point it out. Reference it by variable name and file:line only.
- Don't assume a `NEXT_PUBLIC_` prefix was a mistake without checking whether the value is actually meant to be public (e.g. a public API base URL is fine).
