## Context

The repository currently contains only OpenSpec scaffolding, so this change is a greenfield MVP. The product is a private WeChat Mini Program for one fixed couple: one male user and one female user. Both users log bowel events, only the female user logs menstrual cycles, and every record is visible to both partners after pairing. The product must stay lightweight enough for daily use while still supporting WeChat-native subscription reminders.

Because the app only serves one couple and already lives inside WeChat, the design should optimize for low operational overhead, simple data entry, and predictable reminder behavior instead of building a general multi-tenant health platform.

## Goals / Non-Goals

**Goals:**

- Provide a paired onboarding flow that binds one male user and one female user into a single shared health space
- Make bowel logging fast, with only timestamp, type, and amount required
- Support female-only menstrual cycle start and end logging with a basic next-period prediction
- Surface overdue bowel reminders in-app and through WeChat subscription messages for both partners
- Preserve shared visibility while restricting edits and deletes to the record owner

**Non-Goals:**

- Public social features, feeds, comments, or support for multiple couples in one shared space
- Medical diagnosis, symptom scoring, or clinically accurate fertility forecasting
- Rich analytics, charts, note fields, or highly customizable tracking dimensions in the MVP
- Reminder channels outside the mini program and WeChat subscription messaging

## Decisions

### 1. Use WeChat Mini Program plus Cloud Development as the default architecture

The MVP should use a WeChat Mini Program client with cloud database, cloud functions, and a scheduled cloud job. This keeps login native through WeChat identity, avoids standing up a separate backend, and supports both server-side reminder evaluation and subscription message delivery. A standalone Node service and external database would be more flexible later, but it would add unnecessary setup and operations for a two-user private app.

### 2. Use a pair-centric data model with shared reads and own-record writes

The core collections should be:

- `users`: profile, role, pair membership, reminder preferences
- `pairs`: invite code, active status, paired user references
- `bowel_records`: owner, pair, occurred time, type, amount
- `menstrual_cycles`: owner, pair, start date, end date
- `reminder_state`: per-user derived overdue status, last sent date, last evaluated time

All read queries should be scoped to the active pair so both partners can see the same shared data. Create, update, and delete operations should require that the authenticated user owns the target record. This matches the agreed privacy model: full visibility, but no editing the partner's entries.

### 3. Center the UX on a shared home dashboard with quick actions

After pairing, the app should land on a shared home screen that shows:

- my latest bowel status and overdue state
- partner's latest bowel status and overdue state
- female cycle status and next predicted period
- quick actions for bowel log, menstrual start, and menstrual end

The history view should provide chronological bowel and menstrual records with edit and delete controls only on the current user's own entries. A lightweight settings view should handle subscription permission state, reminder threshold display, and pair management.

### 4. Model menstrual tracking as cycle start and end events with simple prediction

The female user records only cycle start and cycle end. A cycle with a `start_date` and no `end_date` is treated as the current active period. Prediction should use the intervals between the most recent menstrual start dates, averaging up to the last three intervals. If fewer than two complete intervals are available, the system should fall back to a 28-day cycle length. This keeps the model simple, explainable, and aligned with the agreed MVP scope.

### 5. Compute overdue bowel reminders from the latest bowel event and throttle outbound messages

A user becomes overdue when 48 hours have elapsed since their latest bowel record. If the user has never logged a bowel record, the system should measure from the time they joined an active pair so the reminder state still becomes meaningful after onboarding. A scheduled cloud function should evaluate each user's overdue state on a regular cadence, persist the result, and send subscription messages only to users who have granted permission. While a user remains overdue, outbound messages should be limited to once per calendar day per recipient. Any new bowel record should clear the overdue state immediately.

### 6. Recompute derived health state after every record mutation

Create, edit, delete, and backdated record operations can all change the latest bowel status, overdue state, and menstrual prediction inputs. Instead of trying to maintain every derived field incrementally in the client, cloud functions should recompute the affected derived state after each mutation. This keeps logic authoritative on the backend and avoids stale home dashboard state.

## Risks / Trade-offs

- [Sparse or irregular menstrual history reduces prediction accuracy] -> Label predictions as estimates and fall back to 28 days when history is insufficient.
- [Subscription reminders may not deliver if a user skips authorization] -> Keep the in-app reminder banner as the canonical overdue signal and treat subscription messaging as additive.
- [Shared visibility can feel sensitive even in a private couple app] -> Limit the MVP fields to the agreed lightweight data model and keep write access to the record owner only.
- [Backdated edits can retroactively change overdue status] -> Recompute reminder state immediately after every bowel record mutation.
- [Cloud Development simplifies MVP delivery but increases platform coupling] -> Accept the coupling for the first release and revisit if the product expands beyond one couple or one channel.

## Migration Plan

1. Create the mini program project and attach a Cloud Development environment.
2. Create database collections, indexes, and access rules for users, pairs, bowel records, menstrual cycles, and reminder state.
3. Configure subscription message templates before enabling reminder scheduling.
4. Deploy cloud functions for pairing, record CRUD, prediction, and reminder evaluation.
5. Enable the scheduled reminder job only after the dashboard and logging flows are working end to end.

Rollback is straightforward because there is no legacy production system. If needed, disable the scheduler, roll back the client version, and preserve existing records in the database.

## Open Questions

- None for the MVP scope agreed so far. Future iterations can revisit customizable reminder thresholds and richer menstrual symptom tracking.
