#!/usr/bin/env python
"""
Script to populate the database with sample data for testing the teacher dashboard.
Run this script to create realistic test data.
"""

import os
import sys
import django
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
import random

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'school_management.settings')
django.setup()

from django.contrib.auth import get_user_model
from api.models import (
    Teacher, Student, SchoolClass, User, Fee, Payment,
    Attendance, Task, Assignment, AssignmentSubmission,
    Reimbursement, ReimbursementType, FeeType, Period, Timetable, Grade, Notification,
    LibraryStats, StudentClassRank, WeeklyTimetable,
    TeacherAttendanceStats, TeacherAssignmentStats,
    TeacherReimbursementStats, TeacherGradeStats
)

User = get_user_model()

def create_sample_teachers():
    """Create sample teachers."""
    print("Creating sample teachers...")

    teachers_data = [
        {
            'username': 'john_smith',
            'email': 'john.smith@school.com',
            'first_name': 'John',
            'last_name': 'Smith',
            'password': 'password123'
        },
        {
            'username': 'sarah_davis',
            'email': 'sarah.davis@school.com',
            'first_name': 'Sarah',
            'last_name': 'Davis',
            'password': 'password123'
        },
        {
            'username': 'michael_brown',
            'email': 'michael.brown@school.com',
            'first_name': 'Michael',
            'last_name': 'Brown',
            'password': 'password123'
        }
    ]

    teachers = []
    for teacher_data in teachers_data:
        user, created = User.objects.get_or_create(
            username=teacher_data['username'],
            defaults={
                'email': teacher_data['email'],
                'first_name': teacher_data['first_name'],
                'last_name': teacher_data['last_name'],
                'role': User.Role.TEACHER
            }
        )
        if created:
            user.set_password(teacher_data['password'])
            user.save()

        teacher, created = Teacher.objects.get_or_create(
            user=user,
            defaults={'salary': random.randint(40000, 60000)}
        )
        teachers.append(teacher)
        print(f"Created teacher: {teacher.user.first_name} {teacher.user.last_name}")

    return teachers

def create_sample_classes(teachers):
    """Create sample classes and assign to teachers."""
    print("Creating sample classes...")

    classes_data = [
        {'name': 'Class 10-A', 'grade': '10'},
        {'name': 'Class 10-B', 'grade': '10'},
        {'name': 'Class 9-A', 'grade': '9'},
        {'name': 'Class 9-B', 'grade': '9'},
        {'name': 'Class 8-A', 'grade': '8'}
    ]

    classes = []
    for i, class_data in enumerate(classes_data):
        teacher = teachers[i % len(teachers)]
        school_class, created = SchoolClass.objects.get_or_create(
            name=class_data['name'],
            defaults={'teacher': teacher.user}
        )
        classes.append(school_class)
        if created:
            print(f"Created class: {school_class.name} (Teacher: {teacher.user.first_name} {teacher.user.last_name})")

    return classes

def create_sample_students(classes):
    """Create sample students and assign to classes."""
    print("Creating sample students...")

    first_names = ['Alice', 'Bob', 'Charlie', 'Diana', 'Edward', 'Fiona', 'George', 'Helen', 'Ian', 'Julia',
                   'Kevin', 'Laura', 'Mike', 'Nina', 'Oliver', 'Paula', 'Quinn', 'Rachel', 'Steve', 'Tina']
    last_names = ['Johnson', 'Smith', 'Brown', 'Davis', 'Wilson', 'Garcia', 'Martinez', 'Anderson', 'Taylor', 'Thomas',
                  'Jackson', 'White', 'Harris', 'Martin', 'Thompson', 'Garcia', 'Martinez', 'Robinson', 'Clark', 'Rodriguez']

    students = []
    for i in range(50):  # Create 50 students
        first_name = random.choice(first_names)
        last_name = random.choice(last_names)
        username = f"{first_name.lower()}_{last_name.lower()}_{i}"

        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                'email': f"{username}@school.com",
                'first_name': first_name,
                'last_name': last_name,
                'role': User.Role.STUDENT
            }
        )
        if created:
            user.set_password('password123')
            user.save()

        # Assign to a random class
        school_class = random.choice(classes)

        student, created = Student.objects.get_or_create(
            user=user,
            defaults={'school_class': school_class}
        )
        students.append(student)
        if created:
            print(f"Created student: {student.user.first_name} {student.user.last_name} (Class: {school_class.name})")

    return students

def create_sample_periods():
    """Create sample school periods."""
    print("Creating sample periods...")

    periods_data = [
        {'period_number': 1, 'start_time': '08:00', 'end_time': '09:00'},
        {'period_number': 2, 'start_time': '09:00', 'end_time': '10:00'},
        {'period_number': 3, 'start_time': '10:00', 'end_time': '11:00'},
        {'period_number': 4, 'start_time': '11:00', 'end_time': '12:00'},
        {'period_number': 5, 'start_time': '12:00', 'end_time': '13:00'},  # Break
        {'period_number': 6, 'start_time': '13:00', 'end_time': '14:00'},
        {'period_number': 7, 'start_time': '14:00', 'end_time': '15:00'},
        {'period_number': 8, 'start_time': '15:00', 'end_time': '16:00'},
    ]

    periods = []
    for period_data in periods_data:
        period, created = Period.objects.get_or_create(
            period_number=period_data['period_number'],
            defaults={
                'start_time': period_data['start_time'],
                'end_time': period_data['end_time']
            }
        )
        periods.append(period)
        if created:
            print(f"Created period: Period {period.period_number} ({period.start_time} - {period.end_time})")

    return periods

def create_sample_assignments(teachers, classes):
    """Create sample assignments."""
    print("Creating sample assignments...")

    subjects = ['Mathematics', 'Science', 'English', 'History', 'Geography']
    assignment_titles = [
        'Chapter 5 - Algebra Problems',
        'Chemistry Lab Report',
        'Essay on Shakespeare',
        'World War II Research',
        'Map Skills Assignment',
        'Geometry Proofs',
        'Physics Experiment',
        'Literature Analysis',
        'Ancient Civilizations',
        'Climate Change Project'
    ]

    assignments = []
    for i in range(15):  # Create 15 assignments
        teacher = random.choice(teachers)
        school_class = random.choice(classes)
        title = random.choice(assignment_titles)
        subject = random.choice(subjects)

        due_date = timezone.now() + timedelta(days=random.randint(1, 14))

        assignment, created = Assignment.objects.get_or_create(
            title=title,
            teacher=teacher,
            school_class=school_class,
            defaults={
                'description': f'Complete the {subject} assignment: {title}',
                'due_date': due_date,
                'allow_file_upload': random.choice([True, False])
            }
        )
        assignments.append(assignment)
        if created:
            print(f"Created assignment: {assignment.title} (Class: {school_class.name}, Due: {assignment.due_date.date()})")

    return assignments

def create_sample_tasks(teachers):
    """Create sample tasks for teachers."""
    print("Creating sample tasks...")

    task_titles = [
        'Grade Mathematics assignments',
        'Prepare lesson plan for next week',
        'Update student progress reports',
        'Conduct parent-teacher meeting',
        'Organize class field trip',
        'Review science lab submissions',
        'Plan semester exam schedule',
        'Update attendance records',
        'Prepare teaching materials',
        'Conduct student assessment'
    ]

    priorities = ['low', 'medium', 'high', 'urgent']
    statuses = ['pending', 'in_progress', 'completed']

    tasks = []
    for i in range(20):  # Create 20 tasks
        teacher = random.choice(teachers)
        title = random.choice(task_titles)
        priority = random.choice(priorities)
        status = random.choice(statuses)

        due_date = timezone.now() + timedelta(days=random.randint(-5, 10))
        due_time = f"{random.randint(9, 17):02d}:{random.randint(0, 59):02d}"

        task, created = Task.objects.get_or_create(
            teacher=teacher,
            title=title,
            defaults={
                'description': f'Task: {title}',
                'priority': priority,
                'status': status,
                'due_date': due_date,
                'due_time': due_time,
                'task_type': 'general'
            }
        )
        tasks.append(task)
        if created:
            print(f"Created task: {task.title} (Priority: {task.priority}, Status: {task.status})")

    return tasks

def create_sample_attendance(students, classes):
    """Create sample attendance records."""
    print("Creating sample attendance records...")

    attendance_records = []
    today = timezone.now().date()

    # Create attendance for the last 7 days
    for days_ago in range(7):
        attendance_date = today - timedelta(days=days_ago)

        for school_class in classes:
            class_students = [s for s in students if s.school_class == school_class]

            for student in class_students:
                # 85% chance of being present
                status = 'present' if random.random() < 0.85 else 'absent'

                attendance, created = Attendance.objects.get_or_create(
                    student=student,
                    date=attendance_date,
                    defaults={
                        'status': status
                    }
                )
                if created:
                    attendance_records.append(attendance)

    print(f"Created {len(attendance_records)} attendance records")
    return attendance_records

def create_sample_fee_types():
    """Create sample fee types."""
    print("Creating sample fee types...")

    fee_types_data = [
        {'name': 'Tuition Fee', 'amount': 5000.00, 'category': 'tuition'},
        {'name': 'Library Fee', 'amount': 500.00, 'category': 'library'},
        {'name': 'Sports Fee', 'amount': 800.00, 'category': 'sports'},
        {'name': 'Transportation Fee', 'amount': 1200.00, 'category': 'transport'},
        {'name': 'Examination Fee', 'amount': 300.00, 'category': 'exam'}
    ]

    fee_types = []
    for fee_data in fee_types_data:
        fee_type, created = FeeType.objects.get_or_create(
            name=fee_data['name'],
            defaults={
                'amount': fee_data['amount'],
                'category': fee_data['category'],
                'description': f'{fee_data["name"]} for students'
            }
        )
        fee_types.append(fee_type)
        if created:
            print(f"Created fee type: {fee_type.name} (Rs.{fee_type.amount})")

    return fee_types

def create_sample_fees(students, fee_types):
    """Create sample fees for students."""
    print("Creating sample fees for students...")

    fees_created = 0
    for student in students:
        # Create 2-4 fees per student
        num_fees = random.randint(2, 4)
        selected_fee_types = random.sample(fee_types, num_fees)

        for fee_type in selected_fee_types:
            # Create fee with due date in the next 30-90 days
            due_date = timezone.now().date() + timedelta(days=random.randint(30, 90))

            fee, created = Fee.objects.get_or_create(
                student=student,
                amount=fee_type.amount,
                due_date=due_date,
                defaults={
                    'status': random.choice(['paid', 'unpaid', 'partial']),
                    'notes': f'{fee_type.name} for {student.user.get_full_name()}'
                }
            )
            if created:
                fees_created += 1
                print(f"Created fee: {fee_type.name} for {student.user.get_full_name()} - Rs.{fee.amount} (Due: {fee.due_date})")

    print(f"Total fees created: {fees_created}")
    return fees_created

def create_sample_student_1(classes, teachers):
    """Create specific sample data for Student 1."""
    print("Creating sample data for Student 1...")

    # Create Student 1 user
    user, created = User.objects.get_or_create(
        username='student1',
        defaults={
            'email': 'student1@school.com',
            'first_name': 'Student',
            'last_name': 'One',
            'role': User.Role.STUDENT
        }
    )
    if created:
        user.set_password('password123')
        user.save()

    # Get or create class for Student 1
    school_class = classes[0] if classes else SchoolClass.objects.get_or_create(
        name='Class 10-A',
        defaults={'teacher': teachers[0].user if teachers else None}
    )[0]

    # Create Student 1
    student, created = Student.objects.get_or_create(
        user=user,
        defaults={'school_class': school_class}
    )
    if created:
        print(f"Created Student 1: {student.user.get_full_name()}")

    # Create assignments for Student 1
    assignments_data = [
        {
            'title': "Mathematics Assignment - Algebra",
            'description': "Complete exercises 1-20 from Chapter 5",
            'subject': "Mathematics",
            'due_date': timezone.now() + timedelta(days=7),
            'status': 'pending'
        },
        {
            'title': "Science Lab Report",
            'description': "Write a detailed report on the chemistry experiment",
            'subject': "Chemistry",
            'due_date': timezone.now() + timedelta(days=5),
            'status': 'completed'
        },
        {
            'title': "English Literature Essay",
            'description': "Write a 1000-word essay on Shakespeare's Hamlet",
            'subject': "English",
            'due_date': timezone.now() + timedelta(days=10),
            'status': 'pending'
        }
    ]

    assignments = []
    teacher = teachers[0] if teachers else None
    for assignment_data in assignments_data:
        assignment, created = Assignment.objects.get_or_create(
            title=assignment_data['title'],
            school_class=school_class,
            teacher=teacher,
            defaults={
                'description': assignment_data['description'],
                'due_date': assignment_data['due_date'],
                'allow_file_upload': True
            }
        )
        assignments.append(assignment)
        if created:
            print(f"Created assignment: {assignment.title}")

        # Create submission for completed assignment
        if assignment_data['status'] == 'completed':
            submission, created = AssignmentSubmission.objects.get_or_create(
                assignment=assignment,
                student=student,
                defaults={
                    'status': 'submitted',
                    'text_content': 'Sample submission content',
                    'submitted_at': timezone.now() - timedelta(days=1)
                }
            )
            if created:
                print(f"Created submission for: {assignment.title}")

    # Create timetable for Student 1
    timetable_data = [
        {
            'day_of_week': 'MON',
            'start_time': '09:00',
            'end_time': '10:00',
            'subject': 'Mathematics',
            'teacher': teacher
        },
        {
            'day_of_week': 'MON',
            'start_time': '10:00',
            'end_time': '11:00',
            'subject': 'English',
            'teacher': teacher
        },
        {
            'day_of_week': 'MON',
            'start_time': '11:00',
            'end_time': '12:00',
            'subject': 'Science',
            'teacher': teacher
        }
    ]

    for tt_data in timetable_data:
        timetable, created = Timetable.objects.get_or_create(
            school_class=school_class,
            day_of_week=tt_data['day_of_week'],
            start_time=tt_data['start_time'],
            subject=tt_data['subject'],
            defaults={
                'end_time': tt_data['end_time'],
                'teacher': tt_data['teacher']
            }
        )
        if created:
            print(f"Created timetable entry: {tt_data['subject']} on {tt_data['day_of_week']}")

    # Create grades for Student 1
    grades_data = [
        {'subject': 'Mathematics', 'score': 85},
        {'subject': 'English', 'score': 92},
        {'subject': 'Science', 'score': 88},
        {'subject': 'History', 'score': 90}
    ]

    for grade_data in grades_data:
        # Find assignment for this subject
        assignment = next((a for a in assignments if grade_data['subject'].lower() in a.title.lower()), assignments[0])
        grade, created = Grade.objects.get_or_create(
            student=student,
            assignment=assignment,
            defaults={'score': grade_data['score']}
        )
        if created:
            print(f"Created grade: {grade_data['subject']} - {grade_data['score']}%")

    # Create attendance records for Student 1 (last 5 days)
    attendance_records = []
    today = timezone.now().date()
    attendance_statuses = ['present', 'present', 'present', 'present', 'absent']  # 80% attendance

    for i, status in enumerate(attendance_statuses):
        date = today - timedelta(days=i)
        attendance, created = Attendance.objects.get_or_create(
            student=student,
            date=date,
            defaults={'status': status}
        )
        if created:
            attendance_records.append(attendance)
            print(f"Created attendance: {date} - {status}")

    # Create library stats for Student 1
    library_stats, created = LibraryStats.objects.get_or_create(
        student=student,
        defaults={
            'books_borrowed': 3,
            'books_due_soon': 1,
            'books_overdue': 0
        }
    )
    if created:
        print(f"Created library stats: {library_stats.books_borrowed} books borrowed")

    # Create class rank for Student 1
    student_class_rank, created = StudentClassRank.objects.get_or_create(
        student=student,
        defaults={
            'rank': 3,
            'total_students': 25
        }
    )
    if created:
        print(f"Created class rank: {student_class_rank.rank} out of {student_class_rank.total_students}")

    # Create weekly timetable for Student 1's class
    weekly_timetable_data = [
        {
            'day_of_week': 'monday',
            'period_number': 1,
            'subject': 'Mathematics',
            'start_time': '09:00',
            'end_time': '10:00'
        },
        {
            'day_of_week': 'monday',
            'period_number': 2,
            'subject': 'English',
            'start_time': '10:00',
            'end_time': '11:00'
        },
        {
            'day_of_week': 'monday',
            'period_number': 3,
            'subject': 'Science',
            'start_time': '11:00',
            'end_time': '12:00'
        }
    ]

    for wt_data in weekly_timetable_data:
        weekly_timetable, created = WeeklyTimetable.objects.get_or_create(
            school_class=school_class,
            day_of_week=wt_data['day_of_week'],
            period_number=wt_data['period_number'],
            defaults={
                'subject': wt_data['subject'],
                'teacher': teacher,
                'start_time': wt_data['start_time'],
                'end_time': wt_data['end_time']
            }
        )
        if created:
            print(f"Created weekly timetable: {wt_data['day_of_week']} - {wt_data['subject']}")

    # Create notifications for Student 1
    notifications_data = [
        {
            'title': 'Assignment Due Soon',
            'message': 'Your Mathematics Assignment - Algebra is due in 3 days. Don\'t forget to submit it!',
            'is_read': False
        },
        {
            'title': 'Grade Posted',
            'message': 'Your grade for Science Lab Report has been posted: 88%. Great work!',
            'is_read': False
        },
        {
            'title': 'Attendance Alert',
            'message': 'Your attendance rate is 80%. Please maintain regular attendance.',
            'is_read': True
        },
        {
            'title': 'Fee Payment Reminder',
            'message': 'Your tuition fee of ₹5,000 is due on 2025-11-22. Please make the payment.',
            'is_read': False
        },
        {
            'title': 'Timetable Update',
            'message': 'Your Monday schedule has been updated. Check your timetable for changes.',
            'is_read': True
        }
    ]

    for notification_data in notifications_data:
        notification, created = Notification.objects.get_or_create(
            user=student.user,
            title=notification_data['title'],
            message=notification_data['message'],
            defaults={
                'is_read': notification_data['is_read'],
                'created_at': timezone.now() - timedelta(days=random.randint(0, 7))
            }
        )
        if created:
            print(f"Created notification: {notification.title}")

    # Create sample notifications for Student 1
    notifications_data = [
        {
            'title': 'Welcome to the School Management System',
            'message': 'Welcome! Your account has been set up successfully. You can now access your dashboard, assignments, and grades.',
            'is_read': False
        },
        {
            'title': 'Assignment Due Soon',
            'message': 'Your Mathematics Assignment - Algebra is due in 7 days. Make sure to submit it on time.',
            'is_read': False
        },
        {
            'title': 'Grade Posted',
            'message': 'Your grade for Science Lab Report has been posted. You scored 92%. Great work!',
            'is_read': True
        },
        {
            'title': 'Timetable Update',
            'message': 'Your class timetable has been updated. Please check your schedule for any changes.',
            'is_read': True
        }
    ]

    for notification_data in notifications_data:
        Notification.objects.get_or_create(
            user=student.user,
            title=notification_data['title'],
            defaults={
                'message': notification_data['message'],
                'is_read': notification_data['is_read']
            }
        )

    # Create sample fees for Student 1
    fee_types = FeeType.objects.all()
    if fee_types.exists():
        # Create specific fees that match the frontend expectations
        fees_data = [
            {
                'fee_type': fee_types.filter(name='Tuition Fee').first(),
                'amount': 15000.00,
                'due_date': timezone.now().date() + timedelta(days=30),
                'status': 'unpaid'
            },
            {
                'fee_type': fee_types.filter(name='Library Fee').first(),
                'amount': 500.00,
                'due_date': timezone.now().date() + timedelta(days=15),
                'status': 'paid'
            },
            {
                'fee_type': fee_types.filter(name='Examination Fee').first(),
                'amount': 300.00,
                'due_date': timezone.now().date() + timedelta(days=45),
                'status': 'unpaid'
            }
        ]

        for fee_data in fees_data:
            if fee_data['fee_type']:
                fee, created = Fee.objects.get_or_create(
                    student=student,
                    amount=fee_data['amount'],
                    due_date=fee_data['due_date'],
                    defaults={
                        'status': fee_data['status'],
                        'notes': f'{fee_data["fee_type"].name} for {student.user.get_full_name()}'
                    }
                )
                if created:
                    print(f"Created fee: {fee_data['fee_type'].name} for Student 1 - Rs.{fee.amount} (Due: {fee.due_date}, Status: {fee.status})")

                    # If fee is paid, create a payment record
                    if fee_data['status'] == 'paid':
                        payment, created = Payment.objects.get_or_create(
                            fee=fee,
                            amount=fee.amount,
                            defaults={
                                'payment_method': 'upi',
                                'status': 'completed',
                                'processed_by': None,  # No specific processor
                                'notes': f'Payment for {fee_data["fee_type"].name}'
                            }
                        )
                        if created:
                            print(f"Created payment: Rs.{payment.amount} for {fee_data['fee_type'].name}")

    print(f"Sample data for Student 1 created successfully!")
    return student

def create_sample_library_stats(students):
    """Create sample library stats for students."""
    print("Creating sample library stats...")

    for student in students[:10]:  # Create stats for first 10 students
        LibraryStats.objects.get_or_create(
            student=student,
            defaults={
                'books_borrowed': random.randint(0, 5),
                'books_due_soon': random.randint(0, 2),
                'books_overdue': random.randint(0, 1)
            }
        )

    # Special stats for Student 1
    student_1 = Student.objects.filter(user__username='student1').first()
    if student_1:
        LibraryStats.objects.get_or_create(
            student=student_1,
            defaults={
                'books_borrowed': 3,
                'books_due_soon': 1,
                'books_overdue': 0
            }
        )

    print("Library stats created successfully!")

def create_sample_class_ranks(classes):
    """Create sample class ranks for students."""
    print("Creating sample class ranks...")

    for school_class in classes:
        class_students = list(Student.objects.filter(school_class=school_class))
        if class_students:
            # Sort students by some criteria (random for demo)
            random.shuffle(class_students)
            total_students = len(class_students)

            for rank, student in enumerate(class_students, 1):
                StudentClassRank.objects.get_or_create(
                    student=student,
                    defaults={
                        'rank': rank,
                        'total_students': total_students
                    }
                )

    print("Class ranks created successfully!")

def create_sample_weekly_timetable(classes, teachers):
    """Create sample weekly timetable for classes."""
    print("Creating sample weekly timetable...")

    subjects = ['Mathematics', 'Science', 'English', 'History', 'Geography', 'Art', 'Music', 'PE']
    days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']

    for school_class in classes:
        for day_idx, day in enumerate(days):
            # Create 6 periods per day
            for period in range(1, 7):
                subject = random.choice(subjects)
                teacher = random.choice(teachers) if teachers else None

                # Calculate time slots
                start_hour = 8 + period  # 9 AM to 2 PM
                WeeklyTimetable.objects.get_or_create(
                    school_class=school_class,
                    day_of_week=day,
                    period_number=period,
                    defaults={
                        'subject': subject,
                        'teacher': teacher,
                        'start_time': f"{start_hour:02d}:00",
                        'end_time': f"{start_hour+1:02d}:00"
                    }
                )

    print("Weekly timetable created successfully!")

def create_sample_teacher_stats(teachers):
    """Create sample stats for teachers."""
    print("Creating sample teacher stats...")

    for teacher in teachers:
        # Attendance stats
        TeacherAttendanceStats.objects.get_or_create(
            teacher=teacher,
            defaults={
                'today_attendance_rate': 87.5,
                'present_today': 156,
                'late_today': 8,
                'absent_today': 22,
                'overall_attendance_rate': 91.5
            }
        )

        # Assignment stats
        TeacherAssignmentStats.objects.get_or_create(
            teacher=teacher,
            defaults={
                'total_assignments': 12,
                'pending_submissions': 8,
                'graded_assignments': 4
            }
        )

        # Reimbursement stats
        TeacherReimbursementStats.objects.get_or_create(
            teacher=teacher,
            defaults={
                'total_requested': 12500.00,
                'pending_approval': 3200.00,
                'approved_amount': 8300.00,
                'paid_amount': 6800.00
            }
        )

        # Grade stats
        TeacherGradeStats.objects.get_or_create(
            teacher=teacher,
            defaults={
                'pending_grades': 24,
                'graded_today': 8,
                'average_grade': 85.0,
                'late_submissions': 3
            }
        )

    print("Teacher stats created successfully!")

def main():
    """Main function to populate sample data."""
    print("School Management - Sample Data Population")
    print("=" * 50)

    try:
        # Create teachers
        teachers = create_sample_teachers()

        # Create classes
        classes = create_sample_classes(teachers)

        # Create students
        students = create_sample_students(classes)

        # Create specific sample data for Student 1
        student_1 = create_sample_student_1(classes, teachers)

        # Create periods
        periods = create_sample_periods()

        # Create assignments
        assignments = create_sample_assignments(teachers, classes)

        # Create tasks
        tasks = create_sample_tasks(teachers)

        # Create attendance records
        attendance = create_sample_attendance(students, classes)

        # Create fee types
        fee_types = create_sample_fee_types()

        # Create fees for students
        fees_count = create_sample_fees(students, fee_types)

        # Create dashboard stats
        create_sample_library_stats(students)
        create_sample_class_ranks(classes)
        create_sample_weekly_timetable(classes, teachers)
        create_sample_teacher_stats(teachers)

        print("\n" + "=" * 50)
        print("Sample data population completed successfully!")
        print("=" * 50)
        print(f"Created {len(teachers)} teachers")
        print(f"Created {len(classes)} classes")
        print(f"Created {len(students)} students")
        print(f"Created {len(periods)} periods")
        print(f"Created {len(assignments)} assignments")
        print(f"Created {len(tasks)} tasks")
        print(f"Created {len(attendance)} attendance records")
        print(f"Created {len(fee_types)} fee types")
        print(f"Created {fees_count} fees for students")
        print("Created dashboard stats for students and teachers")

        print("\nLogin credentials for testing:")
        print("Teachers:")
        for teacher in teachers:
            print(f"  {teacher.user.username}: password123")
        print("\nStudents:")
        print("  student1: password123 (with specific sample data)")
        for i, student in enumerate(students[:4]):
            print(f"  {student.user.username}: password123")

        print("\nTo test the student dashboard:")
        print("1. Start the Django server: python manage.py runserver")
        print("2. Start the Next.js app: cd my-app && npm run dev")
        print("3. Login as student1 with password: password123")
        print("4. Navigate to the student dashboard to see sample data")

    except Exception as e:
        print(f"Error populating sample data: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()