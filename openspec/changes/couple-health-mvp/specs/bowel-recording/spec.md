## ADDED Requirements

### Requirement: Each paired user SHALL be able to record a bowel event with time, type, and amount

The system SHALL allow each paired user to create a bowel record with an occurrence time, a bowel type chosen from `正常`, `偏干`, or `腹泻`, and an amount chosen from `很少`, `少`, `正常`, `多`, or `很多`.

#### Scenario: Save a bowel record with valid values
- **WHEN** a paired user submits a bowel record with a valid time, type, and amount
- **THEN** the system stores the bowel record under that user's ownership

#### Scenario: Reject an invalid bowel record
- **WHEN** a user submits a bowel record with a missing required field or a type or amount outside the allowed values
- **THEN** the system rejects the submission

### Requirement: Bowel history SHALL support shared viewing and backdated entries

The system SHALL keep bowel records as timestamped history visible to both paired users, and it SHALL allow a user to create a record for a past time instead of only the current moment.

#### Scenario: Add a backdated bowel record
- **WHEN** a user creates a bowel record for a previous day or earlier time
- **THEN** the system stores the backdated timestamp and reorders the shared history based on occurrence time

#### Scenario: View shared bowel history
- **WHEN** either paired user opens bowel history
- **THEN** the system shows bowel records from both users in reverse chronological order

### Requirement: Users SHALL be able to edit or delete their own bowel records

The system SHALL allow a user to update or remove any bowel record they own, and it MUST recalculate the user's latest bowel status after the change.

#### Scenario: Edit an owned bowel record
- **WHEN** a user changes the time, type, or amount of one of their bowel records
- **THEN** the system saves the updated values and recalculates the latest bowel status

#### Scenario: Delete an owned bowel record
- **WHEN** a user deletes one of their bowel records
- **THEN** the system removes the record and recalculates the latest bowel status
