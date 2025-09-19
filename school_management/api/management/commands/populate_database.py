#!/usr/bin/env python
"""
Django management command to populate the school management database with comprehensive sample data.

This command creates realistic sample data for all models in the school management system,
including detailed student information, assignments, grades, fees, attendance records,
leave requests, notifications, and tasks.

Usage:
    python manage.py populate_database [--classes=10] [--students-per-class=30] [--clear]

Options:
    --classes: Number of classes to create (default: 10)
    --students-per-class: Number of students per class (default: 30)
    --clear: Clear existing data before population
"""

import os
import sys
import random
import logging
from datetime import date, time, datetime, timedelta
from decimal import Decimal
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone
from django.contrib.auth.hashers import make_password

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Add the project root to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'school_management.settings')

import django
django.setup()

from api.models import *

class Command(BaseCommand):
    help = 'Populate the school management database with comprehensive sample data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--classes',
            type=int,
            default=10,
            help='Number of classes to create (default: 10)'
        )
        parser.add_argument(
            '--students-per-class',
            type=int,
            default=30,
            help='Number of students per class (default: 30)'
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing data before population'
        )

    def handle(self, *args, **options):
        num_classes = options['classes']
        students_per_class = options['students_per_class']
        clear_data = options['clear']

        self.stdout.write(
            self.style.SUCCESS(f'Starting database population with {num_classes} classes and {students_per_class} students per class')
        )

        try:
            with transaction.atomic():
                if clear_data:
                    self.clear_existing_data()

                # Create school and settings
                school = self.create_school()

                # Create periods
                periods = self.create_periods()

                # Create principal
                principal = self.create_principal(school)

                # Create classes and teachers
                classes_and_teachers = self.create_classes_and_teachers(num_classes, school)

                # Create students
                students = self.create_students(classes_and_teachers, students_per_class)

                # Create timetables
                self.create_timetables(classes_and_teachers, periods)

                # Create assignments and grades
                self.create_assignments_and_grades(classes_and_teachers, students)

                # Create fees and payments
                self.create_fees_and_payments(students)

                # Create attendance records
                self.create_attendance_records(students)

                # Create leave requests
                self.create_leave_requests(classes_and_teachers)

                # Create notifications
                self.create_notifications(students, classes_and_teachers)

                # Create tasks
                self.create_tasks(classes_and_teachers)

                # Create school settings
                self.create_school_settings(school)

            self.stdout.write(
                self.style.SUCCESS(
                    f'Successfully populated database with:\n'
                    f'- 1 School\n'
                    f'- 1 Principal\n'
                    f'- {num_classes} Classes\n'
                    f'- {num_classes} Teachers\n'
                    f'- {num_classes * students_per_class} Students\n'
                    f'- {len(periods)} Periods\n'
                    f'- Comprehensive related data (assignments, grades, fees, attendance, etc.)'
                )
            )

        except Exception as e:
            logger.error(f"Error during database population: {e}")
            raise CommandError(f"Database population failed: {e}")

    def clear_existing_data(self):
        """Clear all existing data from the database."""
        logger.info("Clearing existing data...")

        # Clear in reverse dependency order
        SchoolSetting.objects.all().delete()
        Payment.objects.all().delete()
        Fee.objects.all().delete()
        Grade.objects.all().delete()
        Assignment.objects.all().delete()
        Attendance.objects.all().delete()
        Timetable.objects.all().delete()
        Task.objects.all().delete()
        LeaveRequest.objects.all().delete()
        Notification.objects.all().delete()
        Student.objects.all().delete()
        Teacher.objects.all().delete()
        User.objects.all().delete()
        SchoolClass.objects.all().delete()
        Period.objects.all().delete()
        FeeType.objects.all().delete()
        School.objects.all().delete()

        logger.info("Existing data cleared successfully")

    def create_school(self):
        """Create the main school record."""
        logger.info("Creating school...")

        school, created = School.objects.get_or_create(
            name="Springfield High School",
            defaults={
                'address': "123 Education Street, Springfield, IL 62701",
                'phone': "+1-555-0123",
                'email': "info@springfieldhigh.edu",
                'website': "https://www.springfieldhigh.edu",
                'academic_year': "2024-2025",
                'school_timings': "8:00 AM - 3:00 PM"
            }
        )

        if created:
            logger.info(f"Created school: {school.name}")
        else:
            logger.info(f"School already exists: {school.name}")

        return school

    def create_periods(self):
        """Create school periods."""
        logger.info("Creating school periods...")

        periods_data = [
            {'number': 1, 'start': time(8, 0), 'end': time(8, 45)},
            {'number': 2, 'start': time(8, 45), 'end': time(9, 30)},
            {'number': 3, 'start': time(9, 30), 'end': time(10, 15)},
            {'number': 4, 'start': time(10, 15), 'end': time(11, 0)},
            {'number': 5, 'start': time(11, 0), 'end': time(11, 45)},
            {'number': 6, 'start': time(11, 45), 'end': time(12, 30)},
            {'number': 7, 'start': time(12, 30), 'end': time(13, 15)},
            {'number': 8, 'start': time(13, 15), 'end': time(14, 0)},
        ]

        periods = []
        for period_data in periods_data:
            period, created = Period.objects.get_or_create(
                period_number=period_data['number'],
                defaults={
                    'start_time': period_data['start'],
                    'end_time': period_data['end']
                }
            )
            periods.append(period)
            if created:
                logger.info(f"Created period {period.period_number}: {period.start_time} - {period.end_time}")

        return periods

    def create_principal(self, school):
        """Create the school principal."""
        logger.info("Creating principal...")

        principal_user, created = User.objects.get_or_create(
            username='principal',
            defaults={
                'email': 'principal@springfieldhigh.edu',
                'first_name': 'Dr. John',
                'last_name': 'Smith',
                'role': User.Role.PRINCIPAL
            }
        )

        if created:
            principal_user.set_password('password123')
            principal_user.save()

            # Create user profile
            UserProfile.objects.get_or_create(
                user=principal_user,
                defaults={
                    'phone': '+1-555-0100',
                    'address': '456 Principal Avenue, Springfield, IL 62701'
                }
            )

            logger.info(f"Created principal: {principal_user.get_full_name()}")

        return principal_user

    def create_classes_and_teachers(self, num_classes, school):
        """Create classes and their teachers."""
        logger.info(f"Creating {num_classes} classes and teachers...")

        subjects = [
            "Mathematics", "English", "Science", "History", "Geography",
            "Physics", "Chemistry", "Biology", "Computer Science", "Physical Education",
            "Art", "Music", "Economics", "Psychology", "Philosophy"
        ]

        classes_and_teachers = []

        for i in range(1, num_classes + 1):
            # Create class
            class_obj, created = SchoolClass.objects.get_or_create(
                name=f"Class {i}"
            )

            # Create teacher for this class
            teacher_user, created = User.objects.get_or_create(
                username=f'teacher{i}',
                defaults={
                    'email': f'teacher{i}@springfieldhigh.edu',
                    'first_name': f'Teacher{i}',
                    'last_name': 'Johnson',
                    'role': User.Role.TEACHER
                }
            )

            if created:
                teacher_user.set_password('password123')
                teacher_user.save()

                # Create teacher profile
                teacher = Teacher.objects.create(
                    user=teacher_user,
                    salary=Decimal(random.randint(40000, 80000))
                )

                # Create user profile
                UserProfile.objects.get_or_create(
                    user=teacher_user,
                    defaults={
                        'phone': f'+1-555-{1000+i:04d}',
                        'address': f'{100+i} Teacher Lane, Springfield, IL 62701',
                        'subject': subjects[i % len(subjects)]
                    }
                )

                # Assign teacher to class
                class_obj.teacher = teacher_user
                class_obj.save()

                classes_and_teachers.append((class_obj, teacher))
                logger.info(f"Created class {class_obj.name} with teacher {teacher_user.get_full_name()}")

        return classes_and_teachers

    def create_students(self, classes_and_teachers, students_per_class):
        """Create students for each class."""
        logger.info(f"Creating {len(classes_and_teachers) * students_per_class} students...")

        students = []
        first_names = [
            "Alice", "Bob", "Charlie", "Diana", "Edward", "Fiona", "George", "Helen",
            "Ian", "Julia", "Kevin", "Laura", "Michael", "Nancy", "Oliver", "Paula",
            "Quincy", "Rachel", "Steven", "Tina", "Ulysses", "Victoria", "William",
            "Xena", "Yasmine", "Zachary", "Aaron", "Betty", "Carl", "Deborah"
        ]

        last_names = [
            "Anderson", "Brown", "Clark", "Davis", "Evans", "Foster", "Garcia", "Harris",
            "Irwin", "Johnson", "King", "Lewis", "Miller", "Nelson", "Owens", "Parker",
            "Quinn", "Roberts", "Smith", "Taylor", "Underwood", "Vargas", "Williams",
            "Xavier", "Young", "Zimmerman"
        ]

        for class_idx, (class_obj, teacher) in enumerate(classes_and_teachers):
            class_students = []

            for student_idx in range(students_per_class):
                # Create unique username: student + class_id + student_number
                username = f"student{class_obj.id:02d}{student_idx+1:02d}"

                # Generate random personal details
                first_name = random.choice(first_names)
                last_name = random.choice(last_names)

                # Create user account
                student_user, created = User.objects.get_or_create(
                    username=username,
                    defaults={
                        'email': f'{username}@springfieldhigh.edu',
                        'first_name': first_name,
                        'last_name': last_name,
                        'role': User.Role.STUDENT
                    }
                )

                if created:
                    student_user.set_password('password123')
                    student_user.save()

                    # Create student profile
                    student = Student.objects.create(
                        user=student_user,
                        school_class=class_obj
                    )

                    # Create detailed user profile with more realistic data
                    birth_date = date(
                        random.randint(2008, 2010),  # Ages 14-16
                        random.randint(1, 12),
                        random.randint(1, 28)
                    )

                    UserProfile.objects.get_or_create(
                        user=student_user,
                        defaults={
                            'phone': f'+1-555-{2000 + (class_idx * students_per_class) + student_idx + 1:04d}',
                            'address': f'{200 + (class_idx * students_per_class) + student_idx + 1} Student Street, Springfield, IL 62701',
                            'class_name': class_obj.name
                        }
                    )

                    class_students.append(student)
                    students.append(student)
                else:
                    logger.warning(f"Student {username} already exists, skipping...")

            logger.info(f"Created {len(class_students)} students for {class_obj.name}")

        return students

    def create_timetables(self, classes_and_teachers, periods):
        """Create timetable entries for classes."""
        logger.info("Creating timetables...")

        subjects = [
            "Mathematics", "English", "Science", "History", "Geography",
            "Physics", "Chemistry", "Biology", "Computer Science", "Physical Education"
        ]

        days = ['MON', 'TUE', 'WED', 'THU', 'FRI']

        for class_obj, teacher in classes_and_teachers:
            # Create timetable entries for each day and period
            for day in days:
                # Assign different subjects to different periods
                available_periods = periods[:6]  # Use first 6 periods for classes

                for period in available_periods:
                    subject = random.choice(subjects)

                    # Use the Teacher instance, not the User instance
                    Timetable.objects.get_or_create(
                        school_class=class_obj,
                        day_of_week=day,
                        start_time=period.start_time,
                        end_time=period.end_time,
                        defaults={
                            'subject': subject,
                            'teacher': teacher  # Use Teacher instance
                        }
                    )

        logger.info("Timetables created successfully")

    def create_assignments_and_grades(self, classes_and_teachers, students):
        """Create assignments and grades for students."""
        logger.info("Creating assignments and grades...")

        assignment_titles = [
            "Chapter 5 Exercises", "Research Project", "Lab Report", "Essay Writing",
            "Group Presentation", "Quiz Preparation", "Homework Assignment",
            "Final Project", "Mid-term Assessment", "Class Participation"
        ]

        for class_obj, teacher in classes_and_teachers:
            # Create 3-5 assignments per class
            num_assignments = random.randint(3, 5)

            for i in range(num_assignments):
                due_date = timezone.now().date() + timedelta(days=random.randint(7, 30))

                assignment = Assignment.objects.create(
                    title=random.choice(assignment_titles),
                    description=f"Complete the {random.choice(assignment_titles).lower()} for {class_obj.name}",
                    due_date=due_date,
                    school_class=class_obj
                )

                # Create grades for all students in the class
                class_students = [s for s in students if s.school_class == class_obj]

                for student in class_students:
                    # Generate random grade between 60-100
                    score = random.randint(60, 100)

                    Grade.objects.create(
                        student=student,
                        assignment=assignment,
                        score=score
                    )

        logger.info("Assignments and grades created successfully")

    def create_fees_and_payments(self, students):
        """Create fee types, fees, and payments."""
        logger.info("Creating fees and payments...")

        # Create fee types
        fee_types_data = [
            {'name': 'Tuition Fee', 'amount': Decimal('5000.00'), 'category': 'Tuition'},
            {'name': 'Transportation Fee', 'amount': Decimal('800.00'), 'category': 'Transport'},
            {'name': 'Library Fee', 'amount': Decimal('200.00'), 'category': 'Other'},
            {'name': 'Sports Fee', 'amount': Decimal('300.00'), 'category': 'Other'},
            {'name': 'Examination Fee', 'amount': Decimal('150.00'), 'category': 'Other'},
        ]

        fee_types = []
        for fee_data in fee_types_data:
            fee_type, created = FeeType.objects.get_or_create(
                name=fee_data['name'],
                defaults={
                    'description': f"{fee_data['name']} for the academic year",
                    'amount': fee_data['amount'],
                    'category': fee_data['category']
                }
            )
            fee_types.append(fee_type)

        # Create fees for students
        for student in students:
            # Each student gets 2-4 different fee types
            student_fee_types = random.sample(fee_types, random.randint(2, 4))

            for fee_type in student_fee_types:
                due_date = timezone.now().date() + timedelta(days=random.randint(30, 90))

                fee = Fee.objects.create(
                    student=student,
                    amount=fee_type.amount,
                    due_date=due_date,
                    status=random.choice(['paid', 'unpaid', 'partial'])
                )

                # Create payments for paid fees
                if fee.status in ['paid', 'partial']:
                    payment_amount = fee.amount if fee.status == 'paid' else fee.amount * Decimal('0.5')

                    Payment.objects.create(
                        fee=fee,
                        amount=payment_amount,
                        payment_method=random.choice(['upi', 'cash', 'bank_transfer']),
                        transaction_id=f"TXN{random.randint(100000, 999999)}",
                        status='completed',
                        processed_by=User.objects.filter(role=User.Role.PRINCIPAL).first()
                    )

        logger.info("Fees and payments created successfully")

    def create_attendance_records(self, students):
        """Create attendance records for students."""
        logger.info("Creating attendance records...")

        # Create attendance for the last 30 days
        base_date = timezone.now().date() - timedelta(days=30)

        attendance_records = []
        for i in range(30):
            attendance_date = base_date + timedelta(days=i)

            # Skip weekends
            if attendance_date.weekday() >= 5:  # Saturday = 5, Sunday = 6
                continue

            for student in students:
                # 90% attendance rate on average
                status = random.choices(
                    ['present', 'absent', 'late'],
                    weights=[85, 10, 5]
                )[0]

                attendance_records.append(
                    Attendance(
                        student=student,
                        date=attendance_date,
                        status=status
                    )
                )

        # Bulk create for efficiency
        Attendance.objects.bulk_create(attendance_records, batch_size=1000)
        logger.info(f"Created {len(attendance_records)} attendance records")

    def create_leave_requests(self, classes_and_teachers):
        """Create leave requests for teachers."""
        logger.info("Creating leave requests...")

        for class_obj, teacher in classes_and_teachers:
            # Create 1-3 leave requests per teacher
            num_leaves = random.randint(1, 3)

            for i in range(num_leaves):
                start_date = timezone.now().date() + timedelta(days=random.randint(7, 60))
                end_date = start_date + timedelta(days=random.randint(1, 5))

                LeaveRequest.objects.create(
                    user=teacher.user,
                    start_date=start_date,
                    end_date=end_date,
                    reason=random.choice([
                        "Medical leave",
                        "Family emergency",
                        "Personal matters",
                        "Professional development",
                        "Vacation"
                    ]),
                    status=random.choice(['pending', 'approved', 'rejected'])
                )

        logger.info("Leave requests created successfully")

    def create_notifications(self, students, classes_and_teachers):
        """Create notifications for users."""
        logger.info("Creating notifications...")

        notification_templates = [
            ("Fee Payment Reminder", "Your fee payment is due soon. Please make the payment to avoid penalties."),
            ("Assignment Due", "You have an assignment due in the next few days. Please complete it on time."),
            ("Exam Schedule", "Your examination schedule has been published. Check the timetable for details."),
            ("Parent-Teacher Meeting", "A parent-teacher meeting is scheduled for next week."),
            ("Holiday Notice", "School will remain closed for the upcoming holiday."),
            ("Grade Published", "Your latest grades have been published. Check your academic record."),
            ("Event Announcement", "An important school event is coming up. Stay tuned for more details."),
        ]

        # Create notifications for students
        for student in random.sample(students, min(50, len(students))):  # Create for 50 random students
            template = random.choice(notification_templates)
            Notification.objects.create(
                user=student.user,
                title=template[0],
                message=template[1]
            )

        # Create notifications for teachers
        for class_obj, teacher in classes_and_teachers:
            template = random.choice(notification_templates)
            Notification.objects.create(
                user=teacher.user,
                title=template[0],
                message=template[1]
            )

        logger.info("Notifications created successfully")

    def create_tasks(self, classes_and_teachers):
        """Create tasks for teachers."""
        logger.info("Creating teacher tasks...")

        task_templates = [
            ("Prepare lesson plan", "lesson_planning", "Prepare detailed lesson plan for upcoming classes"),
            ("Grade assignments", "grade_assignments", "Review and grade submitted assignments"),
            ("Conduct parent meetings", "parent_meetings", "Meet with parents to discuss student progress"),
            ("Update attendance", "attendance_marking", "Mark attendance for today's classes"),
            ("Prepare class materials", "class_preparation", "Prepare teaching materials and resources"),
            ("Organize lab session", "class_preparation", "Set up equipment for science lab session"),
            ("Review student performance", "administrative", "Analyze student performance data"),
            ("Update curriculum", "administrative", "Update course curriculum and syllabus"),
        ]

        for class_obj, teacher in classes_and_teachers:
            # Create 3-5 tasks per teacher
            num_tasks = random.randint(3, 5)

            for i in range(num_tasks):
                template = random.choice(task_templates)
                due_date = timezone.now().date() + timedelta(days=random.randint(1, 14))
                due_time = time(random.randint(9, 16), random.choice([0, 30]))

                Task.objects.create(
                    teacher=teacher,
                    title=f"{template[0]} - {class_obj.name}",
                    description=template[2],
                    task_type=template[1],
                    priority=random.choice(['low', 'medium', 'high']),
                    status=random.choice(['pending', 'in_progress', 'completed']),
                    due_date=due_date,
                    due_time=due_time
                )

        logger.info("Teacher tasks created successfully")

    def create_school_settings(self, school):
        """Create comprehensive school settings."""
        logger.info("Creating school settings...")

        settings_data = [
            # Basic settings
            {'key': 'school_motto', 'label': 'School Motto', 'value': 'Excellence in Education Through Innovation', 'setting_type': 'text'},
            {'key': 'contact_email', 'label': 'Contact Email', 'value': 'contact@springfieldhigh.edu', 'setting_type': 'email'},
            {'key': 'website_url', 'label': 'School Website', 'value': 'https://www.springfieldhigh.edu', 'setting_type': 'url'},
            {'key': 'emergency_contact', 'label': 'Emergency Contact', 'value': '+1-555-911', 'setting_type': 'text'},

            # Login settings
            {'key': 'login_methods', 'label': 'Login Methods', 'value': 'username,email', 'setting_type': 'text'},
            {'key': 'remember_login', 'label': 'Enable Remember Login', 'value': 'true', 'setting_type': 'text'},
            {'key': 'password_reset', 'label': 'Enable Password Reset', 'value': 'true', 'setting_type': 'text'},
            {'key': 'rate_limiting', 'label': 'Enable Rate Limiting', 'value': 'true', 'setting_type': 'text'},
            {'key': 'max_login_attempts', 'label': 'Max Login Attempts', 'value': '5', 'setting_type': 'text'},
            {'key': 'login_window_seconds', 'label': 'Login Window (seconds)', 'value': '300', 'setting_type': 'text'},

            # UI settings
            {'key': 'primary_color', 'label': 'Primary Color', 'value': '#3b82f6', 'setting_type': 'text'},
            {'key': 'secondary_color', 'label': 'Secondary Color', 'value': '#64748b', 'setting_type': 'text'},

            # Academic settings
            {'key': 'grading_scale', 'label': 'Grading Scale', 'value': 'A:90-100, B:80-89, C:70-79, D:60-69, F:0-59', 'setting_type': 'text'},
            {'key': 'attendance_threshold', 'label': 'Attendance Threshold (%)', 'value': '75', 'setting_type': 'text'},
            {'key': 'max_leave_days', 'label': 'Max Leave Days per Year', 'value': '15', 'setting_type': 'text'},
        ]

        for setting_data in settings_data:
            SchoolSetting.objects.get_or_create(
                school=school,
                key=setting_data['key'],
                defaults=setting_data
            )

        logger.info(f"Created {len(settings_data)} school settings")