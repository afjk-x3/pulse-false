---
name: changelog-generator
description: Converts completed tasks, merged diffs, or commit history into a changelog entry. Use when the user asks for a changelog, build log, release notes, or a summary of what changed for a hackathon submission, grading rubric, or project report.
---

# Changelog Generator

Turn completed work into a changelog entry a reader can scan in seconds. No filler.

## Workflow

1. Gather the source material: commit messages, merged tasks, structured-task-manager tickets, or a direct list from the user of what changed.
2. Group changes into categories:
   - Added (new features)
   - Changed (modified existing behavior)
   - Fixed (bug fixes)
   - Removed (deprecated or deleted functionality)
   - Security (vulnerability fixes, dependency updates for security reasons)
3. Write one line per change, user-facing language first, technical detail second if needed.
4. Order entries within each category by importance, not chronological order.
5. Date and version the entry if the project uses versioning; otherwise use a date heading.

## Template

```
## [version or date]

### Added
- [feature, one line, what the user can now do]

### Changed
- [behavior change, one line, old vs new if it matters]

### Fixed
- [bug, one line, what was broken and now works]

### Removed
- [what was taken out and why, if relevant]

### Security
- [vulnerability or dependency fix, one line]
```

## Rules for entries

- Write from the user's or reader's point of view: "Users can now export attendance logs as CSV," not "Added `exportCSV()` function to `utils.ts`."
- Skip internal-only changes (refactors with no behavior change, formatting, comment cleanup) unless the changelog is specifically a technical build log for a grader or reviewer who needs that detail.
- One line per entry. If a change needs more explanation, link to the ADR or ticket instead of expanding inline.
- Don't include unmerged or in-progress work.

## For hackathon or grading submissions

If the changelog is for a hackathon judge or grading rubric rather than end users, keep the technical build log format instead: include what was built, what stack was used, and what was verified working, matching the criteria the rubric asks for.

## What not to do

- Don't write marketing language ("revolutionary new feature") into a changelog. State what changed, plainly.
- Don't list every commit if commits don't map to meaningful user-facing changes. Squash into one entry per real change.
