## Why

Generic health apps are too broad for a private two-person routine tracker. We need a lightweight WeChat Mini Program that lets one couple quickly log bowel movements and menstrual cycles, see each other's status, and surface timely reminders without extra social or analytics overhead.

## What Changes

- Add a private paired-user model with exactly two roles, one male and one female, and fully shared visibility after pairing.
- Add bowel recording for both users with timestamp, bowel type, and amount, plus shared history and self-service editing and deletion.
- Add menstrual cycle tracking for the female user using start and end events only, with shared cycle status and basic next-period prediction.
- Add overdue bowel reminders when 48 hours pass without a bowel record, shown in-app and optionally sent via WeChat subscription messages to both partners.
- Add a minimal shared home dashboard, history views, and settings needed to support quick logging, reminder permissions, and pair management.

## Capabilities

### New Capabilities

- `paired-user-access`: pair exactly two users, assign male or female roles, and provide shared visibility with own-record write boundaries
- `bowel-recording`: let both users create, review, edit, and delete bowel records with time, type, and amount
- `menstrual-cycle-tracking`: let the female user record cycle start and end events, expose current cycle status, and predict the next period
- `health-reminders`: detect overdue bowel logging and surface in-app plus subscription reminders for both partners

### Modified Capabilities

- None.

## Impact

- Adds a new WeChat Mini Program experience with onboarding, shared home, history, and settings screens
- Adds data models and storage for users, pairs, bowel records, menstrual cycles, and reminder state
- Adds backend logic for pairing, shared access rules, cycle prediction, overdue evaluation, and subscription message delivery
- Requires WeChat subscription message template configuration and reminder job scheduling
