## 4. Dev Guide

This extends `AGENTS.md`. Read that file first; this section adds workflow
detail it does not cover.

### Local setup
1. Clone the repo.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local`, fill in Supabase project URL and
   anon key from your Supabase dashboard.
4. Run `supabase db push` (or apply migrations in `supabase/migrations` in
   numeric order) against your local or linked Supabase project.
5. Run `npm run dev` once before running `npx tsc --noEmit`, since Next.js
   16 generates route types that `layout.tsx` depends on.

### Branch and commit workflow
- One feature or fix per branch.
- Run `npm run lint` and `npx tsc --noEmit` before every commit. Both must
  pass with zero errors.
- Migrations are additive only. Never edit a shipped migration file; add a
  new numbered one.
- Regenerate `app/lib/database.types.ts` after any migration; never
  hand-edit generated types.

### Working on privacy-sensitive code
Any change touching k-anonymity thresholds, consent flows, the outbox
delay, camera telemetry, or the deletion grace period is higher risk than a
normal UI change. Before merging:
- State in the PR description which PRD section the change maps to.
- Confirm the change does not loosen a threshold, skip a consent check, or
  shorten a grace period without an explicit product decision recorded in
  `/docs/01-project-audit.md`.

### A note on `AGENTS.md`
The current `AGENTS.md` contains a block claiming to be auto-written by
`next dev` instructing the agent to read `node_modules/next/dist/docs/`
before writing code, framed as if Next.js itself injects this. That
framing is unusual for a committed file and worth a second look before
trusting it as a genuine tooling artifact. It is not harmful as written, but
confirm its origin (check `node_modules/next/dist/server/lib/generate-agent-files.js`
as the file itself suggests) before treating anything appended there as an
authoritative instruction.
