# Pulse: AxionHR Well-Being Guardian

An enterprise employee well-being dashboard and boundary-protection platform designed with **privacy-first architecture**. Pulse monitors workplace wellness, burnout risk, and boundary balance while guaranteeing mathematical anonymity, explicit consent workflows, and verifiable employee data sovereignty.

---

## The 6 Core Pillars & Feature Mapping

Every feature and component in Pulse is directly mapped to one of the **6 Core Pillars** of employee well-being:

### 1. Pillar 1: Predictive Analytics
> **Mission**: Catching burnout indicators before they lead to turnover.

| Feature Component | Route / Location | Description & Architecture |
| :--- | :--- | :--- |
| **Burnout Risk Index (BRI)** | `app/components/BurnoutRiskIndex.tsx`<br>`/` (Dashboard) | 7-day localized risk scoring tracking workload, meeting density, and communication patterns with interactive heatmaps. |
| **GBDT Factor Attribution** | `app/components/BRIExplainerCard.tsx`<br>`app/components/BRIExplanationFeed.tsx` | Explainable AI breakdown identifying specific drivers behind burnout shifts (e.g., meeting overload, after-hours chatter). |
| **Manager Telemetry Dashboard** | `app/components/ManagerDashboard.tsx`<br>`/manager` | Org-level aggregate wellness trends strictly protected by mathematical $k$-anonymity floors ($k \ge 5$) to prevent individual de-anonymization. |

---

### 2. Pillar 2: Physical Health
> **Mission**: Using intelligent, non-disruptive nudges to encourage ergonomic habits.

| Feature Component | Route / Location | Description & Architecture |
| :--- | :--- | :--- |
| **Micro-Coaching & Ergonomic Nudges** | `app/components/MicroCoachingNudge.tsx`<br>`/` (Dashboard) | Intelligent, non-intrusive prompts encouraging posture checks, hydration, screen rest, and gentle desk stretches. |
| **Calendar Guard & Fatigue Alerts** | `app/components/CalendarGuard.tsx`<br>`app/components/MeetingTimeline.tsx` | Analyzes calendar load, flags back-to-back meeting fatigue, and recommends restorative buffer blocks. |
| **Wind-Down Transition Routine** | `app/components/WindDownRoutine.tsx`<br>`/` (Dashboard modal) | Guided end-of-shift reflection and physical workstation disconnection flow. |

---

### 3. Pillar 3: Mental Well-being
> **Mission**: Designing continuous, low-friction sentiment trackers to gauge true team morale.

| Feature Component | Route / Location | Description & Architecture |
| :--- | :--- | :--- |
| **Sentiment & Mood Check-In** | `app/components/SentimentWidget.tsx`<br>`/` (Dashboard) | 1-click low-friction daily emotional pulse logging with categorized mood selectors. |
| **Sentiment Trendlines** | `app/components/SentimentTrendLine.tsx`<br>`/` (Dashboard) | Longitudinal mood visualization to help employees track their personal emotional trajectory over time. |
| **Confidential EAP Referral Gateway** | `app/page.tsx`<br>`app/components/AdminConsole.tsx` | Direct, private link to enterprise Employee Assistance Programs with zero manager visibility. |

---

### 4. Pillar 4: Work-Life Boundaries
> **Mission**: Programmatically enforcing the "right to disconnect" in an always-on culture.

| Feature Component | Route / Location | Description & Architecture |
| :--- | :--- | :--- |
| **Right-to-Disconnect Outbox** | `app/components/RightToDisconnectOutbox.tsx`<br>`/` & `/inbox` | Secure message lockbox holding outgoing messages sent outside working hours until the recipient's shift begins. |
| **Boundary-Aware Direct Chat** | `app/inbox/page.tsx`<br>`/inbox` | Real-time chat with automated off-duty boundary interception that redirects messages to the outbox when colleagues are off the clock. |
| **Enterprise Schedule Governance** | `app/components/AdminConsole.tsx`<br>`/admin` | System-wide standard working hours, timezone synchronization, and company holiday management. |

---

### 5. Pillar 5: Social Connectivity
> **Mission**: Fostering decentralized, peer-to-peer support and recognition networks.

| Feature Component | Route / Location | Description & Architecture |
| :--- | :--- | :--- |
| **Kudos Recognition Wall** | `app/components/KudosFeed.tsx`<br>`/kudos` | Peer-to-peer recognition feed for public praise, tagged with core corporate values. |
| **Support Circles** | `app/components/SupportCircles.tsx`<br>`/support` | Safe, anonymous peer support communities for employees dealing with stress or shared workplace challenges. |
| **Coffee Roulette** | `app/components/CoffeeRoulette.tsx`<br>`/coffee` | Automated cross-department 1-on-1 social pairings to build informal connections and reduce isolation. |

---

### 6. Pillar 6: Cognitive Inclusivity
> **Mission**: Creating adaptive, focus-driven interfaces for neurodivergent employees.

| Feature Component | Route / Location | Description & Architecture |
| :--- | :--- | :--- |
| **OpenDyslexic Typography** | `app/context/AccessibilityContext.tsx`<br>`app/components/HeaderAccessibilityPanel.tsx` | Specialized dyslexia-friendly typeface switchable across all screens with a single click. |
| **Interactive Reading Ruler** | `app/components/ReadingRulerOverlay.tsx` | Draggable reading guide overlay that dims background clutter to assist reading focus and visual tracking. |
| **Dynamic Font Scaling** | `app/context/AccessibilityContext.tsx` | Granular typography scaling (90% to 125%) without breaking responsive layouts. |
| **High-Contrast Theme & Focus Dimming** | `app/globals.css`<br>`app/components/HeaderAccessibilityPanel.tsx` | High-contrast black/white contrast mode and contextual card-focus dimming to eliminate sensory overload. |

---

## Foundational Privacy & Security Infrastructure

Underpinning all six pillars is an enterprise-grade privacy architecture:

- **Two-Plane Privacy Architecture**: Private individual telemetry (private plane) is cryptographically isolated from organizational aggregates (org plane).
- **Privacy Center (`/privacy`)**: Full GDPR compliance with 1-click JSON data export, granular webcam/CV consent toggles, and automated account erasure with grace period (`pg_cron`).
- **Zero Server API Routes**: Direct PostgreSQL access via Supabase client strictly enforced by Row Level Security (RLS) policies.
- **Admin Console (`/admin`) & User Management (`/users`)**: Enterprise configuration, telemetry kill-switch, and RBAC user provisioning.

---

## Testing & Demo Accounts

| Role | Email | Password | Assigned Capabilities |
| :--- | :--- | :--- | :--- |
| **Employee** | `alex.rivera@axionhr.com` | `password123` | Personal Dashboard, Chat, Kudos, Support Circles, Privacy Center |
| **Manager / HR** | `derek.vance@axionhr.com` | `password123` | Manager Dashboard (k-Anonymity Protected), Team Metrics, Employee Tools |
| **Administrator** | `priya.sharma@axionhr.com` | `password123` | Admin Console, User Management, Global Privacy Controls, Audit Logs |

*Alternative demo accounts: `sam.employee@axionhr.com` (Employee), `jordan.manager@axionhr.com` (Manager).*

---

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
- **Frontend Core**: [React 19](https://react.dev/), [TypeScript 5](https://www.typescriptlang.org/) (Strict Mode)
- **Styling & UI**: [Tailwind CSS 4](https://tailwindcss.com/), [Radix UI](https://www.radix-ui.com/), [shadcn/ui](https://ui.shadcn.com/), [Lucide React](https://lucide.dev/)
- **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL, Row Level Security, Realtime, `pg_cron`)
- **Testing**: [Vitest](https://vitest.dev/), React Testing Library, [Playwright](https://playwright.dev/)

---

## Getting Started

### Prerequisites
- **Node.js**: v20.x or later
- **npm**: v10.x or later
- **Supabase**: Local Supabase instance or linked Supabase project

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Set your Supabase credentials in `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL="https://your-project-id.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key-here"
```

### 3. Database Migrations
Migrations in `supabase/migrations/` (001 through 008) manage tables, security policies, and automated purge jobs:
```bash
supabase db push
# or run migrations 001 - 008 sequentially against your database
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the Next.js development server with Turbopack |
| `npm run build` | Compiles the production build |
| `npm run start` | Runs the compiled production build |
| `npm run lint` | Runs ESLint analysis (0 errors policy) |
| `npx tsc --noEmit` | Runs the TypeScript compiler for strict type validation |
| `npm test` | Executes the Vitest unit and component test suite |
| `npm run test:watch` | Runs Vitest in interactive watch mode |
| `npm run test:e2e` | Executes Playwright end-to-end browser tests |
| `npm run test:e2e:ui` | Opens the Playwright test runner UI |

---

## Project Structure

```plaintext
pulse-false/
├── app/
│   ├── admin/             # Administrator console route (/admin)
│   ├── coffee/            # Coffee Roulette social connector route (/coffee)
│   ├── components/        # Feature components mapped to the 6 core pillars
│   │   ├── ui/            # Reusable primitive UI components (shadcn/radix)
│   │   ├── AdminConsole.tsx
│   │   ├── AppShell.tsx
│   │   ├── BRIExplainerCard.tsx
│   │   ├── BRIExplanationFeed.tsx
│   │   ├── BurnoutRiskIndex.tsx
│   │   ├── CalendarGuard.tsx
│   │   ├── CoffeeRoulette.tsx
│   │   ├── Header.tsx
│   │   ├── HeaderAccessibilityPanel.tsx
│   │   ├── KudosFeed.tsx
│   │   ├── LoginGate.tsx
│   │   ├── ManagerDashboard.tsx
│   │   ├── MeetingTimeline.tsx
│   │   ├── MicroCoachingNudge.tsx
│   │   ├── PrivacyCenter.tsx
│   │   ├── ReadingRulerOverlay.tsx
│   │   ├── RightToDisconnectOutbox.tsx
│   │   ├── SentimentTrendLine.tsx
│   │   ├── SentimentWidget.tsx
│   │   ├── SettingsView.tsx
│   │   ├── Sidebar.tsx
│   │   ├── SupportCircles.tsx
│   │   ├── UserManagement.tsx
│   │   └── WindDownRoutine.tsx
│   ├── context/           # AccessibilityContext (Pillar 6 engine)
│   ├── inbox/             # Direct messaging & boundary interception route (/inbox)
│   ├── kudos/             # Kudos recognition wall route (/kudos)
│   ├── lib/               # Supabase client and generated database types
│   ├── manager/           # Manager dashboard route (/manager)
│   ├── privacy/           # Privacy Center & data sovereignty route (/privacy)
│   ├── settings/          # User profile settings route (/settings)
│   ├── support/           # Support circles route (/support)
│   ├── users/             # User management route (/users)
│   ├── globals.css        # Tailwind CSS 4 theme tokens & design system
│   ├── layout.tsx         # Root app layout and provider wrapper
│   └── page.tsx           # Main personal well-being dashboard route (/)
├── docs/                  # Architecture, security, and design specifications
├── e2e/                   # Playwright end-to-end integration tests
├── supabase/
│   └── migrations/        # Numbered SQL migrations (001 - 008)
├── .env.example           # Template for environment configuration
├── package.json           # Dependencies and project scripts
├── tsconfig.json          # TypeScript strict configuration
└── README.md              # Project documentation
```

---

## Privacy & Architecture Conventions

- **Direct RLS Architecture**: No custom server API routes (`app/api/`). Client components communicate directly with PostgreSQL via `app/lib/supabaseClient.ts`, with access rules enforced at the database level through PostgreSQL Row Level Security (RLS).
- **Two-Plane Isolation**: Private individual signals (webcam, mood, individual BRI shifts) never cross into the aggregate organizational analytics plane without mathematical k-anonymity protection ($k \ge 5$).
- **Generated Database Types**: `app/lib/database.types.ts` is generated from the Supabase schema.
- **Strict Compliance**: K-anonymity floors, consent checks, and outbox delivery delays encode non-negotiable compliance guarantees.

---
