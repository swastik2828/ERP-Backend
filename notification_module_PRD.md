
Production-Grade PRD

School ERP — In-App Notification & Event-Driven Notification System

Project: School ERP Backend
Module: In-App Notifications
Plan: Base Plan / Core Module
Architecture: Multi-tenant SaaS
Backend: Node.js + TypeScript + Express + Prisma + PostgreSQL
Primary Consumers: Student & Parent mobile applications; Admin & Teacher web applications
Status: Production implementation specification
Priority: P0 — Core Infrastructure


---

1. Executive Summary

The Notification Module provides a centralized, event-driven notification infrastructure for the School ERP.

It will:

Automatically generate notifications from important business events.

Deliver notifications to the correct users.

Maintain unread/read state.

Support notification preferences.

Prevent duplicate notifications.

Support bulk notification generation efficiently.

Maintain notification history.

Respect school-level tenant isolation.

Provide extensibility for future channels such as push notifications, email, SMS and WhatsApp.

Allow future add-on modules to use the same notification infrastructure without modifying the core notification engine.


The system should not be tightly coupled to any external notification provider.

The initial implementation is:

> In-App Notifications only.



Future delivery channels should be pluggable.


---

2. Product Objective

The system should transform:

Business Event
      ↓
Event Dispatcher
      ↓
Notification Processor
      ↓
Recipient Resolver
      ↓
Preference Engine
      ↓
Notification Creation
      ↓
In-App Notification
      ↓
Student / Parent / Teacher / Admin

Example:

Teacher publishes assignment
        ↓
ASSIGNMENT_PUBLISHED event
        ↓
Find students in target class/section
        ↓
Find their parents
        ↓
Check notification preferences
        ↓
Generate notifications
        ↓
Students + Parents see notification

No controller should manually contain:

createNotification(...)

for every business operation.


---

3. Core Design Principle

Notifications are a reaction to business events.

Bad architecture:

AssignmentController
    ↓
AssignmentService
    ↓
Database
    ↓
NotificationService

Better architecture:

AssignmentService
    ↓
Database Transaction
    ↓
Domain Event
    ↓
Event Dispatcher
    ↓
Notification Handler
    ↓
Notification

This ensures the notification system remains decoupled from business modules.


---

4. Scope

Included in V1

Notification generation

Automatic event-based notifications

Manual notifications

System notifications

Bulk notifications

Targeted notifications


Recipient targeting

Individual user

Student

Parent

Teacher

Role

Class

Section

School


Notification lifecycle

Created

Delivered to in-app inbox

Read

Unread

Archived

Expired


User experience

Notification inbox

Unread count

Mark as read

Mark all as read

Notification details

Pagination

Filtering


Infrastructure

Event-driven architecture

Idempotency

Retry handling

Transaction safety

Tenant isolation

Authorization

Auditability



---

5. Explicitly Out of Scope for V1

Do not implement:

WhatsApp

SMS

Email

Firebase Cloud Messaging

Web Push

Voice calls

Notification provider management


But the architecture must be designed so these can be added later.


---

6. User Roles

The notification system must support:

SUPER_ADMIN
SCHOOL_ADMIN
DATA_ENTRY_ADMIN
TEACHER
PARENT
STUDENT

Notification visibility must always be determined within the user's school/tenant context.


---

7. Notification Types

Notifications should have a controlled taxonomy.

Academic

ASSIGNMENT_PUBLISHED
ASSIGNMENT_UPDATED
ASSIGNMENT_DUE_SOON
ASSIGNMENT_GRADED

EXAM_CREATED
EXAM_UPDATED
EXAM_CANCELLED
RESULT_PUBLISHED
RESULT_UPDATED

Attendance

STUDENT_MARKED_ABSENT
ATTENDANCE_CORRECTION_APPROVED
ATTENDANCE_CORRECTION_REJECTED

TEACHER_MARKED_ABSENT

Fees

FEE_ASSIGNED
FEE_DUE_SOON
FEE_OVERDUE
PAYMENT_RECEIVED
PAYMENT_FAILED
REFUND_PROCESSED

Leave

LEAVE_SUBMITTED
LEAVE_APPROVED
LEAVE_REJECTED
LEAVE_CANCELLED
LEAVE_WITHDRAWN

Notices

NOTICE_PUBLISHED
CIRCULAR_PUBLISHED
NOTICE_UPDATED
NOTICE_EXPIRING

Timetable

TIMETABLE_PUBLISHED
TIMETABLE_UPDATED
CLASS_CANCELLED

System

ACCOUNT_CREATED
PASSWORD_CHANGED
SECURITY_ALERT
SYSTEM_ANNOUNCEMENT


---

8. Event Architecture

Create a centralized event system.

src/
└── shared/
    └── events/
        ├── event.types.ts
        ├── event.interface.ts
        ├── event.bus.ts
        ├── event.publisher.ts
        ├── event.registry.ts
        └── handlers/

Example event:

interface DomainEvent<T = unknown> {
  eventId: string;
  eventType: string;
  schoolId: string;
  actorId?: string;
  entityType: string;
  entityId: string;
  payload: T;
  occurredAt: Date;
}

Example:

eventId:
9b8...

eventType:
ASSIGNMENT_PUBLISHED

schoolId:
school-uuid

entityType:
ASSIGNMENT

entityId:
assignment-uuid


---

9. Event Flow

Assignment Example

Teacher
   │
   ▼
POST /assignments
   │
   ▼
Assignment Service
   │
   ├── Validate
   ├── Authorize
   ├── Create Assignment
   │
   ▼
Transaction
   │
   └── Create Domain Event
             │
             ▼
       Event Dispatcher
             │
             ▼
    Assignment Notification Handler
             │
             ▼
       Resolve Recipients
             │
             ▼
     Check Preferences
             │
             ▼
      Create Notifications


---

10. Transactional Event Reliability

This is extremely important.

Do not simply do:

Database transaction
     ↓
publish event

because the application can crash between those operations.

Instead use an Outbox Pattern.

Flow

Database Transaction
      │
      ├── Business Data
      │
      └── Outbox Event
              ↓
         COMMIT
              ↓
       Background Worker
              ↓
       Process Event
              ↓
       Create Notification

This guarantees that committed business events aren't silently lost.


---

11. Outbox Model

Recommended model:

OutboxEvent

Fields:

id
eventId
schoolId
eventType
aggregateType
aggregateId
payload
status
attempts
availableAt
processedAt
failedAt
lastError
createdAt
updatedAt

Statuses:

PENDING
PROCESSING
PROCESSED
FAILED
DEAD_LETTER


---

12. Idempotency

A notification event may be processed more than once.

Therefore:

eventId

must be globally unique.

The system must guarantee:

> Processing the same event twice must not create duplicate notifications.



Database constraint:

UNIQUE(eventId)

Notification deduplication can additionally use:

recipientId
+
eventId
+
notificationType

depending on the event semantics.


---

13. Notification Database Model

Notification

Recommended:

Notification
├── id
├── schoolId
├── recipientId
├── type
├── category
├── title
├── body
├── entityType
├── entityId
├── metadata
├── priority
├── isRead
├── readAt
├── expiresAt
├── createdAt
└── updatedAt

Important indexes

(schoolId, recipientId, createdAt)
(schoolId, recipientId, isRead)
(schoolId, recipientId, createdAt, isRead)
(entityType, entityId)
(type)
(expiresAt)

The most important query is:

Get current user's latest notifications

Therefore:

schoolId + recipientId + createdAt

must be heavily optimized.


---

14. Notification Category

Use categories:

ACADEMIC
ATTENDANCE
FEES
LEAVE
NOTICE
TIMETABLE
SYSTEM
SECURITY

This allows the frontend to display:

📚 Academic
💰 Fees
📢 Notices
📅 Timetable
📝 Attendance

without interpreting arbitrary notification strings.


---

15. Priority

Use:

LOW
NORMAL
HIGH
URGENT

Example:

LOW

> Assignment reminder.



NORMAL

> New assignment published.



HIGH

> Fee payment is overdue.



URGENT

> School has announced an emergency closure.




---

16. Notification Metadata

Don't put everything into the message.

Example:

{
  "assignmentId": "uuid",
  "subjectId": "uuid",
  "classId": "uuid"
}

This allows the frontend to navigate directly:

Notification
      ↓
metadata.assignmentId
      ↓
Assignment Details

This is extremely important for your future mobile app.


---

17. Recipient Resolution

Different events have different recipients.

Create a dedicated:

RecipientResolver

Example:

ASSIGNMENT_PUBLISHED
        ↓
Class
        ↓
Sections
        ↓
Students
        ↓
Parents

Another:

LEAVE_APPROVED
        ↓
Applicant

Another:

NOTICE_PUBLISHED
        ↓
Target Resolver
        ↓
Students / Parents / Teachers

Recipient resolution must never be hardcoded inside controllers.


---

18. Parent-Student Relationship

This is especially important for your ERP.

Suppose:

Parent A
 ├── Student 1
 ├── Student 2
 └── Student 3

A notification concerning Student 2 must be delivered to the parent.

The system should resolve:

Student
   ↓
ParentStudent relationship
   ↓
Parent User

You already have parent/student relationships in your existing domain model, so the notification engine should leverage those relationships rather than duplicating them.


---

19. Notification Preferences

Users should eventually be able to control categories.

Example:

Attendance notifications    ON
Homework notifications      ON
Exam notifications          ON
Fee notifications           ON
Notice notifications        ON
Leave notifications         ON

Recommended model:

NotificationPreference
├── id
├── userId
├── notificationType
├── enabled
├── createdAt
└── updatedAt

Default behavior:

> If no preference exists → notification enabled.




---

20. Mandatory Notifications

Some notifications should not be suppressible.

Examples:

SECURITY_ALERT
ACCOUNT_LOCKED
PASSWORD_RESET
CRITICAL_SYSTEM_ALERT

The notification type configuration should contain:

isMandatory

Therefore:

User disabled notification
       ↓
Is mandatory?
       ↓
YES
       ↓
Send anyway


---

21. Notification Templates

Do not hardcode every message directly into services.

Create templates.

Example:

ASSIGNMENT_PUBLISHED

Title:
New Assignment: {{assignmentTitle}}

Body:
{{teacherName}} published a new {{subjectName}} assignment
for {{className}}.

Templates can eventually become school-customizable.


---

22. Template Variables

Example:

{{studentName}}
{{parentName}}
{{teacherName}}
{{subjectName}}
{{assignmentTitle}}
{{examName}}
{{feeAmount}}
{{dueDate}}
{{schoolName}}

Template rendering must be safe.

Never allow arbitrary code execution inside templates.


---

23. Automatic Notification Matrix

This is one of the most important parts of the implementation.

Create a centralized event registry:

Event	Recipient	Priority

Assignment Published	Student + Parent	NORMAL
Assignment Updated	Student + Parent	NORMAL
Assignment Due Soon	Student + Parent	HIGH
Assignment Graded	Student + Parent	NORMAL
Student Absent	Parent	HIGH
Attendance Correction Approved	Student + Parent	NORMAL
Exam Created	Student + Parent	NORMAL
Exam Updated	Student + Parent	HIGH
Result Published	Student + Parent	HIGH
Fee Assigned	Parent	NORMAL
Fee Due Soon	Parent	HIGH
Fee Overdue	Parent	HIGH
Payment Received	Parent	NORMAL
Payment Failed	Parent	HIGH
Leave Submitted	Approver	NORMAL
Leave Approved	Applicant + Parent where applicable	NORMAL
Leave Rejected	Applicant	NORMAL
Notice Published	Target Audience	HIGH
Circular Published	Target Audience	HIGH
Timetable Published	Student + Parent	NORMAL
Timetable Updated	Student + Parent	HIGH


This registry becomes the single source of truth for automatic notifications.


---

24. Event Configuration

Conceptually:

{
  ASSIGNMENT_PUBLISHED: {
    category: "ACADEMIC",
    priority: "NORMAL",
    recipients: ["STUDENT", "PARENT"],
    template: "assignment.published",
    mandatory: false
  }
}

This prevents notification logic from becoming scattered throughout the application.


---

25. Notification APIs

Get notifications

GET /api/v1/notifications

Query:

?page=1
&limit=20
&unread=true
&category=ACADEMIC
&type=ASSIGNMENT_PUBLISHED


---

Get notification

GET /api/v1/notifications/:id


---

Mark as read

PATCH /api/v1/notifications/:id/read


---

Mark all as read

PATCH /api/v1/notifications/read-all


---

Delete/archive

PATCH /api/v1/notifications/:id/archive


---

Unread count

GET /api/v1/notifications/unread-count

Response:

{
  "count": 7
}


---

26. Pagination

Do not rely exclusively on offset pagination.

For a high-volume notification inbox, use cursor pagination.

Example:

GET /notifications?limit=20&cursor=<cursor>

Response:

{
  "data": [],
  "pagination": {
    "nextCursor": "...",
    "hasMore": true
  }
}

This scales significantly better as notification volume grows.


---

27. Read State

A notification should contain:

isRead
readAt

When marked read:

isRead = true
readAt = now()

The operation must be idempotent.

Calling it 10 times should not create 10 operations or errors.


---

28. Bulk Read

PATCH /notifications/read-all

Should perform a single optimized database update rather than loading every notification into memory.

Conceptually:

UPDATE notifications
SET is_read = true,
    read_at = NOW()
WHERE recipient_id = ?
AND is_read = false;


---

29. Security

This module contains potentially sensitive information.

Implement:

Authentication

Every endpoint requires authentication.

Authorization

Users can only access their own notifications.

A parent cannot:

GET /notifications/student-of-other-parent

Tenant isolation

Every notification must contain:

schoolId

and queries must enforce it.

Never trust:

schoolId

from request body.

Derive it from authenticated context.


---

30. IDOR Protection

This is critical.

Never simply:

notification.findUnique({
  where: { id }
});

Instead conceptually:

notification ID
+
authenticated user ID
+
authenticated school ID

must all match.


---

31. Data Privacy

Notifications must not expose sensitive data unnecessarily.

Bad:

> Student Rahul Sharma's fee account has ₹37,250 outstanding.



Better:

> A fee payment is due. Open Fees to view details.



Sensitive information should be accessible only after authorized navigation.


---

32. Rate Limiting

Notification endpoints should have reasonable rate limits.

Especially:

GET /notifications
GET /notifications/unread-count
PATCH /notifications/read-all

Prevent abusive polling.


---

33. Caching

Do not cache the entire notification inbox initially.

But:

unread count

can eventually be optimized using:

Redis

cached counters

event-driven invalidation


Don't introduce Redis prematurely.

PostgreSQL should comfortably handle the initial implementation.


---

34. Background Processing

Automatic notifications should not block business requests.

Bad:

POST /assignments

Create assignment
↓
Generate 5,000 notifications
↓
Return response

This is unacceptable.

Instead:

POST /assignments

Create assignment
Create outbox event
COMMIT
↓
Return 201

Then:

Worker
 ↓
Process event
 ↓
Resolve recipients
 ↓
Create notifications


---

35. Bulk Notification Optimization

Suppose a school has:

2,000 students
2,000 parents

Publishing a notice should not perform:

INSERT
INSERT
INSERT
INSERT
...

individually.

Use:

bulkCreate / createMany

and batch processing.

For very large audiences:

Event
 ↓
Recipient batches
 ↓
1000 recipients
 ↓
1000 recipients
 ↓
1000 recipients


---

36. Worker Architecture

Create:

src/infrastructure/workers/

Potential workers:

notification-event.worker.ts
notification-cleanup.worker.ts

Later:

push-notification.worker.ts
email.worker.ts
sms.worker.ts

This keeps delivery infrastructure independent.


---

37. Retry Strategy

Failures should be retried.

Example:

Attempt 1
   ↓
Failure
   ↓
5 sec
   ↓
Attempt 2
   ↓
30 sec
   ↓
Attempt 3
   ↓
5 min
   ↓
Attempt 4
   ↓
Dead Letter

Use exponential backoff.

For V1, retries primarily apply to event processing.


---

38. Dead Letter Queue

Failed events should not disappear.

Store:

eventId
eventType
payload
attempts
lastError
failedAt

Status:

DEAD_LETTER

Admin tooling can later allow:

Retry Event


---

39. Cleanup

Notifications can accumulate massively.

Implement retention.

Example:

Read notifications:
retain 180 days

Unread notifications:
retain until expiration

Expired:
eligible for cleanup

Do not hard-delete blindly.

Run a scheduled cleanup job.


---

40. Auditability

Notification creation should be traceable.

Example:

Notification
   ↓
eventId
   ↓
OutboxEvent
   ↓
Business Entity

If a parent asks:

> "Why did I receive this?"



you should be able to determine:

Notification
→ ASSIGNMENT_PUBLISHED
→ Assignment #123
→ Published by Teacher #456
→ Class 10-A

This is extremely valuable operationally.


---

41. Manual Notifications

The system should support authorized manual notifications.

Example:

Admin:

Create Notice

could generate:

NOTICE_PUBLISHED

rather than directly inserting notifications.

This maintains the event-driven architecture.


---

42. Add-On Compatibility

This is critical for your future architecture.

Your add-ons should be able to publish events.

For example:

Library Add-on
     ↓
BOOK_OVERDUE
     ↓
Core Notification Engine

Transport:

TRANSPORT_BUS_DELAYED

HR:

EMPLOYEE_DOCUMENT_EXPIRING

The core notification system shouldn't need to know the internal implementation of those modules.


---

43. Notification Event Contract

Create a stable contract:

interface NotificationEvent {
  eventId: string;
  eventType: string;
  schoolId: string;
  actorId?: string;
  entityType: string;
  entityId?: string;
  payload: Record<string, unknown>;
  occurredAt: Date;
}

Add-ons simply conform to this contract.


---

44. Multi-Tenant Isolation

Every query must be scoped to:

schoolId

Never allow:

School A → notifications of School B

Even if a notification UUID is known.

Use defense-in-depth:

JWT
 ↓
school context
 ↓
authorization
 ↓
repository filtering
 ↓
database constraints/indexes


---

45. Database Constraints

Use constraints aggressively.

Examples:

Notification.id → UUID
Notification.schoolId → School
Notification.recipientId → User
OutboxEvent.eventId → UNIQUE

Potential composite uniqueness:

(eventId, recipientId)

depending on implementation.


---

46. Repository Layer

Maintain your existing architecture:

notifications/
├── controllers/
├── services/
├── repositories/
├── routes/
├── dtos/
├── validators/
├── tests/

Additionally:

├── handlers/
├── templates/
└── events/

This fits the structure you've already established in your modules.


---

47. Recommended Service Separation

Don't create one massive:

NotificationService

Instead:

NotificationService
NotificationPreferenceService
NotificationTemplateService
NotificationRecipientService
NotificationEventService
NotificationCleanupService

This keeps responsibilities clean.


---

48. API Response Standard

Follow your existing global API conventions.

Example:

{
  "success": true,
  "data": {
    "id": "uuid",
    "type": "ASSIGNMENT_PUBLISHED",
    "category": "ACADEMIC",
    "title": "New Assignment",
    "body": "A new Mathematics assignment has been published.",
    "priority": "NORMAL",
    "isRead": false,
    "createdAt": "2026-08-15T10:30:00Z"
  }
}


---

49. Error Handling

Examples:

NOTIFICATION_NOT_FOUND
UNAUTHORIZED_NOTIFICATION_ACCESS
INVALID_NOTIFICATION_TYPE
INVALID_CURSOR
NOTIFICATION_ALREADY_ARCHIVED

Never expose:

database errors

stack traces

internal IDs unnecessarily

Prisma errors directly



---

50. Testing Strategy

This module should have serious tests because it touches almost every future module.

Unit Tests

Test:

Event parsing

Template rendering

Recipient resolution

Preference evaluation

Deduplication

Priority

Expiration

Event registry



---

51. Integration Tests

Test:

Assignment

Publish assignment
↓
Event created
↓
Notification generated
↓
Correct recipients

Attendance

Mark student absent
↓
Parent notification created

Fees

Record payment
↓
Parent notification

Leave

Approve leave
↓
Applicant notified


---

52. Security Tests

Explicitly test:

Parent A cannot access Parent B notification
Student cannot access parent-only notification
Teacher cannot access another school's notification
Admin cannot access another school's notification
Unknown notification UUID returns safe response


---

53. Idempotency Tests

Critical test:

Process event
Process same event
Process same event again

Expected:

1 event
1 notification

Not:

3 notifications


---

54. Concurrency Tests

Simulate:

Two workers
     ↓
Same event

Expected:

Exactly-once notification effect

This is important if you eventually scale horizontally.


---

55. Performance Requirements

Target:

Notification read API

p95 < 200ms

under normal production load.

Unread count

p95 < 100ms

Event processing

Should be asynchronous and must not increase core business API latency materially.

Bulk notification

Should process thousands of recipients without loading all records into application memory simultaneously.


---

56. Scalability Requirements

The system should support:

1 school
→ 10 schools
→ 100 schools
→ 1,000+ schools

without architectural redesign.

Avoid:

global in-memory notification queues

synchronous bulk generation

unbounded database queries

offset pagination for huge inboxes

module-specific notification implementations



---

57. Observability

Every notification event should be traceable.

Logs should include:

eventId
schoolId
eventType
notificationId
recipientId
processingTime
attempt
status

Example:

[event] ASSIGNMENT_PUBLISHED
[eventId] abc123
[school] school123
[status] processed
[duration] 83ms

Never log:

passwords

JWTs

sensitive personal information

full notification payloads unnecessarily



---

58. Metrics

Track:

notifications_created_total
notifications_read_total
notifications_unread_total
notification_events_processed_total
notification_events_failed_total
notification_processing_duration
notification_creation_duration
outbox_pending_events
outbox_failed_events

Later expose these to Prometheus/Grafana if required.


---

59. Admin Monitoring

Eventually the admin dashboard should show:

Notification System

Events processed: 125,420
Failed events: 12
Pending events: 31
Notifications today: 8,420
Unread: 3,921

But this can be a future backend/admin feature.


---

60. Future Delivery Architecture

Do not implement these now.

But design for:

Notification Event
                         │
                Notification Engine
                         │
             ┌───────────┼───────────┐
             │           │           │
           In-App       Push       Email
             │           │           │
          Database      FCM        Provider
                         │
                  ┌──────┴──────┐
                  │             │
                SMS          WhatsApp

Each channel becomes a provider:

interface NotificationChannel {
  send(notification: Notification): Promise<void>;
}

Future:

InAppChannel
PushChannel
EmailChannel
SmsChannel
WhatsAppChannel

Your existing business modules remain untouched.

That is the key architectural win.


---

61. Future Add-On Event Example

Suppose six months later you build Library.

Library publishes:

BOOK_OVERDUE

The notification engine doesn't care that it came from an add-on.

Library
   ↓
BOOK_OVERDUE
   ↓
Event Bus
   ↓
Notification Registry
   ↓
Parent
   ↓
In-App Notification

This makes your plugin strategy genuinely scalable.


---

62. Notification Lifecycle

Use:

EVENT_CREATED
      ↓
EVENT_PROCESSED
      ↓
RECIPIENT_RESOLVED
      ↓
NOTIFICATION_CREATED
      ↓
UNREAD
      ↓
READ
      ↓
ARCHIVED
      ↓
EXPIRED
      ↓
CLEANED

Don't confuse event processing status with notification read status.

They are two separate concepts.


---

63. Important Business Rules

Rule 1

A user must never receive a notification outside their school.

Rule 2

A notification must not be generated twice for the same event/recipient combination.

Rule 3

Business APIs must not synchronously wait for notification creation.

Rule 4

Notification failures must never roll back a successful business transaction.

Rule 5

A failed notification event must be retryable.

Rule 6

Mandatory security notifications cannot be disabled.

Rule 7

Deleting a source entity must not automatically delete historical notifications unless explicitly required.

Rule 8

Notifications should contain references to source entities rather than duplicating sensitive business data.

Rule 9

Add-on modules must be able to publish notification events without modifying the notification engine.

Rule 10

Notification APIs must enforce tenant and user authorization at repository level.


---

64. Recommended Folder Architecture

I'd implement it roughly like this:

src/modules/notifications/

├── controllers/
│   └── notification.controller.ts
│
├── services/
│   ├── notification.service.ts
│   ├── notification-event.service.ts
│   ├── notification-preference.service.ts
│   ├── notification-template.service.ts
│   └── notification-recipient.service.ts
│
├── repositories/
│   ├── notification.repository.ts
│   ├── notification-preference.repository.ts
│   └── outbox.repository.ts
│
├── handlers/
│   ├── assignment.handler.ts
│   ├── attendance.handler.ts
│   ├── examination.handler.ts
│   ├── fees.handler.ts
│   ├── leave.handler.ts
│   ├── notice.handler.ts
│   └── timetable.handler.ts
│
├── events/
│   ├── notification.events.ts
│   └── notification.registry.ts
│
├── templates/
│   └── notification.templates.ts
│
├── dtos/
│   ├── notification.dto.ts
│   └── notification-preference.dto.ts
│
├── validators/
│   ├── notification.validator.ts
│   └── notification-preference.validator.ts
│
├── routes/
│   └── notification.routes.ts
│
└── tests/
    ├── notification.service.test.ts
    ├── notification.repository.test.ts
    ├── notification.integration.test.ts
    ├── notification.security.test.ts
    ├── notification.idempotency.test.ts
    └── notification.events.test.ts

And infrastructure:

src/infrastructure/

├── events/
│   ├── event-bus.ts
│   └── event-publisher.ts
│
├── outbox/
│   └── outbox.worker.ts
│
└── workers/
    └── notification.worker.ts


---

65. Implementation Phases

Phase 1 — Database

Implement:

Notification
NotificationPreference
NotificationTemplate
OutboxEvent

Add proper:

foreign keys

indexes

constraints

tenant fields

timestamps



---

Phase 2 — Event Infrastructure

Implement:

DomainEvent
EventBus
EventRegistry
Outbox
Worker

Test it independently.


---

Phase 3 — Notification Engine

Implement:

RecipientResolver
PreferenceResolver
TemplateRenderer
NotificationCreator


---

Phase 4 — Automatic Events

Integrate:

Attendance
Homework
Examination
Fees
Leave
Notice
Timetable

This is where your requirement of "automatically send notifications with each event that needs to notify" becomes real.


---

Phase 5 — User APIs

Implement:

GET /notifications
GET /notifications/:id
GET /notifications/unread-count

PATCH /notifications/:id/read
PATCH /notifications/read-all
PATCH /notifications/:id/archive

GET /notification-preferences
PATCH /notification-preferences


---

Phase 6 — Testing

Run:

Unit
Integration
Security
Concurrency
Idempotency
Performance


---

Phase 7 — Hardening

Add:

rate limits

cleanup worker

retry strategy

dead-letter handling

structured logging

metrics

monitoring



---

66. Definition of Done

The module is NOT considered complete merely because:

GET /notifications

works.

It is complete only when:

Architecture

[ ] Event-driven notification architecture exists.

[ ] Outbox pattern implemented.

[ ] Event processing is asynchronous.

[ ] Notification engine is decoupled from business modules.


Automatic notifications

[ ] Assignment events trigger notifications.

[ ] Attendance events trigger notifications.

[ ] Examination events trigger notifications.

[ ] Fee events trigger notifications.

[ ] Leave events trigger notifications.

[ ] Notice events trigger notifications.

[ ] Timetable events trigger notifications.


Reliability

[ ] Idempotency implemented.

[ ] Duplicate notifications prevented.

[ ] Failed events retry.

[ ] Dead-letter handling exists.

[ ] Notification failures never break business transactions.


Security

[ ] Tenant isolation.

[ ] User authorization.

[ ] IDOR protection.

[ ] Sensitive information protected.

[ ] Mandatory notification rules.


Performance

[ ] Cursor pagination.

[ ] Proper indexes.

[ ] Bulk inserts.

[ ] Background processing.

[ ] No unbounded queries.


Testing

[ ] Unit tests.

[ ] Integration tests.

[ ] Security tests.

[ ] Idempotency tests.

[ ] Concurrency tests.

[ ] Event-flow tests.



---

67. The Architecture I Want You to Aim For

This is the most important part.

Your final architecture should eventually look like:

┌─────────────────────────────┐
                 │       SCHOOL ERP CORE       │
                 │                             │
                 │ Attendance                  │
                 │ Homework                    │
                 │ Examination                 │
                 │ Fees                        │
                 │ Leave                       │
                 │ Notices                     │
                 │ Timetable                   │
                 └──────────────┬──────────────┘
                                │
                         DOMAIN EVENTS
                                │
                                ▼
                    ┌──────────────────────┐
                    │    EVENT / OUTBOX    │
                    │       SYSTEM         │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ NOTIFICATION ENGINE  │
                    │                      │
                    │ Recipient Resolver   │
                    │ Preference Engine    │
                    │ Template Engine      │
                    │ Deduplication        │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │   IN-APP CHANNEL     │
                    └──────────┬───────────┘
                               │
                         Student / Parent
                               │
                         Mobile App

Then later:

Notification Engine
                           │
            ┌──────────────┼──────────────┐
            ▼              ▼              ▼
         In-App          Push           Email
                                           │
                           ┌───────────────┼──────────────┐
                           ▼               ▼              ▼
                         SMS           WhatsApp       Future

And your future add-ons simply plug into the event system:

CORE ERP
                     │
            ┌────────┴─────────┐
            │                  │
        Notification       Event Bus
            ▲                  ▲
            │                  │
      ┌─────┴─────┐     ┌─────┴──────────┐
      │           │     │                │
   Library    Transport  HR           Hostel
    ADD-ON       ADD-ON  ADD-ON        ADD-ON

That's the architecture I'd want you to build now.

 

$$
\sum_{i=1}^{n} i = \frac{n(n+1)}{2}
$$

---

*Your documents save automatically. Start writing.*
