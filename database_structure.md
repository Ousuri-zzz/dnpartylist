# Database Structure Documentation

This document outlines the structure of the databases used in the application, based on the provided security rules and data organization.

## Realtime Database

The Realtime Database is primarily used for data that requires real-time synchronization and has a tree-like structure.
General rules:
- Root read access: Requires authentication (`auth != null`).
- Root write access: Requires authentication (`auth != null`).

### `/parties`

Stores information about various parties.
-   **Read access**: True (implicitly, inherits from root but no specific override, meaning effectively `auth != null`).
-   **Key**: `$partyId`
    -   **Write access**: Requires authentication (`auth != null`).
    -   **Validation**: Must have `nest`, `maxMember`, `leader` as children.
    -   **Data**:
        -   `nest`: (string) Name of the nest (likely a location or mission).
            -   **Validation**: Must be a non-empty string.
        -   `maxMember`: (number) Maximum number of members in the party.
            -   **Validation**: Must be a number > 0 and <= 8.
        -   `leader`: (string) UID of the party leader.
            -   **Validation**: On creation or if changed, must be the UID of the authenticated user.
        -   `members`: (map/object) Members in the party.
            -   **Write access**: Requires authentication. A user can only add themselves if they are not already a member (`!data.exists() || !data.child(newData.child('userId').val()).exists()`).
            -   **Key**: `$memberId` (This seems to be an arbitrary key for the member entry, not directly validated as UID here but the `userId` child is)
            -   **Validation (for each member entry)**: Must have `userId` and `joinedAt`. `userId` must be the authenticated user's UID. `joinedAt` must be a string.
            -   **Data**:
                -   `userId`: (string) UID of the member.
                    -   **Validation**: Must be the UID of the authenticated user (`newData.val() === auth.uid`).
                -   `joinedAt`: (string) Time of joining (ISO 8601 format, e.g., YYYY-MM-DDTHH:mm:ssZ).
                    -   **Validation**: Must be a string matching ISO 8601 format.
        -   `goals`: (map/object) Party goals.
            -   **Write access**: Requires authentication AND the authenticated user must be the party leader (`root.child('parties').child($partyId).child('leader').val() === auth.uid`).
            -   **Validation**: Must have `atk`, `hp`, `cri`, `def` as children.
            -   **Data**:
                -   `atk`: (number) Target ATK.
                    -   **Validation**: Must be a number >= 0.
                -   `hp`: (number) Target HP.
                    -   **Validation**: Must be a number >= 0.
                -   `cri`: (number) Target CRI.
                    -   **Validation**: Must be a number >= 0.
                -   `def`: (number) Target DEF.
                    -   **Validation**: Must be a number >= 0.

### `/users`

Stores information for each user.
-   **Key**: `$uid` (User ID from Authentication)
    -   **Read access**: Requires authentication (`auth != null`).
    -   **Write access**: Authenticated user must be the owner (`auth.uid === $uid`) OR a Guild leader (`root.child('guild/leaders/' + auth.uid).val() === true`).
    -   **Data**:
        -   `characters`: (map/object) User's characters.
            -   **Read access**: Requires authentication.
            -   **Write access**: Authenticated user must be the owner of the parent user data (`auth.uid === $uid`) OR a Guild leader.
            -   **Key**: `$characterId`
            -   **Validation (for each character entry)**: Must have `name`, `class`, `mainClass`, `stats`. `lastResetDay` and `lastResetWeek` must be numbers if they exist.
            -   **Data**:
                -   `name`: (string) Character name.
                    -   **Validation**: Must be a non-empty string.
                -   `class`: (string) Character class.
                    -   **Validation**: Must be a string.
                -   `mainClass`: (string) Character's main class.
                    -   **Validation**: Must be a string.
                -   `level`: (number) Character level.
                    -   **Validation**: Must be a number >= 1.
                -   `stats`: (map/object) Character stats.
                    -   `atk`: (number) **Validation**: Must be a number >= 0.
                    -   `hp`: (number) **Validation**: Must be a number >= 0.
                    -   `pdef`: (number) (Physical Defense) **Validation**: Must be a number >= 0.
                    -   `mdef`: (number) (Magical Defense) **Validation**: Must be a number >= 0.
                    -   `cri`: (number) (Critical) **Validation**: Must be a number >= 0.
                    -   `ele`: (number) (Elemental Attack) **Validation**: Must be a number >= 0.
                    -   `fd`: (number) (Final Damage) **Validation**: Must be a number >= 0.
                -   `checklist`: (map/object) List of completed tasks.
                    -   `daily`: (map/object) Daily tasks.
                        -   `dailyQuest`: (boolean) **Validation**: Must be a boolean.
                        -   `ftg`: (boolean) (Fatigue?) **Validation**: Must be a boolean.
                    -   `weekly`: (map/object) Weekly tasks.
                        -   **Key (for tasks)**: `$task`
                        -   **Value**: (number) **Validation**: Must be a number >= 0.
        -   `lastResetDay`: (number, optional) Timestamp or date of the last daily reset. (Validation is at character level in rules)
        -   `lastResetWeek`: (number, optional) Timestamp or date of the last weekly reset. (Validation is at character level in rules)
        -   `meta`: (map/object) Additional user information.
            -   **Read access**: Requires authentication.
            -   **Write access**: Authenticated user must be the owner (`auth.uid === $uid`) OR a Guild leader.
            -   **Data**:
                -   `discord`: (string) Discord ID or name.
                    -   **Validation**: Must be a string.

### `/tradeMerchants`

Stores information about merchants (likely related to trading).
-   **Key**: `$uid`
    -   **Read access**: Requires authentication.
    -   **Write access**: Authenticated user must be the owner (`auth.uid === $uid`) OR a Guild leader.

### `/trade`

Stores trade information.
-   **Key**: `$tradeId`
    -   **Read access**: Requires authentication.
    -   **Write access**: Requires authentication.

### `/tradeItems`

Stores items used in trading.
-   **Key**: `$itemId`
    -   **Read access**: Requires authentication.
    -   **Write access**: Requires authentication.

### `/guildLoans`

Stores information about loans within a Guild.
-   **Key**: `$loanId`
    -   **Read access**: Requires authentication.
    -   **Write access**: Requires authentication AND (the authenticated user is the borrower (`data.child('borrower').child('uid').val() == auth.uid`) OR a Guild leader).
    -   **Data**:
        -   `borrower`: (object containing `uid`) UID of the borrower.

### `/feed`

Stores feed/activity information.
-   **Read access**: Requires authentication.
-   **Write access**: Requires authentication.

### `/guild`

Stores Guild information.
-   **Read access**: Requires authentication.
-   **Write access**: Authenticated user must be a Guild leader (`root.child('guild/leaders/' + auth.uid).val() === true`).
-   **Sub-nodes**:
    -   `leaders`: (map/object) Stores UIDs of Guild leaders (value is `boolean true`).
        -   **Read access**: Requires authentication.
        -   **Write access**: Authenticated user must be a Guild leader.
    -   `members`: (map/object) Stores UIDs of Guild members.
        -   **Read access**: Requires authentication.
        -   **Key**: `$memberId` (UID of the member)
            -   **Write access (for each member entry)**: Authenticated user must be the member themselves (`auth.uid === $memberId`) OR a Guild leader.
    -   `announcements`: (map/object) Announcements.
        -   **Read access**: Requires authentication.
        -   **Write access**: Authenticated user must be a Guild leader.
    -   `events`: (map/object) Guild events.
        -   **Read access**: Requires authentication.
        -   **Write access**: Authenticated user must be a Guild leader.

**Summary for Realtime Database**: Emphasizes object or map data with tree-like relationships, suitable for data requiring real-time synchronization. Detailed validation and access rules are enforced.

## Cloud Firestore (Database Name: (default))

Cloud Firestore uses a Collection/Document model.

### `/users/{userId}`

-   **Collection**: `users`
-   **Document ID**: `{userId}` (UID from Authentication)
-   *Users can read and write their own documents.*

### `/characters/{characterId}`

-   **Collection**: `characters`
-   **Document ID**: `{characterId}`
-   *Each character document should likely have a `userId` field to identify the owner.*
-   *Users can read and write their own character documents (verified by `resource.data.userId == request.auth.uid`).*

### `/events/{eventId}`

-   **Collection**: `events`
-   **Document ID**: `{eventId}`
-   *Everyone can read event documents.*
-   *Logged-in users can create event documents.*
-   *The event owner (`ownerUid`) can edit or delete their own event documents.*
-   *Event documents likely have fields: `ownerUid`, `isEnded`, `startAt` (based on indexes).*

### `/events/{eventId}/participants/{userId}`

-   **Subcollection**: `participants` (under each event document)
-   **Document ID**: `{userId}` (UID of the participant)
-   *Everyone can read participant documents.*
-   *Logged-in users can create their own participant document (`request.auth.uid == userId`) to join an event.*
-   *Logged-in users can delete their own participant document (`request.auth.uid == userId`) to leave an event.*
-   *Logged-in users can update their own participant document, or the event owner (`ownerUid`) can also update participant documents (e.g., for recording rewards or participation status).* 