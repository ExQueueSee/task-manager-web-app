# Task Manager Web App

## Project Overview
The Task Manager Web App is a system designed for managing tasks efficiently within an organization. It supports user roles, authentication, task creation, assignment, and workflow management, with optional enhancements for advanced functionality.

---

## 1. User Roles & Authentication

### Roles:
- **Admin:**
  - Manages users
  - Approves new signups
  - Oversees the system
  - Manages tasks
- **Normal User:**
  - Creates tasks for themselves
  - Takes unassigned tasks
  - Can be assigned tasks

### User Authentication & Signup:
- Signup requires a company email.
- Email verification system upon signup (or admin approval if verification is not implemented).
- Secure login system with hashed passwords.
- Password recovery/reset functionality.

---

## 2. Task Management

### Task Creation & Assignment:
- **Admin:**
  - Can create tasks and either:
    - Assign a task to a user immediately.
    - Leave a task unassigned for later assignment.
- **Normal Users:**
  - Can create tasks only for themselves.
  - Can leave a task unassigned for others to take.
- **Any user** can assign themselves to an unassigned task.

### Task Visibility & Collaboration:
- Admin can control task visibility when creating tasks.
- Visibility settings can be changed after task creation.
- Users can work on multiple tasks simultaneously.
- A task can only have one assigned user at a time.

---

## 3. Task Properties & Workflow

### Due Dates & Notifications:
- Each task has a due date & time.
- Users assigned to a task or who can view it receive notifications at:
  - 2 weeks, 1 week, 3 days, 2 days, 1 day, 12 hours, 6 hours, 3 hours, 1 hour, 30 mins, 10 mins, and 0 mins before the deadline.

### Task Statuses:
- **Open:** No user assigned yet.
- **In Progress:** A user is working on it.
- **Behind Schedule:** Due date has passed, but the task is still active.
- **Cancelled:** Closed before completion, no further assignments.
- **Closed:** Completed successfully, no further assignments.

---

## 4. Potential Enhancements (Optional Features)

### Advanced Due Dates:
- Instead of a single due date, tasks can have:
  - **Preferred Completion Date:** Early target deadline.
  - **Final Completion Date:** The hard deadline.

### Business Cred System:
- Users gain/lose credits based on performance:
  - **+Credit** for completing tasks before the final deadline.
  - **++Credit** for completing tasks before the preferred deadline.
  - **-Credit** if a self-assigned task passes its deadline.
  - **--Credit** if an admin-assigned task passes its deadline.
  - **+Credit refund** if a late task is cancelled.

### Email Verification System:
- Instead of admin approval, users verify their email when signing up.

---

## Conclusion
This Task Manager Web App ensures structured task allocation, user accountability, and streamlined workflow. With potential enhancements, the system can be further improved to optimize performance and efficiency.

