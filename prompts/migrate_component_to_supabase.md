# Prompt: Migrate Component(s) from db.ts → Supabase

> **How to use:** Copy everything below this line, fill in `[INSERT COMPONENT NAME(S) HERE]`, and paste it into your AI assistant.

---

<role>
You are an expert React/Next.js Developer and Supabase Integration Specialist.
</role>

<context>
We are migrating our Next.js frontend away from a synchronous `localStorage` mock database (`app/lib/db.ts`) to a production-ready asynchronous Supabase PostgreSQL backend.

The `db.ts` file currently acts as both our TypeScript interface registry and our synchronous data fetching layer (via the `PulseDB` class). We need to systematically decouple our React components from `db.ts` so it can eventually be deleted.

### Project Structure
- **Supabase client:** `app/lib/supabaseClient.ts` → exports `supabase`
- **Generated DB types:** `app/lib/database.types.ts` → exports `Database`
- **Components dir:** `app/components/`
- **Pages dir:** `app/` (e.g. `app/page.tsx`)

### Supabase Table → db.ts Interface Mapping
| Supabase Table | Old db.ts Interface |
|---|---|
| `user_profiles` | `UserAccount` |
| `mood_logs` | `SentimentRecord` |
| `outbox_messages` | `OutboxMessage` |
| `kudos_posts` | `KudosRecord` |
| `support_circle_messages` | `SupportMessage` |
| `bri_shift_records` | `BRIShiftRecord` |
| `coffee_roulette_pairings` | `CoffeeRouletteState` |
| `scheduled_meetings` | `ScheduledMeeting` |
| `calendar_overrides` | `CalendarOverrideRecord` |
| `admin_configs` | `AdminConfig` |
| `security_configs` | `SecurityConfig` |
| `audit_logs` | `AuditLogEntry` |
| `notifications` | *(no prior equivalent)* |
</context>

<task>
Please refactor the following component(s) to use the live Supabase client and our generated database types, completely removing any dependencies on `app/lib/db.ts`:

**[INSERT COMPONENT NAME(S) HERE — e.g., SentimentWidget.tsx and SentimentTrendLine.tsx]**
</task>

<requirements>
Please execute the following refactoring steps for the specified component(s):

1. **Type Replacement:**
   - Remove all interface imports from `app/lib/db.ts` (e.g., `SentimentRecord`, `UserAccount`).
   - Import and apply the exact generated types from `app/lib/database.types.ts`.
   - Example: `type MoodLog = Database['public']['Tables']['mood_logs']['Row']`

2. **Supabase Client Import:**
   - Import the shared client: `import { supabase } from '../lib/supabaseClient';`

3. **Data Fetching Refactor (Async/Await):**
   - Completely remove all synchronous calls to the `PulseDB` class.
   - Replace them with asynchronous `@supabase/supabase-js` client calls inside `useEffect`.
   - Examples:
     - Read: `const { data, error } = await supabase.from('mood_logs').select('*').eq('user_id', userId)`
     - Insert: `await supabase.from('mood_logs').insert({ mood_score: 3, user_id: userId })`
     - Update: `await supabase.from('outbox_messages').update({ status: 'canceled' }).eq('id', id)`
     - Delete: `await supabase.from('outbox_messages').delete().eq('id', id)`

4. **State & Error Handling (Crucial):**
   - Introduce `isLoading` (boolean) and `error` (string | null) `useState` hooks.
   - Wrap all Supabase calls in try/catch blocks.
   - Render a loading skeleton or spinner while the request is pending.
   - Render an error message when the request fails.

5. **Auth-Aware Queries:**
   - Where the current component reads the "current user" from `PulseDB.getCurrentUser()`, replace it with:
     ```ts
     const { data: { user } } = await supabase.auth.getUser();
     ```
   - Filter all private data queries by `user_id`: `.eq('user_id', user.id)`

6. **Real-Time Subscriptions (if applicable):**
   - If the component displays a live feed (e.g., Kudos Feed, Support Circles, Outbox), replace the `useEffect` polling with a Supabase Realtime subscription:
     ```ts
     const channel = supabase
       .channel('table-changes')
       .on('postgres_changes', { event: '*', schema: 'public', table: 'kudos_posts' }, (payload) => {
         // update local state from payload
       })
       .subscribe();
     return () => { supabase.removeChannel(channel); };
     ```

7. **Output Rules:**
   - Output the fully refactored, production-ready React component code.
   - Do not hallucinate missing components; focus strictly on decoupling the requested file(s) from `db.ts`.
   - Preserve all existing JSX, styling (Tailwind classes), and component props exactly as they are.
   - Do NOT rewrite or redesign the UI — only refactor the data layer.
</requirements>
