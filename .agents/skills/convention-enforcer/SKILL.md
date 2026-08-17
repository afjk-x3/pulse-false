---
name: convention-enforcer
description: Encodes project naming, folder structure, and formatting rules so every task follows the same pattern instead of drifting per session. Use at the start of any new file, component, or module creation, and when reviewing whether new code matches the rest of the codebase.
---

# Convention Enforcer

Agents default to generic patterns unless told otherwise. This skill holds the project's actual conventions so output stays consistent across sessions.

## Setup

Before this skill can enforce anything, the conventions need to be defined once. If they aren't documented yet, derive them by inspecting the existing codebase:

- **Naming**: file names (kebab-case, PascalCase, camelCase?), variable/function naming, component naming
- **Folder structure**: where do components, hooks, utils, API routes, types live?
- **Import style**: absolute vs relative imports, import ordering
- **Component patterns**: function components vs class, prop typing style, default exports vs named exports
- **State management**: what's used (Context, Zustand, Redux, server state library) and where new state should go
- **Styling**: Tailwind class ordering, CSS module usage, or whatever the project uses
- **Error handling**: how errors are caught, logged, and surfaced to the user across the app
- **Comments**: what level of commenting the codebase actually uses, so new code doesn't over- or under-comment relative to the rest

Write these down once, in a project-specific reference the agent can check each time, rather than re-deriving them from scratch every session.

## Workflow

1. Before writing a new file, check it against the recorded conventions above.
2. If a convention isn't documented and the codebase has no existing example, ask the user rather than picking an arbitrary default.
3. After writing code, do a pass checking naming, placement, and style against the conventions before presenting it.

## Output format

When flagging a mismatch:

```
Convention violated: [what rule]
Found: [what the new code does]
Expected: [what the rest of the codebase does, with an example file:line]
```

## What not to do

- Don't impose a "best practice" that contradicts what the project already consistently does. Consistency with the existing codebase outranks external style opinions.
- Don't flag a convention as violated based on a single existing example if the codebase is genuinely inconsistent. Note the inconsistency instead and ask which pattern to standardize on.
