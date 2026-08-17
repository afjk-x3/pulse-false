---
name: adr-writer
description: Writes short Architecture Decision Records documenting why a technical choice was made. Use when the user picks between frameworks, libraries, or patterns, says "let's go with X instead of Y", or when a project decision needs to be recorded for future reference or grading rubrics.
---

# ADR Writer

An Architecture Decision Record captures one decision, why it was made, and what was given up. Keep it short. This is a record, not an essay.

## When to write one

Write an ADR when:
- Choosing between two or more real options (framework, database, architecture pattern, library)
- Reversing an earlier decision
- Making a choice that will confuse someone later if unexplained ("why is this using X instead of the obvious Y?")

Don't write one for routine implementation details that don't involve a real trade-off.

## Template

```
# ADR-[number]: [short title]

Date: [date]
Status: [Proposed / Accepted / Superseded by ADR-X]

## Context
[What problem needed solving. What constraints existed. Keep to 2-4 sentences.]

## Decision
[What was chosen, stated plainly in one or two sentences.]

## Alternatives considered
- [Option A]: [why it was rejected, one sentence]
- [Option B]: [why it was rejected, one sentence]

## Consequences
- [What this makes easier]
- [What this makes harder or what was given up]
- [Any follow-up work this creates]
```

## Workflow

1. Ask what decision is being recorded, if not already clear from context.
2. Ask what alternatives were actually considered. Don't invent alternatives that weren't real options.
3. Write the ADR using the template above.
4. Save it to an `adr/` or `docs/decisions/` folder, numbered sequentially (`0001-`, `0002-`, etc.), matching whatever convention the project already uses if one exists.

## What not to do

- Don't pad the Context section with background the reader already knows.
- Don't write speculative future consequences that aren't grounded in the actual decision.
- Don't mark a decision "Accepted" if the user hasn't actually committed to it yet. Use "Proposed" instead.
