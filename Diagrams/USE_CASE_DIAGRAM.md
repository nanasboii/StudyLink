# StudyLink Use Case Diagram

```mermaid
%%{init: { 'theme': 'base', 'themeVariables': { 'primaryColor': '#0066cc', 'edgeLabelBackground':'#ffffff', 'actorBorder': '#2f4f4f' }}}%%
usecaseDiagram
    actor Guest as G
    actor Tutee as T
    actor Tutor as R
    actor Admin as A

    G --> (Browse Resources)
    G --> (Search Courses)
    G --> (View Tutor Profiles)
    G --> (Register)
    G --> (Login)

    T --> (Browse Resources)
    T --> (Search Courses)
    T --> (Request Tutoring Session)
    T --> (Cancel Booking)
    T --> (Review Completed Session)
    T --> (Message Tutor)
    T --> (View Notifications)
    T --> (View Leaderboards)
    T --> (Manage Profile)
    T --> (Upload Profile Picture)
    T --> (Upload Resource)
    T --> (Download Resource)
    T --> (Redeem Rewards)
    T --> (View Public Profiles)

    R --> (Browse Resources)
    R --> (Search Courses)
    R --> (Accept or Reject Booking)
    R --> (Complete Session)
    R --> (Manage Bookings Inbox)
    R --> (Submit Verification Documents)
    R --> (Message Tutee)
    R --> (Manage Profile)
    R --> (Upload Profile Picture)
    R --> (Upload Resource)
    R --> (Manage Uploaded Resources)
    R --> (View Notifications)
    R --> (View Leaderboards)
    R --> (View Public Profiles)

    A --> (Review Tutor Verifications)
    A --> (Approve or Reject Verifications)
    A --> (View Admin Analytics)
    A --> (Manage Resources)
    A --> (Monitor Activity Logs)
    A --> (Monitor System Errors)
    A --> (Configure Reward Rules)

    (Upload Resource) ..> (Browse Resources) : extends
    (View Public Profiles) ..> (View Tutor Profiles) : includes
    (Review Completed Session) ..> (Complete Session) : includes
    (Approve or Reject Verifications) ..> (Review Tutor Verifications) : includes
```

## Actors
- **Guest**: Unauthenticated visitor who can browse courses, resources, and tutor profiles, and register or log in.
- **Tutee**: Learner who can book sessions, review tutors, manage profile and resources, message tutors, view notifications and rewards.
- **Tutor**: Educator who can upload and manage resources, handle booking requests, submit verification documents, and communicate with students.
- **Admin**: Platform administrator who reviews verifications, monitors analytics and errors, manages resources, and controls reward rules.

## Core Use Cases
- Browse/search resources and tutor profiles
- Register and authenticate users
- Request, accept/reject, complete, cancel, and review tutoring sessions
- Upload and manage learning resources
- Message between users
- Manage notifications, points, leaderboards, and rewards
- Admin verification review, analytics, and system monitoring
