## 6. Homepage Design Plan

Current `app/page.tsx` is 189 lines and functions as the authenticated
landing/dashboard shell rather than a marketing homepage. Two options:

**Option A — keep it as the app shell.** Most enterprise well-being tools
skip a marketing homepage; users land straight in the product after SSO.
If this is the intended pattern, rename the mental model from "homepage" to
"dashboard home" in docs and skip a separate marketing page entirely.

**Option B — add a real pre-login homepage.** If Pulse needs a public-facing
page (for sales, trust-building, or the "ethics charter" the PRD's risk
mitigation table calls for in Section XII), scope it as a new route,
separate from `app/page.tsx`, covering:
- A plain statement of the two-plane architecture (private vs.
  organizational), since PRD Section I frames this as the trust
  differentiator.
- A link to the ethics charter mentioned in Section XII.
- No product screenshots that reveal real employee data, even mock data
  that looks real enough to worry a prospective employee.

Ask the product owner which option applies before building either. Do not
guess; a wrong guess here means throwing away a full route.
