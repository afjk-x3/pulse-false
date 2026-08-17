---
name: migration-reviewer
description: Reviews database schema changes and smart contract state changes for backward compatibility and safe rollout. Use when the user writes a database migration, changes a Supabase table schema, modifies Soroban contract storage, or asks to review a schema change before applying it.
---

# Migration Reviewer

Schema and state changes are hard to undo once live data depends on them. Review before applying, not after.

## Checklist

**Backward compatibility**
- Does this migration break code that hasn't been deployed yet, or old client versions still in use?
- Are columns being dropped or renamed that existing code still reads or writes?
- If a column is removed, is there a deprecation step first (stop writing to it, confirm nothing reads it, then drop it) rather than dropping it immediately?

**Data safety**
- Does this migration risk data loss (dropping a column with data, changing a type in a way that truncates or nulls values)?
- Is there a backup or rollback plan if the migration fails partway through?
- For large tables, will this migration lock the table and cause downtime? Note if an online/non-blocking migration approach is needed instead.

**Defaults and nullability**
- New required (NOT NULL) columns need a default value or backfill step for existing rows, or the migration will fail on a non-empty table.
- Check that new foreign keys reference valid existing data, not rows that would violate the constraint.

**Environment verification**
- Confirm which environment this runs against before applying: local, staging/test, or production. Never assume.
- For Supabase or similar hosted databases, confirm the migration was tested against a non-production database first.

**Smart contract state (Soroban/Stellar specific)**
- Contract storage changes are effectively permanent once deployed; check whether this needs a new contract version instead of an in-place change.
- Confirm any state migration logic actually runs before the old format is read, to avoid deserialization failures.
- Check gas/fee cost implications of new storage patterns before deploying to mainnet.

## Output format

```
Backward compatible: yes/no [explain any breaking change]
Data loss risk: none / [describe what's at risk]
Requires backfill: yes/no [what for]
Locking/downtime risk: none / [describe]
Environment confirmed: [local/staging/production — ask if unclear]
Rollback plan: [described / needed and missing]
```

## What not to do

- Don't apply a migration directly to production as part of a review. Flag it for the user to run themselves, or confirm explicitly first.
- Don't approve a schema change that drops data without an explicit confirmation that the data is no longer needed.
