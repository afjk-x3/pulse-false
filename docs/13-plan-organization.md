## 13. Plan / Redo / Organization

### Where these documents live
Create a `/docs` folder in the repo root with one file per section above:

```
docs/
  01-project-audit.md
  02-implementation-plan.md
  03-tasks.md
  04-dev-guide.md
  05-design-spec.md
  06-homepage-design-plan.md
  07-security.md
  08-refactor-summary.md
  09-backend-security-rules.md
  10-frontend-ui-rules.md
  11-design-system.md
  12-quality-report.md
  13-plan-organization.md
```

### Update discipline
- `01-project-audit.md` and `12-quality-report.md` get a new dated entry at
  the top every time a phase closes. Do not overwrite history; append.
- `03-tasks.md` checkboxes move from unchecked to checked in the same PR
  that closes them, never batch-updated later from memory.
- `02-implementation-plan.md` phase status column updates only when the
  exit criteria for that phase (defined in Section 2 above) are fully met,
  not when work has merely started.
- Any document in `/docs` that contradicts the actual code (like the
  current `AGENTS.md` localStorage claim) gets corrected in the same PR
  that a contributor notices the contradiction, no exceptions.

### Redo priority order
If short on time, work `/docs` in this order: audit, implementation plan,
tasks, backend security rules, refactor summary. These five drive the
actual code changes. Design spec, design system, homepage plan, dev guide,
frontend UI rules, security, and quality report support the first five but
do not block them.
