---
name: readme-updater
description: Keeps README and setup documentation in sync after features, dependencies, or setup steps change. Use after a task adds a new dependency, environment variable, script, or setup step, or when the user asks to update docs, onboarding instructions, or the README.
---

# README Updater

Keep documentation accurate to what the project actually requires right now. Stale setup instructions cost more time than no instructions.

## What triggers an update

- A new environment variable was added and is required for the app to run
- A new dependency or tool was introduced (database, package manager, CLI tool)
- A setup or install step changed (new migration command, new build step)
- A new script was added to `package.json` or equivalent that a contributor would need to know about
- A feature was added that changes what the project does, if the README describes features

## Workflow

1. **Read the current README first.** Don't rewrite sections that are still accurate.
2. **Identify what's now wrong or missing**, based on the actual change made, not a full audit unless asked.
3. **Update only the affected sections**: usually Setup/Installation, Environment Variables, Scripts, or Features.
4. **Match existing tone and structure.** Don't restructure the whole document unless asked.
5. **Verify commands actually work** before writing them into the doc. Don't document a setup step you haven't confirmed runs cleanly.

## Sections to check, if present

- **Prerequisites**: Node/Python/language version, required accounts (Supabase, Vercel, etc.)
- **Installation**: clone, install, first-run steps
- **Environment variables**: table of var name, purpose, required/optional
- **Scripts**: what each `npm run` or equivalent command does
- **Deployment**: how the project ships, what platform, what's needed

## Output format

Show a diff-style summary of what changed:

```
Added to Environment Variables:
- SUPABASE_SERVICE_ROLE_KEY: server-only, used for admin queries

Updated Installation step 3:
- old: npm install
- new: npm install && npm run db:migrate
```

Then apply the full updated README.

## What not to do

- Don't invent a features list or badge section the project didn't ask for.
- Don't remove existing content that's still accurate just to shorten the file.
- Don't document internal implementation details that belong in code comments, not a README.
