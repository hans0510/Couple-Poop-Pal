## ADDED Requirements

### Requirement: Couple pairing SHALL create a single shared pair with one male user and one female user

The system SHALL allow one authenticated user to create a pair and another authenticated user to join it, while enforcing that an active pair contains at most two users and exactly one male role and one female role.

#### Scenario: Create a new pair
- **WHEN** a signed-in user selects a role and creates a new pair
- **THEN** the system stores the user in a new pair and marks the pair as waiting for the second role

#### Scenario: Join a pair with the missing role
- **WHEN** a signed-in user enters a valid invite code and selects the missing role for that pair
- **THEN** the system adds the user to the pair and marks the pair as active

#### Scenario: Reject an invalid join attempt
- **WHEN** a user attempts to join a pair that already has two users or already contains the selected role
- **THEN** the system rejects the request and explains why the pair cannot be joined

### Requirement: Paired users SHALL see a shared home context after pairing

The system SHALL show both paired users the same shared home context once their pair is active, including each user's latest bowel status and the female user's menstrual status.

#### Scenario: Open the shared home after pairing
- **WHEN** either user opens the mini program after the pair becomes active
- **THEN** the system shows the shared home with both partners' health status cards

### Requirement: Users SHALL manage only their own records while both users retain shared visibility

The system SHALL allow both paired users to view all records in the pair, but it MUST restrict create, edit, and delete actions so each user can manage only the records they own.

#### Scenario: Edit an owned record
- **WHEN** a user edits one of their own records
- **THEN** the system saves the updated record and refreshes shared derived status

#### Scenario: Block editing a partner's record
- **WHEN** a user attempts to edit or delete a record owned by the partner
- **THEN** the system denies the action
