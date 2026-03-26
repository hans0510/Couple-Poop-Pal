## ADDED Requirements

### Requirement: The system SHALL detect overdue bowel logging after 48 hours

The system SHALL mark a user as overdue for bowel logging when 48 hours have elapsed since that user's latest bowel record. If the user has never logged a bowel record, the system SHALL measure from the time the user joined an active pair.

#### Scenario: Enter overdue state after 48 hours without a bowel record
- **WHEN** 48 hours pass since the user's latest bowel record or active-pair join time without a newer bowel record
- **THEN** the system marks the user as overdue

#### Scenario: Clear overdue state after a new bowel record
- **WHEN** an overdue user creates a new bowel record
- **THEN** the system clears the overdue state

### Requirement: Overdue bowel reminders SHALL be shown to both paired users inside the app

The system SHALL show the overdue bowel reminder on the shared home for the overdue user and for the partner, including a lightweight fruit and hydration prompt.

#### Scenario: Show overdue reminder on the shared home
- **WHEN** a user is marked overdue for bowel logging
- **THEN** the shared home shows the overdue reminder in both users' views

### Requirement: Subscription reminders SHALL respect permission state and daily throttling

The system SHALL send WeChat subscription reminders only to recipients who have granted permission, and it MUST limit reminder delivery to at most one message per overdue user per recipient per calendar day until the overdue state clears.

#### Scenario: Send reminders to authorized recipients
- **WHEN** a user is overdue and both paired users have granted subscription permission
- **THEN** the system may send one reminder message to each user for that overdue state on that day

#### Scenario: Skip unauthorized recipients
- **WHEN** a user is overdue and one recipient has not granted subscription permission
- **THEN** the system sends no subscription reminder to that recipient while still keeping the in-app reminder visible

#### Scenario: Throttle repeated reminder sends
- **WHEN** the reminder job evaluates the same overdue user again on the same calendar day
- **THEN** the system does not send a second reminder message to the same recipient
