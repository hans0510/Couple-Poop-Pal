## 1. Foundation

- [x] 1.1 Initialize the WeChat Mini Program project structure and bind a Cloud Development environment for the MVP
- [x] 1.2 Define the shared page shell for onboarding, home, history, and settings
- [x] 1.3 Create database collections, indexes, and access rules for users, pairs, bowel records, menstrual cycles, and reminder state

## 2. Pairing And Access

- [x] 2.1 Implement WeChat login, profile bootstrap, and male or female role selection
- [x] 2.2 Implement pair creation and invite-code join flow with one-male-one-female validation
- [x] 2.3 Enforce shared read access plus own-record write access in cloud functions and data rules

## 3. Health Tracking Flows

- [x] 3.1 Implement bowel record create, backdate, edit, and delete flows with type and amount fields
- [x] 3.2 Implement female-only menstrual cycle start and end flows with shared status display
- [x] 3.3 Build the shared home dashboard and history screens with quick actions and latest-status cards

## 4. Derived State And Reminders

- [x] 4.1 Implement menstrual prediction using recent start-date intervals with a 28-day fallback
- [x] 4.2 Implement overdue bowel state calculation, home reminder presentation, and immediate reset after a new bowel record
- [x] 4.3 Implement subscription permission capture, scheduled reminder evaluation, and once-per-day message throttling

## 5. Validation

- [x] 5.1 Add verification coverage for pairing rules, record ownership boundaries, bowel record CRUD, and menstrual logging permissions
- [x] 5.2 Verify reminder edge cases for first-time users, backdated record edits, missing subscription permission, and repeated scheduler runs
