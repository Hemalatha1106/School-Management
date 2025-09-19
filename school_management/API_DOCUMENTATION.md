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

### Authentication Headers

Include the access token in requests:
```
Authorization: Bearer <access_token>
```

## Core Model Endpoints

### Users
- `GET /api/users/` — List all users (Admin only)
- `GET /api/users/{id}/` — Retrieve a specific user (Admin only)

### Students
- `GET /api/students/` — List all students
- `POST /api/students/` — Create a new student
- `GET /api/students/{id}/` — Retrieve a specific student
- `PUT /api/students/{id}/` — Update a student
- `DELETE /api/students/{id}/` — Delete a student

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

### Fee Types
- `GET /api/fee-types/` — List all fee types (Admin only)
- `POST /api/fee-types/` — Create a new fee type (Admin only)
- `GET /api/fee-types/{id}/` — Retrieve a specific fee type (Admin only)
- `PUT /api/fee-types/{id}/` — Update a fee type (Admin only)
- `DELETE /api/fee-types/{id}/` — Delete a fee type (Admin only)

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

### Admin Actions
- `POST /api/admin/update-user/` — Update user credentials (Admin only)

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

## Data Models

### User
```json
{
  "id": 1,
  "username": "john_doe",
  "email": "john@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "role": "student|teacher|principal",
  "profile": {
    "phone": "123-456-7890",
    "address": "123 Main St",
    "class_name": "10-A",
    "subject": "Mathematics"
  }
}
```

### Student
```json
{
  "user": {...},
  "school_class": "10-A"
}
```

### Teacher
```json
{
  "user": {...},
  "salary": 50000.00
}
```

### Fee
```json
{
  "id": 1,
  "student": {...},
  "amount": 1000.00,
  "due_date": "2024-12-31",
  "status": "paid|unpaid|partial"
}
```

### Task
```json
{
  "id": 1,
  "teacher": {...},
  "title": "Grade assignments",
  "description": "Grade math assignments for class 10-A",
  "task_type": "grade_assignments",
  "priority": "high",
  "status": "pending",
  "due_date": "2024-12-15",
  "due_time": "14:00:00"
}
```

## Error Codes

- `200 OK` — Success
- `201 Created` — Resource created successfully
- `204 No Content` — Success with no content returned
- `400 Bad Request` — Invalid input data
- `401 Unauthorized` — Authentication required
- `403 Forbidden` — Insufficient permissions
- `404 Not Found` — Resource not found
- `405 Method Not Allowed` — HTTP method not supported
- `409 Conflict` — Resource conflict (e.g., duplicate data)
- `422 Unprocessable Entity` — Validation errors
- `500 Internal Server Error` — Server error

## Example Requests

### Login
```bash
POST /api/auth/login/
Content-Type: application/json

{
  "username": "teacher1",
  "password": "password123"
}
```

### Get Students
```bash
GET /api/students/
Authorization: Bearer <access_token>
```

### Create a Fee
```bash
POST /api/fees/
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "student": 1,
  "amount": 1500.00,
  "due_date": "2024-12-31"
}
```

### Generate Report
```bash
POST /api/report-management/generate/
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "report_type": "academic",
  "format": "json"
}
```

## Rate Limiting

- API endpoints are rate limited to prevent abuse
- Health check endpoint has caching (60 seconds)
- List endpoints have caching (10 minutes)

## Caching

Several endpoints implement caching for better performance:
- Health check: 60 seconds
- List endpoints: 10 minutes
- Report endpoints: 10 minutes

## Contact

For further details, contact the backend team or refer to the code in `school_management/api/`.
