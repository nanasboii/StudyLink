# StudyLink Sequence Diagrams

This file contains sequence diagrams for core user journeys in StudyLink.

## 1. User Login

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant Database

    User->>Frontend: Open login page
    User->>Frontend: Enter email/password and submit
    Frontend->>Backend: POST /auth/login {email, password}
    Backend->>Database: SELECT * FROM users WHERE email = ? FOR UPDATE
    Database-->>Backend: user row
    Backend->>Backend: verify password hash
    alt invalid credentials
        Backend-->>Frontend: 401 Invalid credentials
        Frontend->>User: Show error
    else valid credentials
        Backend->>Database: INSERT INTO sessions (token, user_id, expires_at)
        Database-->>Backend: session saved
        Backend->>Database: INSERT/UPDATE user_login_history
        Database-->>Backend: login history saved
        Backend->>Backend: calculate login streak & points
        Backend-->>Frontend: 200 Login successful with token and user data
        Frontend->>User: store token and redirect
    end
```

## 2. User Logout

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant Database

    User->>Frontend: Click logout
    Frontend->>Backend: POST /auth/logout (Authorization token)
    Backend->>Database: DELETE FROM sessions WHERE token = ?
    Database-->>Backend: session removed
    Backend-->>Frontend: 200 Logged out successfully
    Frontend->>User: clear auth state and redirect to login
```

## 3. Centralized Resource Upload

```mermaid
sequenceDiagram
    participant Tutor
    participant Frontend
    participant Backend
    participant FileStorage
    participant Database

    Tutor->>Frontend: Open upload resource form
    Tutor->>Frontend: Submit file/link + metadata
    Frontend->>Backend: POST /resources/upload (multipart/form-data)
    Backend->>FileStorage: save uploaded file to /uploads/resources/
    FileStorage-->>Backend: file stored
    Backend->>Database: INSERT INTO resources (course_code, contributor_id, title, resource_type, file_url, metadata)
    Database-->>Backend: resource record created
    Backend->>Database: awardPoints(contributor_id, 15, 'Uploaded resource')
    Database-->>Backend: points logged
    Backend-->>Frontend: 201 Resource created
    Frontend->>Tutor: show success and resource details
```

## 4. Resource Download

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant Database
    participant FileStorage

    User->>Frontend: Request resource download
    Frontend->>Backend: POST /resources/:id/download
    Backend->>Database: SELECT file_url FROM resources WHERE id = ?
    Database-->>Backend: resource record
    Backend-->>Frontend: 200 {downloadUrl, openUrl}
    Frontend->>Backend: GET /resources/:id/file?download=1
    Backend->>Database: SELECT file_url FROM resources WHERE id = ?
    Database-->>Backend: file_url
    alt file is hosted link
        Backend-->>User: redirect to external resource link
    else local upload
        Backend->>FileStorage: read /uploads/resources/{filename}
        FileStorage-->>Backend: file stream
        Backend-->>User: send file with Content-Disposition
    end
```

## 5. Tutee Booking Session Request

```mermaid
sequenceDiagram
    participant Tutee
    participant Frontend
    participant Backend
    participant Database

    Tutee->>Frontend: Open tutor profile and schedule session
    Tutee->>Frontend: Submit booking request
    Frontend->>Backend: POST /bookings {tutorId, courseCode, sessionTime, notes}
    Backend->>Database: SELECT id, full_name FROM users WHERE role='tutor' AND student_id = ? OR id::text = ?
    Database-->>Backend: tutor found
    Backend->>Database: INSERT INTO bookings (tutor_id, tutee_id, course_code, session_time, notes)
    Database-->>Backend: booking created
    Backend->>Database: INSERT INTO notifications(recipient_id, message)
    Database-->>Backend: notification created
    Backend-->>Frontend: 201 Booking created
    Frontend->>Tutee: confirm request submitted
```

## 6. Tutor Session Management

```mermaid
sequenceDiagram
    participant Tutor
    participant Frontend
    participant Backend
    participant Database

    Tutor->>Frontend: Open bookings inbox
    Frontend->>Backend: GET /bookings/inbox
    Backend->>Database: SELECT bookings for tutor_id
    Database-->>Backend: bookings list
    Backend-->>Frontend: return bookings
    Tutor->>Frontend: choose booking and decide
    Frontend->>Backend: POST /bookings/:id/decision {decision}
    Backend->>Database: UPDATE bookings SET status = accepted|rejected WHERE id = ? AND tutor_id = ? AND status='pending'
    Database-->>Backend: updated booking
    Backend->>Database: INSERT INTO notifications(recipient_id, message)
    Database-->>Backend: notification created
    alt accepted
      Backend->>Database: awardPoints(tutor_id, 10, 'Accepted tutoring booking')
    end
    Backend-->>Frontend: 200 Booking updated
    Tutor->>Frontend: mark session complete
    Frontend->>Backend: POST /bookings/:id/complete
    Backend->>Database: UPDATE bookings SET status='completed' WHERE id = ? AND tutor_id = ? AND status='accepted'
    Database-->>Backend: booking completed
    Backend->>Database: awardPoints(tutor_id, 20, 'Completed tutoring session')
    Backend->>Database: INSERT INTO notifications(recipient_id, message)
    Database-->>Backend: notification created
    Backend-->>Frontend: 200 Booking completed
```

## 7. Review and Feedback System

```mermaid
sequenceDiagram
    participant Participant
    participant Frontend
    participant Backend
    participant Database

    Participant->>Frontend: Open completed booking review
    Participant->>Frontend: Submit rating/comment
    Frontend->>Backend: POST /bookings/:id/review {rating, comment}
    Backend->>Database: SELECT * FROM bookings WHERE id = ? AND status='completed'
    Database-->>Backend: booking exists
    Backend->>Backend: authorize participant
    Backend->>Database: INSERT INTO booking_reviews(booking_id, reviewer_id, rating, comment)
    Database-->>Backend: review stored
    Backend->>Database: recalculateUserRating(reviewedUserId)
    Database-->>Backend: rating updated
    Backend->>Database: awardPoints(participant_id, 8, 'Submitted tutoring session review')
    Database-->>Backend: points logged
    Backend-->>Frontend: 200 Review submitted

    Participant->>Frontend: View reviews
    Frontend->>Backend: GET /bookings/:id/reviews
    Backend->>Database: SELECT reviews JOIN users WHERE booking_id = ?
    Database-->>Backend: review rows
    Backend-->>Frontend: reviews list
```

## 8. Admin Verification and Management

```mermaid
sequenceDiagram
    participant Admin
    participant Frontend
    participant Backend
    participant Database

    Admin->>Frontend: Open admin verification dashboard
    Frontend->>Backend: GET /admin/tutor-verifications
    Backend->>Database: SELECT tutor_verifications JOIN users
    Database-->>Backend: applications list
    Backend-->>Frontend: return applications
    Admin->>Frontend: approve or reject application
    Frontend->>Backend: POST /admin/tutor-verifications/:id/decision {decision, reviewNotes}
    Backend->>Database: UPDATE tutor_verifications SET status=?, reviewed_by=?, review_notes=?, reviewed_at=NOW() WHERE id=?
    Database-->>Backend: application updated
    alt approved
      Backend->>Database: UPDATE users SET is_verified = TRUE WHERE id = tutor_id
      Database-->>Backend: status updated
      Backend->>Database: awardPoints(tutor_id, 20, 'Tutor verification approved')
    end
    Backend->>Database: INSERT INTO notifications(recipient_id, message)
    Database-->>Backend: notification created
    Backend->>Database: logAdminAction(admin_id, 'verification_decision', 'tutor_verification', id, details)
    Database-->>Backend: admin action recorded
    Backend-->>Frontend: 200 Application decision saved

    Admin->>Frontend: request verification reupload
    Frontend->>Backend: POST /admin/tutor-verifications/:id/request-reupload {note}
    Backend->>Database: UPDATE tutor_verifications SET status='reupload_requested', review_notes=?, reviewed_by=?, reviewed_at=NOW() WHERE id=?
    Database-->>Backend: application updated
    Backend->>Database: INSERT INTO notifications(recipient_id, message)
    Database-->>Backend: notification created
    Backend->>Database: logAdminAction(...)
    Database-->>Backend: admin action recorded
    Backend-->>Frontend: 200 Reupload request sent
```

## 9. Admin Resource and Reward Rule Management

```mermaid
sequenceDiagram
    participant Admin
    participant Frontend
    participant Backend
    participant Database

    Admin->>Frontend: View admin resources page
    Frontend->>Backend: GET /admin/resources
    Backend->>Database: SELECT resources JOIN users
    Database-->>Backend: resources list
    Backend-->>Frontend: return resources
    Admin->>Frontend: update reward rule
    Frontend->>Backend: PATCH /admin/reward-rules/:code {cooldownDays, maxPer30Days, maxPerDay}
    Backend->>Database: UPDATE point_reward_rules SET ... WHERE reward_code = ?
    Database-->>Backend: reward rule updated
    Backend->>Database: logAdminAction(...)
    Database-->>Backend: admin action recorded
    Backend-->>Frontend: 200 Reward rule updated
```

## 10. Related System Flow: Notification Delivery

```mermaid
sequenceDiagram
    participant System
    participant Backend
    participant Database
    participant User

    System->>Backend: createNotification(client, recipientId, message)
    Backend->>Database: INSERT INTO notifications(recipient_id, message)
    Database-->>Backend: notification created
    Backend->>User: notification appears in UI / send push if subscribed
```

## Notes
- These diagrams are organized to support a combined report and emphasize the main backend-driven flows.
- The file includes login/logout, resource lifecycle, booking lifecycle, review systems, admin verification, admin management, and notification delivery.
- Additional flows like profile updates, chat messaging, or push subscription can be added later if needed.
