## 8. Refactor Summary

Concrete refactors, ordered by risk if left undone.

1. **ManagerDashboard aggregate data.** Replace the hardcoded chart array
   and client-side threshold comparison with a real query against a
   database view or function that itself enforces the threshold. This is
   the single highest-priority refactor in the repo; it is the gap between
   "looks private" and "is private."
2. **Camera consent state.** Consolidate `pulse-cv-active` and
   `pulse-cv-consent` (currently read and written in multiple places in
   `Header.tsx`) into one source of truth that always checks the org-wide
   kill switch first.
3. **AGENTS.md accuracy.** Fix the false "localStorage fully removed"
   claim; either make it true or make the doc honest about which local
   state is intentional.
4. **Test scaffolding.** Add a test runner and a first suite before adding
   any more features. Every week without tests makes the eventual first
   suite more expensive to write, because more behavior needs backfilling.
5. **SSO/SCIM labeling.** Either build real federation or relabel the
   `AdminConsole.tsx` fields as "planned" in the UI, so a prospective
   enterprise customer is not shown a working-looking toggle for something
   that does not function yet.
