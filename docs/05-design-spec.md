## 5. Design Spec

One entry per PRD feature ID still needing UI polish or a spec review.
Format: feature ID, current component, open design question.

- 5.3 BRI: `BurnoutRiskIndex.tsx`, `BRIExplainerCard.tsx`. Open question:
  once Phase 8 changes how BRI is computed, does the heatmap visualization
  change, or only the data source behind it? Keep the visual spec stable
  and treat this as a data-layer change only, unless product says otherwise.
- 5.6 Right-to-Disconnect Outbox: `RightToDisconnectOutbox.tsx`. Confirm the
  override-with-confirmation friction step reads as a genuine pause, not a
  single extra click that trains employees to click through it.
- 5.7 Calendar Guard: `CalendarGuard.tsx`, `MeetingTimeline.tsx`. Confirm the
  three compliant alternative times are ranked (soonest reasonable first),
  not just listed in whatever order the query returns.
- 5.9 Support Circles: `SupportCircles.tsx`. Confirm the anonymous-post path
  is visually distinct enough from the named-post path that a user cannot
  post anonymously by mistake.
- 5.13 Structural Load Diagnostics: `ManagerDashboard.tsx`. Redesign the
  "Simulate Submissions" control out of the production build; it is a dev
  affordance that should not ship to managers.
- 5.19 Kill Switch: `AdminConsole.tsx`. Confirm the "visible banner while
  active" requirement (Section 5.19) renders for every role, not only
  admins, since employees need to know check-ins are paused.
