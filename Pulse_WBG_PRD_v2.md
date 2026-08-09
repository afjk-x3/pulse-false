# Pulse: AxionHR Well-Being Guardian (WBG)
**Product Requirements Document (v2.0)**

---

## 1. Product Overview

**Pulse: AxionHR Well-Being Guardian (WBG)** is an enterprise-grade employee well-being ecosystem. Designed as a localized, highly secure Next.js (App Router) application, Pulse focuses on actively monitoring and improving employee mental health, reducing burnout risk, and enforcing healthy work-life boundaries. 

The system relies heavily on privacy-first architecture, local processing, and k-Anonymity constraints to ensure that individual employee telemetry remains strictly confidential while providing actionable aggregate data to managers and system administrators.

---

## 2. Technology Stack & Design System

### 2.1 Core Frameworks
* **Frontend:** Next.js (App Router), React, TypeScript.
* **Styling:** Tailwind CSS, shadcn/ui.
* **Icons:** Lucide React.
* **Database/State Management:** `PulseDB` wrapper over `localStorage` (representing a Supabase/PostgreSQL backend data contract).

### 2.2 UI/UX Aesthetics
* **Theme:** Soft, airy light theme (`#FAF9F6` background) with generous whitespace and "focus dimming" micro-interactions (blurring/dimming unfocused cards to reduce cognitive load).
* **Layout Structure:** Responsive CSS Grid layouts (12-column asynchronous grids for dashboards).
* **Accessibility (WCAG 2.2 AA Compliant):** Integrated Accessibility Hub featuring:
  * **OpenDyslexic Font:** Toggleable dyslexia-friendly typography.
  * **Reading Ruler:** A horizontal tracking guide bound to the user's cursor.
  * **High Contrast Mode:** Replaces soft borders and pastel backgrounds with high-visibility black-and-white borders.

---

## 3. User Roles & Access Hierarchy

The system defines three strict User Accounts, each with localized dashboards and isolated data access rights:

### 3.1 Employee (Individual Contributor)
* **Goal:** Monitor personal well-being, manage boundaries, and participate in peer networks.
* **Access Level:** Only accesses personal metrics.
* **Navigation:** Dashboard, Kudos Feed, Support Circles, Coffee Roulette, Privacy Center.

### 3.2 Manager (HR / Team Lead)
* **Goal:** Monitor team health trends without violating individual privacy.
* **Access Level:** Accesses k-Anonymized aggregate team data and employee directory provisioning.
* **Navigation:** Manager View, Kudos Feed, Support Circles, Privacy Center.

### 3.3 Admin (IT / Security Administrator)
* **Goal:** Configure global system rules and emergency security levers.
* **Access Level:** Accesses system configuration, audit logs, and global overrides. No access to individual or aggregate sentiment data.
* **Navigation:** Admin Control, Privacy Center.

---

## 4. Core Modules & Features

### 4.1 Employee Modules
* **Sentiment Check-in Widget:** A periodic UI widget prompting employees to log their current sentiment (1-5 score, mapped to emojis). Updates the Burnout Risk Index.
* **Burnout Risk Index (BRI):** A 7-day heatmap (Low, Moderate, Elevated risk bands) visualizing the employee's stress trajectory.
* **BRI Explainer & Feed:** Contextual cards explaining *why* the BRI shifted (e.g., "Late Night Logins", "Meeting Density") alongside a chronological change log of risk escalations.
* **Right-to-Disconnect Outbox:** An after-hours queue that intercepts and holds outbound communications generated outside working hours until the recipient's local 9:00 AM.
* **Calendar Guard:** Intercepts meeting scheduling if an invitee is outside their working hours (e.g., "19:00 for Priya in London"). Allows for "Suggest Alternatives" or "Schedule Anyway (Override)".
* **Kudos Feed:** A peer recognition wall for sending and liking category-based appreciation notes (Collaboration, Inspiration, Gratitude).
* **Support Circles:** Topic-based anonymous peer-support forums (e.g., Parenting, Stress Reduction, Neurodiversity).
* **Coffee Roulette:** Automated pairing system matching employees for casual virtual coffee chats, providing conversation starters and scheduling links.

### 4.2 Manager Modules
* **Manager Team Dashboard:** A k-Anonymized overview of team well-being.
* **Aggregate BRI Chart:** A 7-day bar chart showing average team burnout risk. If the active user count drops below the k-Anonymity floor, this chart is forcibly obscured by a "Protected by k-Anonymity" empty state.
* **Right-to-Disconnect Adherence:** Metrics tracking after-hours message volume and Calendar Guard overrides, scrubbing sender identities.
* **Contextual Micro-Coaching:** Proactive nudge cards offering managers actionable advice based on team data (e.g., "Your team's off-hours messaging increased by 12%. Consider reviewing sprint scopes").
* **Employee Account Provisioning:** A form for HR/Managers to provision new employee profiles, define usernames/roles, and immediately populate the active directory.

### 4.3 Admin & System Controls
* **Global System Preferences:** Configuration of Standard Workday Start/End hours and Default Holiday Calendars.
* **k-Anonymity Floor Configuration:** Setting the minimum cohort size (e.g., k=5) required before Managers can view aggregate data.
* **Emergency Kill Switch (System Pause):** A global toggle that immediately suspends all sentiment survey pop-ups, halts computer vision tracking, and locks out telemetry collection org-wide.
* **Webcam CV Global Enforcement:** An IT-level toggle disabling Computer Vision telemetry for all users regardless of individual consent.

### 4.4 Privacy & Compliance Center
* **Local Computer Vision (CV):** An opt-in feature utilizing the webcam to track gaze, posture, and micro-expressions strictly inside the browser sandbox (no server transmission). Visualized in the header with a pulsing "CV Active" indicator.
* **Granular Data Purge:** A central Privacy Center allowing users to instantly wipe their stored logs, Kudos, and sentiment records from the local database.

---

## 5. Database Schema & Data Models

The `PulseDB` local storage layer implements the following primary data contracts:

* `UserAccount`: Stores `username`, `name`, `role`, `title`, `email`, `timezone`, and `password`.
* `SentimentRecord`: Logs chronological `score` (1-5) and `emoji`.
* `OutboxMessage`: Tracks held communications with `recipient`, `scheduledTime`, and `status`.
* `KudosRecord`: Manages peer recognition with `category`, `likes`, and `likedBy` arrays.
* `SupportMessage`: Handles anonymous forum posts linked to specific `circleId`s.
* `BRIShiftRecord`: Audit logs of burnout risk band transitions mapping `fromBand` to `toBand` alongside causal `factors`.
* `AdminConfig`: Manages `systemPaused`, `kanonymityFloor`, `webcamCVGlobalDisabled`, and `workingHoursStart`/`workingHoursEnd`.
* `CalendarOverrideRecord`: Audit trail for Right-to-Disconnect meeting overrides.

---
*End of Document*
