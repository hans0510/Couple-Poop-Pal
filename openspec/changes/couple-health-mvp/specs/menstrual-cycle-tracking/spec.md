## ADDED Requirements

### Requirement: Only the female user SHALL be able to record menstrual cycle start and end events

The system SHALL allow only the paired female user to create menstrual cycle records, and each cycle record SHALL support a `start_date` and an `end_date`.

#### Scenario: Record a cycle start
- **WHEN** the female user chooses the menstrual start action and provides a start date
- **THEN** the system creates a menstrual cycle record with that start date

#### Scenario: Record a cycle end
- **WHEN** the female user ends an active menstrual cycle and provides an end date
- **THEN** the system saves the end date on the open cycle

#### Scenario: Block menstrual logging for the male user
- **WHEN** the male user attempts to access a menstrual logging action
- **THEN** the system does not allow the action

### Requirement: Menstrual status SHALL be visible to both paired users

The system SHALL expose the female user's current menstrual status to both paired users, treating a cycle with a start date and no end date as currently active.

#### Scenario: Show an active menstrual cycle
- **WHEN** the female user has a menstrual cycle record with a start date and no end date
- **THEN** the shared home shows that the female user is currently in her period

#### Scenario: Show a completed menstrual cycle
- **WHEN** the open cycle receives an end date
- **THEN** the shared home no longer marks the female user as currently in her period

### Requirement: The system SHALL predict the next menstrual start date from recent history

The system SHALL predict the next menstrual start date by averaging up to the three most recent intervals between menstrual cycle start dates. If fewer than two complete intervals exist, the system SHALL use a 28-day cycle length.

#### Scenario: Use the default cycle length when history is sparse
- **WHEN** fewer than two complete menstrual intervals exist for the female user
- **THEN** the system predicts the next start date as 28 days after the most recent start date

#### Scenario: Use recent intervals when history is available
- **WHEN** at least two complete menstrual intervals exist for the female user
- **THEN** the system predicts the next start date from the average of up to the three most recent start-date intervals
