---
name: deploy-checklist
description: Pre-deploy checklist covering environment variables, build status, and migrations, tailored to Vercel-style deploys. Use before the user deploys, pushes to production, or says "ready to ship" or "deploying now".
---

# Deploy Checklist

Run through this before any production deploy. Catching a problem here is cheap. Catching it after users hit it is not.

## Checklist

**Build**
- Run the production build command locally (`npm run build` or equivalent). Confirm it completes with no errors.
- Check for new build warnings that weren't present before this change.

**Environment variables**
- List every env var the app now requires. Confirm each is set in the deploy platform for both preview and production environments, not just locally.
- Confirm client-exposed vars (`NEXT_PUBLIC_` or equivalent) contain nothing sensitive.
- If a var's value differs between preview and production (test vs live API keys), confirm the right value is set in each.

**Database and migrations**
- Confirm any pending migrations have been applied to the production database, or are set to run automatically on deploy.
- Confirm the migration was already tested against staging or a non-production copy.

**Dependencies**
- Confirm `package.json` / lockfile are committed and in sync, so the deploy installs the same versions used in development.

**Tests**
- Run the test suite. Don't deploy on a known-failing test unless the user explicitly accepts that risk.

**Rollback plan**
- Confirm there's a way to roll back (previous deployment still available, migration is reversible) if the new deploy has a critical issue.

**Post-deploy**
- After deploy, actually load the live URL and check the core flow works, don't just trust a green build status.
- Check browser console and server logs for errors that only show up in the production environment.

## Output format

```
Build: pass/fail
Env vars: [confirmed set for preview + production / missing: list]
Migrations: [applied / pending / none needed]
Tests: [pass count / fail count]
Rollback available: yes/no
Post-deploy check: [done, result / not yet done]
```

## What not to do

- Don't mark deploy-ready based on local success alone. Preview and production environments can differ.
- Don't skip the post-deploy live check because the build passed. A passing build doesn't guarantee a working env var setup.
