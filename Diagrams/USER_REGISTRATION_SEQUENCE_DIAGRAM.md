# StudyLink User Registration Sequence Diagram

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant Database
    participant EmailService

    User->>Frontend: Open registration page
    User->>Frontend: Submit registration form
    Frontend->>Backend: POST /auth/register {name, email, password, role}
    Backend->>Database: Check if email exists
    Database-->>Backend: Email available?
    alt email exists
        Backend->>Frontend: 409 Conflict {error: "Email already registered"}
        Frontend->>User: Show error message
    else email available
        Backend->>Database: Insert new user record
        Database-->>Backend: User created
        Backend->>Database: Create session token
        Database-->>Backend: Session saved
        Backend->>EmailService: Send welcome/verification email
        EmailService-->>Backend: Email queued/sent
        Backend->>Frontend: 201 Created {user, token}
        Frontend->>User: Save auth state and redirect to dashboard
    end
```

## Notes
- This diagram covers the registration flow from the user submitting the form through backend validation and database persistence.
- It also includes the welcome email notification step after successful registration.
