# School Management Backend API Documentation

This document describes the REST API endpoints for the backend of the School Management System. The backend is built with Django and Django REST Framework.

## Base URL

`http://<server-address>/api/`

## Authentication

The API uses JWT (JSON Web Token) authentication. Most endpoints require authentication.

### Authentication Endpoints

- `POST /api/auth/login/` — Login and obtain JWT tokens
- `POST /api/auth/token/refresh/` — Refresh JWT access token
- `POST /api/auth/logout/` — Logout (blacklist refresh token)
- `GET /api/auth/user/` — Get current authenticated user data
- `POST /api/auth/password-reset/` — Request password reset
- `POST /api/auth/password-reset-confirm/` — Confirm password reset

### Authentication Headers

Include the access token in requests:
```
Authorization: Bearer <access_token>
```

## Core Model Endpoints

### Users
- `GET /api/users/` — List all users (Admin only)
- `GET /api/users/{id}/` — Retrieve a specific user (Admin only)
- `POST /api/admin/update-user/` — Update user credentials (Admin only)

### Students
- `GET /api/students/` — List all students
- `POST /api/students/` — Create a new student
- `GET /api/students/{id}/` — Retrieve a specific student
- `PUT /api/students/{id}/` — Update a student
- `DELETE /api/students/{id}/` — Delete a student
- `GET /api/students/{student_id}/fees/` — Get fees for a specific student

### Teachers
- `GET /api/teachers/` — List all teachers
- `POST /api/teachers/` — Create a new teacher
- `GET /api/teachers/{id}/` — Retrieve a specific teacher
- `PUT /api/teachers/{id}/` — Update a teacher
- `DELETE /api/teachers/{id}/` — Delete a teacher
- `GET /api/teachers/{id}/students/` — Get students taught by a teacher
- `GET /api/teachers/{id}/classes/` — Get classes taught by a teacher

### School Classes
- `GET /api/classes/` — List all classes
- `POST /api/classes/` — Create a new class
- `GET /api/classes/{id}/` — Retrieve a specific class
- `PUT /api/classes/{id}/` — Update a class
- `DELETE /api/classes/{id}/` — Delete a class
- `GET /api/classes/{id}/details/` — Get detailed class information with students and teacher

### Fees
- `GET /api/fees/` — List all fees
- `POST /api/fees/` — Create a new fee record
- `GET /api/fees/{id}/` — Retrieve a specific fee
- `PUT /api/fees/{id}/` — Update a fee
- `DELETE /api/fees/{id}/` — Delete a fee
- `POST /api/fees/{id}/apply_discount/` — Apply discount to a fee
- `POST /api/fees/{id}/waive_amount/` — Waive amount from a fee
- `POST /api/fees/{id}/create_payment_plan/` — Create payment plan for a fee

### Fee Types
- `GET /api/fee-types/` — List all fee types (Admin only)
- `POST /api/fee-types/` — Create a new fee type (Admin only)
- `GET /api/fee-types/{id}/` — Retrieve a specific fee type (Admin only)
- `PUT /api/fee-types/{id}/` — Update a fee type (Admin only)
- `DELETE /api/fee-types/{id}/` — Delete a fee type (Admin only)

### Fee Structures
- `GET /api/fee-structures/` — List all fee structures
- `POST /api/fee-structures/` — Create a new fee structure
- `GET /api/fee-structures/{id}/` — Retrieve a specific fee structure
- `PUT /api/fee-structures/{id}/` — Update a fee structure
- `DELETE /api/fee-structures/{id}/` — Delete a fee structure

### Payments
- `GET /api/payments/` — List all payments
- `POST /api/payments/` — Create a new payment
- `GET /api/payments/{id}/` — Retrieve a specific payment
- `PUT /api/payments/{id}/` — Update a payment
- `DELETE /api/payments/{id}/` — Delete a payment
- `POST /api/payments/{id}/update_status/` — Update payment status
- `POST /api/payments/{id}/process_refund/` — Process refund for a payment
- `POST /api/payments/process/` — Process payment (Stripe integration)

### Discounts
- `GET /api/discounts/` — List all discounts
- `POST /api/discounts/` — Create a new discount
- `GET /api/discounts/{id}/` — Retrieve a specific discount
- `PUT /api/discounts/{id}/` — Update a discount
- `DELETE /api/discounts/{id}/` — Delete a discount

### Refunds
- `GET /api/refunds/` — List all refunds
- `POST /api/refunds/` — Create a new refund
- `GET /api/refunds/{id}/` — Retrieve a specific refund
- `PUT /api/refunds/{id}/` — Update a refund
- `DELETE /api/refunds/{id}/` — Delete a refund

### Payment Plans
- `GET /api/payment-plans/` — List all payment plans
- `POST /api/payment-plans/` — Create a new payment plan
- `GET /api/payment-plans/{id}/` — Retrieve a specific payment plan
- `PUT /api/payment-plans/{id}/` — Update a payment plan
- `DELETE /api/payment-plans/{id}/` — Delete a payment plan

### Fee Reports
- `GET /api/fee-reports/` — List all fee reports
- `POST /api/fee-reports/` — Create a new fee report
- `GET /api/fee-reports/{id}/` — Retrieve a specific fee report
- `PUT /api/fee-reports/{id}/` — Update a fee report
- `DELETE /api/fee-reports/{id}/` — Delete a fee report

### Fee Analytics
- `GET /api/fee-analytics/student_fees_summary/` — Get student fees summary
- `GET /api/fee-analytics/outstanding_balances/` — Get outstanding balances
- `GET /api/fee-analytics/payment_history/` — Get payment history
- `GET /api/fee-analytics/revenue_analytics/` — Get revenue analytics

### Fee Reports Generation
- `GET /api/fee-reports-gen/overdue_fees/` — Get overdue fees report
- `GET /api/fee-reports-gen/fee_collection_trends/` — Get fee collection trends
- `GET /api/fee-reports-gen/student_performance/` — Get student performance report

### Timetable
- `GET /api/timetable/` — List all timetable entries
- `POST /api/timetable/` — Create a new timetable entry
- `GET /api/timetable/{id}/` — Retrieve a specific timetable entry
- `PUT /api/timetable/{id}/` — Update a timetable entry
- `DELETE /api/timetable/{id}/` — Delete a timetable entry
- `GET /api/timetable/class/{class_id}/` — Get timetable for a specific class
- `GET /api/timetable/overview/` — Get comprehensive timetable overview

### Attendance
- `GET /api/attendance/` — List all attendance records
- `POST /api/attendance/` — Create a new attendance record
- `GET /api/attendance/{id}/` — Retrieve a specific attendance record
- `PUT /api/attendance/{id}/` — Update an attendance record
- `DELETE /api/attendance/{id}/` — Delete an attendance record

### Leave Requests
- `GET /api/leaves/` — List leave requests
- `POST /api/leaves/` — Create a new leave request
- `GET /api/leaves/{id}/` — Retrieve a specific leave request
- `PUT /api/leaves/{id}/` — Update a leave request
- `DELETE /api/leaves/{id}/` — Delete a leave request

### Tasks
- `GET /api/tasks/` — List tasks (filtered by user role)
- `POST /api/tasks/` — Create a new task
- `GET /api/tasks/{id}/` — Retrieve a specific task
- `PUT /api/tasks/{id}/` — Update a task
- `DELETE /api/tasks/{id}/` — Delete a task
- `POST /api/tasks/{id}/mark_completed/` — Mark task as completed
- `POST /api/tasks/{id}/mark_in_progress/` — Mark task as in progress
- `GET /api/tasks/today_tasks/` — Get today's tasks
- `GET /api/tasks/upcoming_tasks/` — Get upcoming tasks (next 7 days)

### Periods
- `GET /api/periods/` — List all school periods (Admin only)
- `POST /api/periods/` — Create a new period (Admin only)
- `GET /api/periods/{id}/` — Retrieve a specific period (Admin only)
- `PUT /api/periods/{id}/` — Update a period (Admin only)
- `DELETE /api/periods/{id}/` — Delete a period (Admin only)

### Assignments
- `GET /api/assignments/` — List all assignments
- `POST /api/assignments/` — Create a new assignment
- `GET /api/assignments/{id}/` — Retrieve a specific assignment
- `PUT /api/assignments/{id}/` — Update an assignment
- `DELETE /api/assignments/{id}/` — Delete an assignment
- `GET /api/assignments/{id}/submissions/` — Get submissions for an assignment
- `GET /api/assignments/by_class/` — Get assignments filtered by class

### Assignment Submissions
- `GET /api/assignment-submissions/` — List all assignment submissions
- `POST /api/assignment-submissions/` — Create a new assignment submission
- `GET /api/assignment-submissions/{id}/` — Retrieve a specific assignment submission
- `PUT /api/assignment-submissions/{id}/` — Update an assignment submission
- `DELETE /api/assignment-submissions/{id}/` — Delete an assignment submission
- `POST /api/assignment-submissions/{id}/grade/` — Grade a submission

### Reimbursement Types
- `GET /api/reimbursement-types/` — List all reimbursement types
- `POST /api/reimbursement-types/` — Create a new reimbursement type
- `GET /api/reimbursement-types/{id}/` — Retrieve a specific reimbursement type
- `PUT /api/reimbursement-types/{id}/` — Update a reimbursement type
- `DELETE /api/reimbursement-types/{id}/` — Delete a reimbursement type

### Reimbursements
- `GET /api/reimbursements/` — List all reimbursements
- `POST /api/reimbursements/` — Create a new reimbursement
- `GET /api/reimbursements/{id}/` — Retrieve a specific reimbursement
- `PUT /api/reimbursements/{id}/` — Update a reimbursement
- `DELETE /api/reimbursements/{id}/` — Delete a reimbursement
- `POST /api/reimbursements/{id}/approve/` — Approve a reimbursement
- `POST /api/reimbursements/{id}/reject/` — Reject a reimbursement
- `POST /api/reimbursements/{id}/mark_paid/` — Mark reimbursement as paid

### School
- `GET /api/school/` — List all schools
- `POST /api/school/` — Create a new school
- `GET /api/school/{id}/` — Retrieve a specific school
- `PUT /api/school/{id}/` — Update a school
- `DELETE /api/school/{id}/` — Delete a school

### School Settings
- `GET /api/school-settings/` — List all school settings
- `POST /api/school-settings/` — Create a new school setting
- `GET /api/school-settings/{id}/` — Retrieve a specific school setting
- `PUT /api/school-settings/{id}/` — Update a school setting
- `DELETE /api/school-settings/{id}/` — Delete a school setting

## Special Endpoints

### Health Check
- `GET /api/health/` — Check if the backend is running (Public)

### Student Dashboard
- `GET /api/student/dashboard/` — Get comprehensive student dashboard data
- `GET /api/student/{student_id}/details/` — Get detailed information about a specific student

### Fee Actions
- `POST /api/fees/actions/` — Perform bulk fee operations
  - `create_class_fee`: Create fees for all students in a class
  - `send_reminders`: Send payment reminders to students with unpaid fees
- `GET /api/fees/actions/` — Generate fees report (HTML)

### School Configuration
- `GET /api/config/` — Returns school-wide configuration settings for the frontend

### Database Management
- `GET /api/snapshot/` — Export complete database snapshot (Admin only)
- `POST /api/snapshot/` — Import database snapshot (Admin only)

### Async Tasks
- `POST /api/async-tasks/process_bulk_data/` — Process bulk data operations asynchronously
- `POST /api/async-tasks/generate_report_async/` — Generate reports asynchronously

### Report Management
- `POST /api/report-management/generate/` — Generate a new report
- `GET /api/report-management/list_reports/` — List all available reports
- `GET /api/report-management/{id}/files/` — List files in a specific report
- `GET /api/report-management/{id}/download/` — Download a specific report file
- `DELETE /api/report-management/{id}/delete/` — Delete a specific report (Principal only)

## Reports

### Academic Reports
- `GET /api/reports/academic/` — Get academic statistics

### Financial Reports
- `GET /api/reports/fees-summary/` — Get fees summary with pie chart data

## Web Interface Endpoints

These endpoints serve HTML templates for the web interface:

- `GET /api/fees/dashboard/` — Student fee dashboard (HTML)
- `GET /api/fees/admin/` — Admin fee dashboard (HTML)
- `GET /api/fees/` — Fee list (HTML)
- `GET /api/fees/add/` — Add fee form (HTML)
- `GET /api/fees/{pk}/` — Fee detail (HTML)
- `GET /api/fees/{pk}/edit/` — Edit fee form (HTML)
- `GET /api/fees/{fee_id}/pay/` — Payment form (HTML)
- `POST /api/fees/{fee_id}/discount/` — Apply discount (HTML)
- `POST /api/payments/{payment_id}/refund/` — Process refund (HTML)