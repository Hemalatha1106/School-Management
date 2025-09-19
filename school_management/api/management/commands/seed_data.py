# api/management/commands/seed_data.py

import random
from django.core.management.base import BaseCommand
from faker import Faker
from django.db import transaction
from datetime import timedelta
from api.models import (
    User, UserProfile, SchoolClass, Student, Teacher, FeeType, Fee,
    Attendance, LeaveRequest, Assignment, Grade, Notification, Timetable, Period, Task
)


class Command(BaseCommand):
    help = 'Seeds the database with a full set of realistic, random demo data for all models. Idempotent version.'

    @transaction.atomic
    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.SUCCESS("\n--- Seeding Demo Data (Idempotent) ---"))
        self.faker = Faker()

        # Phase 1: Create foundational data
        self.stdout.write("Phase 1: Creating foundational data...")
        self._create_principal()
        self._create_periods()
        teachers = self._create_teachers(12)
        classes = self._create_classes(teachers, 12)
        self._create_fee_types()
        self.stdout.write(self.style.SUCCESS("-> Phase 1 Complete"))

        # Phase 2: Create class-level data
        self.stdout.write("Phase 2: Creating class-level data...")
        all_teachers = list(Teacher.objects.all())
        for school_class in classes:
            self._create_realistic_timetable(school_class, all_teachers)
            self._create_assignments_for_class(school_class)
        self.stdout.write(self.style.SUCCESS("-> Phase 2 Complete"))

        # Phase 3: Create student-level data
        self.stdout.write("Phase 3: Creating students and related data...")
        all_students = self._create_students_for_classes(classes)
        self.stdout.write(self.style.SUCCESS("-> Phase 3 Complete"))

        # Phase 4: Post-creation activity
        self.stdout.write("Phase 4: Creating post-creation activity...")
        self._create_leave_requests(all_students, all_teachers)
        self._create_notifications(all_students, all_teachers)
        self._create_sample_tasks(all_teachers)
        self.stdout.write(self.style.SUCCESS("-> Phase 4 Complete"))

        self.stdout.write(self.style.SUCCESS('\nDatabase seeding complete!'))
        self.stdout.write(self.style.SUCCESS('Password for ALL users is "demo".'))

    # --------------------------
    # Foundational Data
    # --------------------------

    def _create_principal(self):
        Grade.objects.all().delete()
        Assignment.objects.all().delete()
        Attendance.objects.all().delete()
        Fee.objects.all().delete()
        FeeType.objects.all().delete()
        Notification.objects.all().delete()
        LeaveRequest.objects.all().delete()
        Timetable.objects.all().delete()
        Task.objects.all().delete()
        Student.objects.all().delete()
        Teacher.objects.all().delete()
        SchoolClass.objects.all().delete()
        UserProfile.objects.all().delete()
        User.objects.filter(is_superuser=False).delete()
        self.stdout.write("Old data deleted successfully.")


        user, created = User.objects.get_or_create(
            username='principal',
            defaults={
                'first_name': 'Admin',
                'last_name': 'Principal',
                'email': 'principal@school.edu',
                'role': User.Role.PRINCIPAL,
                'is_staff': True,
                'is_superuser': True,
            },
        )
        if created:
            user.set_password('demo')
            user.save()
            UserProfile.objects.get_or_create(
                user=user,
                defaults={'phone': self.faker.phone_number(), 'address': self.faker.address()}
            )
            self.stdout.write("  - Principal 'principal' created.")
        else:
            self.stdout.write("  - Principal 'principal' already exists.")
        return user

    def _create_periods(self):
        periods_data = [
            {'period_number': 1, 'start_time': '08:00:00', 'end_time': '08:50:00'},
            {'period_number': 2, 'start_time': '09:00:00', 'end_time': '09:50:00'},
            {'period_number': 3, 'start_time': '10:00:00', 'end_time': '10:50:00'},
            {'period_number': 4, 'start_time': '11:00:00', 'end_time': '11:50:00'},
            {'period_number': 5, 'start_time': '13:00:00', 'end_time': '13:50:00'},
            {'period_number': 6, 'start_time': '14:00:00', 'end_time': '14:50:00'},
            {'period_number': 7, 'start_time': '15:00:00', 'end_time': '15:50:00'},
            {'period_number': 8, 'start_time': '16:00:00', 'end_time': '16:50:00'},
        ]
        for data in periods_data:
            Period.objects.get_or_create(period_number=data['period_number'], defaults=data)
        self.stdout.write("  - Standard Periods ensured.")

    def _create_teachers(self, count):
        teachers = []
        subjects = [
            'Mathematics', 'Physics', 'Chemistry', 'Biology', 'History', 'Geography',
            'English', 'Art', 'Music', 'Physical Education', 'Computer Science', 'Economics'
        ]
        for i in range(count):
            username = f"teacher{i+1}"
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    'password': 'demo',
                    'first_name': self.faker.first_name(),
                    'last_name': self.faker.last_name(),
                    'email': f"{username}@school.edu",
                    'role': User.Role.TEACHER,
                }
            )
            if created:
                user.set_password('demo')
                user.save()
                UserProfile.objects.get_or_create(
                    user=user,
                    defaults={
                        'subject': subjects[i % len(subjects)],
                        'phone': self.faker.phone_number(),
                        'address': self.faker.address(),
                    }
                )
                teacher, _ = Teacher.objects.get_or_create(user=user)
                teachers.append(teacher)
        self.stdout.write(f"  - {count} Teachers ensured.")
        return Teacher.objects.all()

    def _create_classes(self, teachers, count):
        classes = []
        for i in range(count):
            teacher_user = teachers[i].user
            school_class, _ = SchoolClass.objects.get_or_create(
                name=f"Grade {i+1}",
                defaults={'teacher': teacher_user},
            )
            classes.append(school_class)
        self.stdout.write(f"  - {count} Classes ensured.")
        return classes

    def _create_fee_types(self):
        fee_types_data = [
            {'category': 'Admission', 'name': 'Registration Fee', 'amount': 500},
            {'category': 'Admission', 'name': 'Admission Fee', 'amount': 5000},
            {'category': 'Admission', 'name': 'Caution Deposit', 'amount': 2000},
            {'category': 'Annual', 'name': 'Annual Development Fee', 'amount': 3000},
            {'category': 'Annual', 'name': 'Library & Lab Fee', 'amount': 2000},
            {'category': 'Annual', 'name': 'IT Resources', 'amount': 1500},
            {'category': 'Annual', 'name': 'Activity & Sports Fee', 'amount': 2500},
            {'category': 'Tuition', 'name': 'Tuition (Pre-Primary)', 'amount': 2000},
            {'category': 'Tuition', 'name': 'Tuition (Primary)', 'amount': 3000},
            {'category': 'Transport', 'name': 'Transport (<5km)', 'amount': 1000},
            {'category': 'Transport', 'name': 'Transport (5-10km)', 'amount': 1500},
        ]
        for data in fee_types_data:
            FeeType.objects.get_or_create(name=data['name'], defaults=data)
        self.stdout.write("  - Fee structure ensured.")

    # --------------------------
    # Class-Level Data
    # --------------------------

    def _create_realistic_timetable(self, school_class, all_teachers):
        all_periods = list(Period.objects.all())
        subjects = ["Mathematics", "Physics", "Chemistry", "English", "History", "Art"]
        # Clear existing timetable entries for this class
        Timetable.objects.filter(school_class=school_class).delete()
        for day in Timetable.Day.values:
            for period in random.sample(all_periods, random.randint(5, 8)):
                Timetable.objects.get_or_create(
                    school_class=school_class,
                    day_of_week=day,
                    start_time=period.start_time,
                    end_time=period.end_time,
                    defaults={
                        'subject': random.choice(subjects),
                        'teacher': random.choice(all_teachers)
                    }
                )

    def _create_assignments_for_class(self, school_class):
        Assignment.objects.filter(school_class=school_class).delete()
        for _ in range(random.randint(3, 5)):
            Assignment.objects.create(
                school_class=school_class,
                title=self.faker.sentence(nb_words=4),
                description=self.faker.paragraph(nb_sentences=2),
                due_date=self.faker.date_between(start_date='+10d', end_date='+60d')
            )

    # --------------------------
    # Student-Level Data
    # --------------------------

    def _create_students_for_classes(self, classes):
        all_students = []
        fee_types = list(FeeType.objects.all())
        for school_class in classes:
            class_assignments = list(Assignment.objects.filter(school_class=school_class))
            # Clear existing students for this class
            Student.objects.filter(school_class=school_class).delete()
            for _ in range(random.randint(25, 35)):
                username = f"student{User.objects.filter(role=User.Role.STUDENT).count() + 1}"
                user = User.objects.create_user(
                    username=username,
                    password='demo',
                    first_name=self.faker.first_name(),
                    last_name=self.faker.last_name(),
                    email=f"{username}@school.edu",
                    role=User.Role.STUDENT
                )
                student = Student.objects.create(user=user, school_class=school_class)
                UserProfile.objects.create(
                    user=user,
                    class_name=school_class.name,
                    address=self.faker.address(),
                    phone=self.faker.phone_number()
                )
                all_students.append(student)

                for _ in range(random.randint(2, 5)):
                    Fee.objects.create(
                        student=student,
                        amount=random.choice(fee_types).amount,
                        due_date=self.faker.date_between(start_date='-45d', end_date='+45d'),
                        status=random.choice(Fee.Status.values)
                    )
                for _ in range(15):
                    Attendance.objects.get_or_create(
                        student=student,
                        date=self.faker.date_between(start_date='-30d', end_date='-1d'),
                        defaults={'status': random.choice(Attendance.Status.values)}
                    )
                if class_assignments:
                    for assignment in class_assignments:
                        Grade.objects.create(
                            student=student,
                            assignment=assignment,
                            score=random.randint(60, 100)
                        )
        self.stdout.write(f"  - Students created with full related data.")
        return all_students

    # --------------------------
    # Post-Creation Activity
    # --------------------------

    def _create_leave_requests(self, students, teachers):
        users = [s.user for s in students] + [t.user for t in teachers]
        LeaveRequest.objects.all().delete()
        for user in random.sample(users, min(len(users), 5)):
            start_date = self.faker.date_between(start_date='-10d', end_date='+10d')
            LeaveRequest.objects.create(
                user=user,
                start_date=start_date,
                end_date=start_date + timedelta(days=random.randint(1, 3)),
                reason=self.faker.sentence(),
                status=random.choice(LeaveRequest.Status.values)
            )
        self.stdout.write("  - Random leave requests created.")

    def _create_notifications(self, students, teachers):
        users = [s.user for s in students] + [t.user for t in teachers]
        Notification.objects.all().delete()
        for user in random.sample(users, min(len(users), 10)):
            Notification.objects.create(
                user=user,
                title=self.faker.sentence(nb_words=3),
                message=self.faker.paragraph(nb_sentences=1)
            )
        self.stdout.write("  - Random notifications created.")

    def _create_sample_tasks(self, teachers):
        """Create sample tasks for teachers."""
        Task.objects.all().delete()  # Clear existing tasks

        task_templates = [
            {
                'title': 'Prepare lesson plan for Mathematics',
                'description': 'Create detailed lesson plan for algebra chapter',
                'task_type': 'lesson_planning',
                'priority': 'high'
            },
            {
                'title': 'Grade assignment submissions',
                'description': 'Review and grade student assignments for the week',
                'task_type': 'grade_assignments',
                'priority': 'medium'
            },
            {
                'title': 'Update attendance records',
                'description': 'Mark attendance for today\'s classes',
                'task_type': 'attendance_marking',
                'priority': 'high'
            },
            {
                'title': 'Parent-teacher meeting preparation',
                'description': 'Prepare reports and materials for parent meetings',
                'task_type': 'parent_meetings',
                'priority': 'medium'
            },
            {
                'title': 'Class preparation for tomorrow',
                'description': 'Prepare materials and activities for next class',
                'task_type': 'class_preparation',
                'priority': 'high'
            },
            {
                'title': 'Update student progress reports',
                'description': 'Review and update individual student progress',
                'task_type': 'administrative',
                'priority': 'low'
            },
            {
                'title': 'Plan laboratory experiment',
                'description': 'Design and prepare chemistry lab experiment',
                'task_type': 'lesson_planning',
                'priority': 'medium'
            },
            {
                'title': 'Review homework submissions',
                'description': 'Check and provide feedback on homework',
                'task_type': 'grade_assignments',
                'priority': 'urgent'
            }
        ]

        tasks_created = 0
        for teacher in teachers:
            # Create 3-5 tasks per teacher
            num_tasks = random.randint(3, 5)
            selected_templates = random.sample(task_templates, num_tasks)

            for template in selected_templates:
                # Random due date within next 7 days
                due_date = self.faker.date_between(start_date='today', end_date='+7d')

                # Some tasks for today
                if random.choice([True, False]):
                    due_date = self.faker.date_between(start_date='today', end_date='today')

                Task.objects.create(
                    teacher=teacher,
                    title=template['title'],
                    description=template['description'],
                    task_type=template['task_type'],
                    priority=template['priority'],
                    due_date=due_date,
                    status=random.choice(['pending', 'in_progress', 'completed'])
                )
                tasks_created += 1

        self.stdout.write(f"  - {tasks_created} sample tasks created for {len(teachers)} teachers.")
