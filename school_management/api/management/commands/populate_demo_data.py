from django.core.management.base import BaseCommand
from django.contrib.auth.hashers import make_password
from django.utils import timezone
from decimal import Decimal
from datetime import date, timedelta
import random

from api.models import (
    School, User, UserProfile, SchoolClass, Student, Teacher,
    FeeType, Fee, Payment, PaymentGateway, FeeStructure,
    Discount, Refund, LateFee, PaymentPlan, ReimbursementType,
    Reimbursement, Task, LeaveRequest, Notification
)


class Command(BaseCommand):
    help = 'Populate the database with realistic demo data'

    def handle(self, *args, **options):
        self.stdout.write('Clearing existing data...')
        self.clear_existing_data()

        self.stdout.write('Populating demo data...')
        self.populate_schools()
        self.populate_users()
        self.populate_classes()
        self.populate_fee_types()
        self.populate_students_teachers()
        self.populate_fees()
        self.populate_payments()
        self.populate_additional_models()

        self.stdout.write(self.style.SUCCESS('Demo data populated successfully!'))

    def clear_existing_data(self):
        """Clear all existing data to avoid duplicates"""
        try:
            Refund.objects.all().delete()
            Discount.objects.all().delete()
            Payment.objects.all().delete()
            Fee.objects.all().delete()
            FeeStructure.objects.all().delete()
            PaymentGateway.objects.all().delete()
            Student.objects.all().delete()
            Teacher.objects.all().delete()
            SchoolClass.objects.all().delete()
            UserProfile.objects.all().delete()
            User.objects.all().delete()
            School.objects.all().delete()
            FeeType.objects.all().delete()
            Reimbursement.objects.all().delete()
            ReimbursementType.objects.all().delete()
            Task.objects.all().delete()
            LeaveRequest.objects.all().delete()
            Notification.objects.all().delete()
            LateFee.objects.all().delete()
            PaymentPlan.objects.all().delete()
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error clearing data: {e}'))

    def populate_schools(self):
        """Populate schools with diverse information"""
        schools_data = [
            {
                'name': 'Green Valley High School',
                'address': '123 Green Valley Road, Mumbai, Maharashtra 400001',
                'phone': '+91-22-12345678',
                'email': 'info@greenvalley.edu',
                'website': 'https://www.greenvalley.edu',
                'google_upi_id': 'greenvalley@upi',
                'razorpay_id': 'rzp_greenvalley',
                'academic_year': '2024-2025',
                'school_timings': '8:00 AM - 3:00 PM'
            },
            {
                'name': 'Sunrise Academy',
                'address': '456 Sunrise Avenue, Delhi, Delhi 110001',
                'phone': '+91-11-87654321',
                'email': 'contact@sunriseacademy.edu',
                'website': 'https://www.sunriseacademy.edu',
                'google_upi_id': 'sunrise@upi',
                'razorpay_id': 'rzp_sunrise',
                'academic_year': '2024-2025',
                'school_timings': '9:00 AM - 4:00 PM'
            },
            {
                'name': 'Blue Ridge International School',
                'address': '789 Blue Ridge Lane, Bangalore, Karnataka 560001',
                'phone': '+91-80-11223344',
                'email': 'admin@blueridge.edu',
                'website': 'https://www.blueridge.edu',
                'google_upi_id': 'blueridge@upi',
                'razorpay_id': 'rzp_blueridge',
                'academic_year': '2024-2025',
                'school_timings': '8:30 AM - 3:30 PM'
            }
        ]

        for school_data in schools_data:
            School.objects.create(**school_data)

        self.stdout.write(f'Created {len(schools_data)} schools')

    def populate_users(self):
        """Populate users with different roles"""
        users_data = [
            # Principals
            {'username': 'principal1', 'first_name': 'Rajesh', 'last_name': 'Sharma', 'email': 'rajesh@greenvalley.edu', 'role': User.Role.PRINCIPAL, 'password': make_password('password123')},
            {'username': 'principal2', 'first_name': 'Priya', 'last_name': 'Patel', 'email': 'priya@sunriseacademy.edu', 'role': User.Role.PRINCIPAL, 'password': make_password('password123')},
            {'username': 'principal3', 'first_name': 'Amit', 'last_name': 'Kumar', 'email': 'amit@blueridge.edu', 'role': User.Role.PRINCIPAL, 'password': make_password('password123')},

            # Teachers
            {'username': 'teacher1', 'first_name': 'Anjali', 'last_name': 'Verma', 'email': 'anjali@greenvalley.edu', 'role': User.Role.TEACHER, 'password': make_password('password123')},
            {'username': 'teacher2', 'first_name': 'Ravi', 'last_name': 'Singh', 'email': 'ravi@greenvalley.edu', 'role': User.Role.TEACHER, 'password': make_password('password123')},
            {'username': 'teacher3', 'first_name': 'Meera', 'last_name': 'Gupta', 'email': 'meera@sunriseacademy.edu', 'role': User.Role.TEACHER, 'password': make_password('password123')},
            {'username': 'teacher4', 'first_name': 'Suresh', 'last_name': 'Reddy', 'email': 'suresh@sunriseacademy.edu', 'role': User.Role.TEACHER, 'password': make_password('password123')},
            {'username': 'teacher5', 'first_name': 'Kavita', 'last_name': 'Joshi', 'email': 'kavita@blueridge.edu', 'role': User.Role.TEACHER, 'password': make_password('password123')},
            {'username': 'teacher6', 'first_name': 'Vikram', 'last_name': 'Shah', 'email': 'vikram@blueridge.edu', 'role': User.Role.TEACHER, 'password': make_password('password123')},

            # Students
            {'username': 'student1', 'first_name': 'Arjun', 'last_name': 'Mehta', 'email': 'arjun@student.com', 'role': User.Role.STUDENT, 'password': make_password('password123')},
            {'username': 'student2', 'first_name': 'Sneha', 'last_name': 'Rao', 'email': 'sneha@student.com', 'role': User.Role.STUDENT, 'password': make_password('password123')},
            {'username': 'student3', 'first_name': 'Karan', 'last_name': 'Agarwal', 'email': 'karan@student.com', 'role': User.Role.STUDENT, 'password': make_password('password123')},
            {'username': 'student4', 'first_name': 'Pooja', 'last_name': 'Nair', 'email': 'pooja@student.com', 'role': User.Role.STUDENT, 'password': make_password('password123')},
            {'username': 'student5', 'first_name': 'Rohit', 'last_name': 'Chopra', 'email': 'rohit@student.com', 'role': User.Role.STUDENT, 'password': make_password('password123')},
            {'username': 'student6', 'first_name': 'Ananya', 'last_name': 'Das', 'email': 'ananya@student.com', 'role': User.Role.STUDENT, 'password': make_password('password123')},
            {'username': 'student7', 'first_name': 'Vishal', 'last_name': 'Yadav', 'email': 'vishal@student.com', 'role': User.Role.STUDENT, 'password': make_password('password123')},
            {'username': 'student8', 'first_name': 'Maya', 'last_name': 'Iyer', 'email': 'maya@student.com', 'role': User.Role.STUDENT, 'password': make_password('password123')},
            {'username': 'student9', 'first_name': 'Aryan', 'last_name': 'Jain', 'email': 'aryan@student.com', 'role': User.Role.STUDENT, 'password': make_password('password123')},
            {'username': 'student10', 'first_name': 'Simran', 'last_name': 'Khan', 'email': 'simran@student.com', 'role': User.Role.STUDENT, 'password': make_password('password123')},
        ]

        for user_data in users_data:
            User.objects.create(**user_data)

        # Create user profiles
        for user in User.objects.all():
            UserProfile.objects.create(
                user=user,
                phone=f'+91-{random.randint(7000000000, 9999999999)}',
                address=f'{random.randint(1, 999)} {random.choice(["Main St", "Park Ave", "Elm St", "Oak Rd"])}, {random.choice(["Mumbai", "Delhi", "Bangalore"])}',
                class_name=random.choice(['10A', '10B', '11A', '11B', '12A', '12B']) if user.role == User.Role.STUDENT else '',
                subject=random.choice(['Mathematics', 'Science', 'English', 'History', 'Geography']) if user.role == User.Role.TEACHER else ''
            )

        self.stdout.write(f'Created {len(users_data)} users with profiles')

    def populate_classes(self):
        """Populate school classes"""
        schools = list(School.objects.all())
        teachers = list(User.objects.filter(role=User.Role.TEACHER))

        classes_data = [
            {'name': 'Class 10A', 'teacher': teachers[0]},
            {'name': 'Class 10B', 'teacher': teachers[1]},
            {'name': 'Class 11A', 'teacher': teachers[2]},
            {'name': 'Class 11B', 'teacher': teachers[3]},
            {'name': 'Class 12A', 'teacher': teachers[4]},
            {'name': 'Class 12B', 'teacher': teachers[5]},
        ]

        for class_data in classes_data:
            SchoolClass.objects.create(**class_data)

        self.stdout.write(f'Created {len(classes_data)} school classes')

    def populate_fee_types(self):
        """Populate fee types with realistic amounts"""
        fee_types_data = [
            {'name': 'Tuition Fee', 'description': 'Monthly tuition fee', 'amount': Decimal('5000.00'), 'category': FeeType.Category.TUITION},
            {'name': 'Library Fee', 'description': 'Annual library membership', 'amount': Decimal('500.00'), 'category': FeeType.Category.ANNUAL},
            {'name': 'Hostel Fee', 'description': 'Monthly hostel accommodation', 'amount': Decimal('3000.00'), 'category': FeeType.Category.OTHER},
            {'name': 'Transport Fee', 'description': 'Monthly transport service', 'amount': Decimal('1500.00'), 'category': FeeType.Category.TRANSPORT},
            {'name': 'Admission Fee', 'description': 'One-time admission fee', 'amount': Decimal('10000.00'), 'category': FeeType.Category.ADMISSION},
            {'name': 'Sports Fee', 'description': 'Annual sports facilities', 'amount': Decimal('800.00'), 'category': FeeType.Category.ANNUAL},
            {'name': 'Computer Lab Fee', 'description': 'Monthly computer lab usage', 'amount': Decimal('600.00'), 'category': FeeType.Category.OTHER},
        ]

        for fee_type_data in fee_types_data:
            FeeType.objects.create(**fee_type_data)

        self.stdout.write(f'Created {len(fee_types_data)} fee types')

    def populate_students_teachers(self):
        """Populate students and teachers"""
        classes = list(SchoolClass.objects.all())
        students = User.objects.filter(role=User.Role.STUDENT)
        teachers = User.objects.filter(role=User.Role.TEACHER)

        for i, student_user in enumerate(students):
            Student.objects.create(
                user=student_user,
                school_class=classes[i % len(classes)]
            )

        for teacher_user in teachers:
            Teacher.objects.create(
                user=teacher_user,
                salary=Decimal(random.randint(30000, 60000))
            )

        self.stdout.write(f'Created {students.count()} students and {teachers.count()} teachers')

    def populate_fees(self):
        """Populate fees with diverse statuses and histories"""
        students = list(Student.objects.all())
        fee_types = list(FeeType.objects.all())
        today = date.today()

        for student in students:
            # Assign 3-5 fees per student
            num_fees = random.randint(3, 5)
            assigned_fee_types = random.sample(fee_types, num_fees)

            for fee_type in assigned_fee_types:
                due_date = today + timedelta(days=random.randint(-30, 60))
                amount = fee_type.amount + Decimal(random.uniform(-500, 500))  # Slight variation

                status_choices = [Fee.Status.UNPAID, Fee.Status.PARTIAL, Fee.Status.PAID]
                status = random.choice(status_choices)

                fee = Fee.objects.create(
                    student=student,
                    amount=amount,
                    due_date=due_date,
                    status=status,
                    waived_amount=Decimal('0.00')
                )

                # Add overdue date for some fees
                if due_date < today and status != Fee.Status.PAID:
                    fee.overdue_date = due_date + timedelta(days=30)
                    fee.save()

        self.stdout.write(f'Created fees for {len(students)} students')

    def populate_payments(self):
        """Populate payments with different methods and statuses"""
        fees = list(Fee.objects.all())
        users = list(User.objects.all())

        for fee in fees:
            if fee.status == Fee.Status.PAID:
                # Full payment
                Payment.objects.create(
                    fee=fee,
                    amount=fee.amount,
                    payment_method=random.choice([Payment.PaymentMethod.UPI, Payment.PaymentMethod.CASH, Payment.PaymentMethod.BANK_TRANSFER]),
                    transaction_id=f'TXN{random.randint(100000, 999999)}',
                    status=Payment.Status.COMPLETED,
                    payment_date=timezone.now() - timedelta(days=random.randint(1, 30)),
                    notes='Full payment',
                    processed_by=random.choice(users)
                )
            elif fee.status == Fee.Status.PARTIAL:
                # Partial payments
                remaining = fee.amount
                while remaining > 0:
                    payment_amount = min(remaining, Decimal(random.uniform(1000, remaining)))
                    Payment.objects.create(
                        fee=fee,
                        amount=payment_amount,
                        payment_method=random.choice(list(Payment.PaymentMethod)),
                        transaction_id=f'TXN{random.randint(100000, 999999)}',
                        status=random.choice([Payment.Status.COMPLETED, Payment.Status.PENDING, Payment.Status.FAILED]),
                        payment_date=timezone.now() - timedelta(days=random.randint(1, 30)),
                        notes=f'Partial payment of ₹{payment_amount}',
                        processed_by=random.choice(users)
                    )
                    remaining -= payment_amount

        self.stdout.write('Created payments for fees')

    def populate_additional_models(self):
        """Populate additional models like PaymentGateway, FeeStructure, etc."""
        schools = list(School.objects.all())
        fee_types = list(FeeType.objects.all())
        classes = list(SchoolClass.objects.all())
        students = list(Student.objects.all())
        payments = list(Payment.objects.all())
        users = list(User.objects.all())

        # PaymentGateways
        for school in schools:
            PaymentGateway.objects.create(
                school=school,
                gateway_type=random.choice(['Razorpay', 'PayU', 'Stripe']),
                api_key=f'api_key_{school.id}',
                secret_key=f'secret_key_{school.id}',
                is_active=True
            )

        # FeeStructures
        for school in schools:
            for fee_type in fee_types:
                for school_class in classes:
                    FeeStructure.objects.create(
                        school=school,
                        fee_type=fee_type,
                        school_class=school_class,
                        amount=fee_type.amount + Decimal(random.uniform(-200, 200)),
                        is_active=True
                    )

        # Discounts
        for _ in range(10):
            student = random.choice(students)
            fee = random.choice(Fee.objects.filter(student=student))
            Discount.objects.create(
                student=student,
                fee=fee,
                discount_type=random.choice(['percentage', 'amount']),
                value=Decimal(random.uniform(5, 20)),
                reason='Merit-based discount',
                applied_by=random.choice(users)
            )

        # Refunds
        for _ in range(5):
            payment = random.choice(payments)
            Refund.objects.create(
                payment=payment,
                amount=Decimal(random.uniform(500, payment.amount)),
                reason='Student withdrawal',
                status=random.choice(['Pending', 'Processed', 'Rejected']),
                processed_by=random.choice(users)
            )

        # LateFees
        overdue_fees = Fee.objects.filter(overdue_date__isnull=False)
        for fee in overdue_fees[:5]:
            LateFee.objects.create(
                fee=fee,
                penalty_amount=Decimal(random.uniform(100, 500)),
                due_date=fee.overdue_date
            )

        # PaymentPlans
        for _ in range(3):
            fee = random.choice(Fee.objects.filter(status=Fee.Status.UNPAID))
            PaymentPlan.objects.create(
                fee=fee,
                total_installments=random.randint(3, 6),
                installment_amount=fee.amount / random.randint(3, 6),
                start_date=date.today(),
                end_date=date.today() + timedelta(days=180)
            )

        # ReimbursementTypes
        reimbursement_types = [
            {'name': 'Travel Expenses', 'description': 'Reimbursement for travel', 'max_amount': Decimal('5000.00')},
            {'name': 'Stationery', 'description': 'Office supplies', 'max_amount': Decimal('2000.00')},
            {'name': 'Training', 'description': 'Professional development', 'max_amount': Decimal('10000.00')},
        ]
        for rt_data in reimbursement_types:
            ReimbursementType.objects.create(**rt_data)

        # Reimbursements
        teachers = list(Teacher.objects.all())
        reimbursement_types = list(ReimbursementType.objects.all())
        for _ in range(5):
            teacher = random.choice(teachers)
            rt = random.choice(reimbursement_types)
            Reimbursement.objects.create(
                teacher=teacher,
                reimbursement_type=rt,
                amount=Decimal(random.uniform(500, float(rt.max_amount or 5000))),
                description='Business expense',
                status=random.choice(list(Reimbursement.Status))
            )

        # Tasks
        for teacher in teachers[:3]:
            Task.objects.create(
                teacher=teacher,
                title='Prepare lesson plan',
                description='Prepare mathematics lesson for next week',
                task_type=Task.TaskType.LESSON_PLANNING,
                priority=random.choice(list(Task.Priority)),
                status=random.choice(list(Task.Status)),
                due_date=date.today() + timedelta(days=random.randint(1, 7))
            )

        # LeaveRequests
        for _ in range(5):
            user = random.choice(users)
            LeaveRequest.objects.create(
                user=user,
                start_date=date.today() + timedelta(days=random.randint(1, 30)),
                end_date=date.today() + timedelta(days=random.randint(1, 30) + random.randint(1, 5)),
                reason='Personal leave',
                status=random.choice(list(LeaveRequest.Status))
            )

        # Notifications
        for _ in range(10):
            user = random.choice(users)
            Notification.objects.create(
                user=user,
                title='Fee Reminder',
                message='Your tuition fee is due soon.',
                is_read=random.choice([True, False])
            )

        self.stdout.write('Populated additional models with demo data')