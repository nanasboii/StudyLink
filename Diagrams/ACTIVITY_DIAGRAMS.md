# StudyLink Activity Diagrams

## Tutee Activity Diagram

```mermaid
flowchart TD
    A[Start / Login] --> B[Browse Resources & Courses]
    B --> C[View Tutor Profiles]
    C --> D[Request Tutoring Session]
    D --> E[Wait for Tutor Decision]
    E -->|Accepted| F[Attend Session]
    E -->|Rejected| G[Receive Notification]
    F --> H[Complete Session]
    H --> I[Write Review]
    I --> J[Earn Points / Rewards]
    D --> K[Cancel Booking]
    K --> L[Receive Cancellation Notice]
    A --> M[Manage Profile]
    A --> N[Upload Profile Picture]
    A --> O[Message Tutor]
    A --> P[View Notifications]
    A --> Q[View Leaderboards]
    A --> R[Redeem Rewards]
    A --> S[Upload Resource]
    S --> T[Manage Uploaded Resources]
    J --> R
```

## Tutor Activity Diagram

```mermaid
flowchart TD
    A[Start / Login] --> B[Open Bookings Inbox]
    B --> C[Review Booking Request]
    C -->|Accept| D[Confirm Booking]
    C -->|Reject| E[Send Rejection]
    D --> F[Prepare for Session]
    F --> G[Complete Session]
    G --> H[Mark as Completed]
    H --> I[Receive Review]
    A --> J[Submit Verification Documents]
    J --> K[Wait for Admin Review]
    K -->|Approved| L[Verified Status]
    K -->|Rejected| M[Reupload Documents]
    A --> N[Upload Resource]
    A --> O[Manage Uploaded Resources]
    A --> P[Message Tutee]
    A --> Q[View Notifications]
    A --> R[View Leaderboards]
    A --> S[Manage Profile]
    A --> T[View Public Profile]
```

## Admin Activity Diagram

```mermaid
flowchart TD
    A[Start / Login] --> B[Open Admin Dashboard]
    B --> C[Review Tutor Verification Requests]
    C -->|Approve| D[Update Tutor Status]
    C -->|Reject| E[Request Reupload]
    B --> F[View Admin Analytics]
    B --> G[Monitor Activity Logs]
    B --> H[Monitor System Errors]
    B --> I[Manage Resources]
    I --> J[Edit / Remove Resources]
    B --> K[Configure Reward Rules]
    B --> L[Send Platform Notifications]
```

## Notes
- The diagrams cover the main activity flows for each user role.
- Tutees focus on discovery, booking, messaging, profile management, and rewards.
- Tutors focus on booking decisions, session lifecycle, verification, and resource management.
- Admins focus on verification review, analytics, logs, errors, resource control, and rewards configuration.
