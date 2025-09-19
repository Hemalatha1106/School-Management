#!/usr/bin/env python
"""
Demo script to populate the school management database with realistic sample data for an Indian school.

This script performs the following operations:
1.  Clears all existing data from the database.
2.  Adds one principal record and a school record.
3.  Adds 12 class records (Class 1 through Class 12).
4.  Adds 20 teacher records with diverse subjects and assigns class teachers.
5.  Adds 9 period records, including a lunch break.
6.  Creates a full weekly timetable for each class.
7.  Adds 40 student records per class (total 480 students).
8.  Creates a comprehensive fee structure for all classes.
9.  Generates sample attendance records for the past 30 days.
10. Creates sample assignments and grades for students.
11. Adds sample leave requests for both teachers and students.
12. Creates different types of reimbursement policies.
13. Generates sample reimbursement claims for teachers.
14. Creates school-wide and class-specific notifications.

All data fields are fully populated with complete, consistent information.
Uses only fictional names and maintains data integrity within a single transaction.
"""

import os
import sys
import django
import random
from datetime import time, date, timedelta
from django.db import transaction

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'school_management.settings')
django.setup()

from api.models import (
    School, User, Period, UserProfile, SchoolClass, Student, Teacher,
    Attendance, Timetable, Assignment, AssignmentSubmission, Grade,
    FeeType, Fee, Payment, AuditLog, PaymentGateway, TransactionLog,
    FeeHistory, PaymentHistory, FeeStructure, Discount, Refund,
    LateFee, PaymentPlan, FeeReport, LeaveRequest, Notification,
    Task, ReimbursementType, Reimbursement, SchoolSetting
)

# --- Data Generation Constants ---
NUM_STUDENTS_PER_CLASS = 40
NUM_TEACHERS = 20

# --- Main Population Functions ---

def clear_all_data():
    """Remove all existing data from the database."""
    print("Clearing all existing data...")
    # The order of deletion is important to avoid foreign key constraint errors.
    # Delete objects that have foreign keys first.
    models_to_clear = [
        Payment, Grade, AssignmentSubmission, Assignment, Attendance, Timetable, Task, LeaveRequest,
        Notification, Fee, Student, Teacher, SchoolSetting, Reimbursement,
        User, SchoolClass, Period, FeeType, ReimbursementType, School
    ]
    try:
        with transaction.atomic():
            for model in models_to_clear:
                model.objects.all().delete()
        print("All data cleared successfully.")
    except Exception as e:
        print(f"Error clearing data: {e}")
        sys.exit(1)

def create_principal_and_school():
    """Create one principal and one school record."""
    print("Creating principal and school records...")
    try:
        principal_user = User.objects.create_user(
            username='principal', email='principal@springfield.edu.in',
            password='demo123', first_name='Rajesh', last_name='Sharma',
            role=User.Role.PRINCIPAL
        )
        school = School.objects.create(
            name="Springfield Public School",
            address="Sector 15, Gurgaon, Haryana - 122001",
            phone="+91-124-4567890", email="info@springfield.edu.in",
            website="https://www.springfield.edu.in", academic_year="2024-2025",
            school_timings="8:00 AM - 3:00 PM"
        )
        print(f"Created principal: {principal_user.get_full_name()}")
        print(f"Created school: {school.name}")
        return principal_user, school
    except Exception as e:
        print(f"Error creating principal/school: {e}")
        sys.exit(1)

def create_classes():
    """Create 12 class records (Class 1 to 12)."""
    print("Creating 12 class records...")
    classes = [SchoolClass.objects.create(name=f"Class {i}") for i in range(1, 13)]
    print(f"Created {len(classes)} classes.")
    return classes

def create_teachers(classes):
    """Create 20 teacher records and assign 12 of them as class teachers."""
    print(f"Creating {NUM_TEACHERS} teacher records...")
    teachers_data = [
        ("Amit", "Sharma", "Mathematics"), ("Priya", "Patel", "Physics"),
        ("Rahul", "Kumar", "Chemistry"), ("Anjali", "Gupta", "Biology"),
        ("Vikram", "Singh", "English"), ("Sneha", "Verma", "Hindi"),
        ("Arjun", "Jain", "Social Science"), ("Kavita", "Reddy", "Computer Science"),
        ("Rohan", "Nair", "Economics"), ("Pooja", "Iyer", "Accountancy"),
        ("Sanjay", "Chopra", "Business Studies"), ("Meera", "Malhotra", "Physical Education"),
        ("Sunita", "Mishra", "History"), ("Deepak", "Yadav", "Geography"),
        ("Neha", "Agarwal", "Art"), ("Raj", "Joshi", "Music"),
        ("Alok", "Tiwari", "French"), ("Geeta", "Shah", "Environmental Science"),
        ("Manoj", "Pandey", "Civics"), ("Anita", "Rao", "English Literature")
    ]
    teachers = []
    for i, (first, last, subject) in enumerate(teachers_data):
        username = f"{first.lower()}{last.lower()[:2]}{i}"
        if i == 0: username = 'teacher1'  # Predicatable username for testing

        user = User.objects.create_user(
            username=username,
            email=f'{first.lower()}.{last.lower()}@springfield.edu.in',
            password='demo123', first_name=first, last_name=last,
            role=User.Role.TEACHER
        )
        teacher = Teacher.objects.create(
            user=user, salary=45000.00 + (i * 1500)
        )

        # Create or update user profile with subject information
        UserProfile.objects.update_or_create(
            user=user,
            defaults={'subject': subject}
        )
        # Assign the first 12 teachers as class teachers
        if i < len(classes):
            class_obj = classes[i]
            class_obj.teacher = user
            class_obj.save()
            print(f"Created teacher: {user.get_full_name()} (Class Teacher for {class_obj.name}) - Subject: {subject}")
        else:
            print(f"Created teacher: {user.get_full_name()} - Subject: {subject}")
        teachers.append(teacher)
    return teachers

def create_periods():
    """Create 9 period records."""
    print("Creating period records...")
    period_times = [
        (time(8, 0), time(8, 45)), (time(8, 45), time(9, 30)),
        (time(9, 30), time(10, 15)), (time(10, 15), time(11, 0)),
        (time(11, 0), time(11, 45)), # LUNCH
        (time(11, 45), time(12, 30)), (time(12, 30), time(13, 15)),
        (time(13, 15), time(14, 0)), (time(14, 0), time(14, 45))
    ]
    periods = []
    for i, p_time in enumerate(period_times):
        period = Period.objects.create(
            period_number=i + 1, start_time=p_time[0], end_time=p_time[1]
        )
        periods.append(period)
    print(f"Created {len(periods)} periods.")
    return periods

def create_students(classes):
    """Create 40 student records per class."""
    print(f"Creating {NUM_STUDENTS_PER_CLASS} students per class...")
    # Expanded name lists for more variety
    male_first = ["Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Ayaan", "Krishna", "Ishaan"]
    female_first = ["Saanvi", "Aadya", "Kiara", "Diya", "Pari", "Ananya", "Riya", "Aarohi", "Prisha", "Ira"]
    last_names = ["Sharma", "Patel", "Kumar", "Gupta", "Singh", "Verma", "Jain", "Reddy", "Nair", "Iyer", "Chopra"]
    
    total_students = 0
    for class_obj in classes:
        for i in range(NUM_STUDENTS_PER_CLASS):
            first_name = random.choice(male_first if i % 2 == 0 else female_first)
            last_name = random.choice(last_names)
            
            username = f"{first_name.lower()[:3]}{class_obj.id:02d}{i:02d}"
            if class_obj.id == 1 and i == 0: username = 'student1' # Predictable username

            user = User.objects.create_user(
                username=username, email=f'{username}@springfield.edu.in',
                password='demo123', first_name=first_name, last_name=last_name,
                role=User.Role.STUDENT
            )
            Student.objects.create(user=user, school_class=class_obj)
        total_students += NUM_STUDENTS_PER_CLASS
        print(f"  -> Created {NUM_STUDENTS_PER_CLASS} students for {class_obj.name}")
    print(f"Total students created: {total_students}")

def create_timetable(classes, teachers, periods):
    """Create a weekly timetable for all classes."""
    print("Creating weekly timetables...")
    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]

    for class_obj in classes:
        for day in days:
            # Shuffle teachers for variety each day
            random.shuffle(teachers)
            for period in periods:
                # Assign a random teacher/subject for the period
                teacher = random.choice(teachers)
                # Get subject from user profile
                subject = teacher.user.profile.subject if hasattr(teacher.user, 'profile') and teacher.user.profile.subject else "General"
                Timetable.objects.create(
                    school_class=class_obj,
                    day_of_week=getattr(Timetable.Day, day.upper()),
                    start_time=period.start_time,
                    end_time=period.end_time,
                    subject=subject,
                    teacher=teacher
                )
        print(f"  -> Timetable created for {class_obj.name}")

def create_fee_structure(classes):
    """Create fee types and class-level fees that can be assigned to students."""
    print("Creating fee structure...")
    fee_types_data = [
        ("Tuition Fee", "Monthly academic fee", "Tuition"),
        ("Admission Fee", "One-time fee at admission", "Admission"),
        ("Sports Fee", "Annual fee for sports facilities", "Annual"),
        ("Lab Fee", "Fee for science and computer labs", "Annual"),
        ("Exam Fee", "Fee for term examinations", "Other")
    ]
    fee_types = []
    for name, desc, category in fee_types_data:
        fee_type = FeeType.objects.create(
            name=name,
            description=desc,
            amount=1000.00,  # Default amount, will be overridden per fee
            category=category
        )
        fee_types.append(fee_type)

    # Create class-level fees that can be assigned to all students in the class
    total_fees_created = 0
    for class_obj in classes:
        # Get students in this class
        students_in_class = Student.objects.filter(school_class=class_obj)
        if not students_in_class.exists():
            continue

        for fee_type in fee_types:
            # Base amount increases with class level
            base_amount = 1000 + (class_obj.id * 200) + random.randint(100, 500)
            if "Admission" in fee_type.name:
                amount = base_amount * 5
            elif "Exam" in fee_type.name:
                amount = base_amount / 2
            else:
                amount = base_amount

            # Create the same fee for all students in the class
            for student in students_in_class:
                Fee.objects.create(
                    student=student,
                    amount=round(amount, 2),
                    due_date=date(date.today().year, 8, 10)
                )
                total_fees_created += 1

        print(f"  -> Created fees for {students_in_class.count()} students in {class_obj.name}")

    print(f"Total fees created: {total_fees_created} using {len(fee_types)} fee types.")

def create_sample_attendance(classes):
    """Create attendance records for the last 30 days."""
    print("Creating sample attendance records...")
    today = date.today()
    for i in range(30): # For the last 30 days
        current_date = today - timedelta(days=i)
        # Skip Sundays
        if current_date.weekday() == 6: continue

        for class_obj in classes:
            # Get students for this class
            students_in_class = Student.objects.filter(school_class=class_obj)
            for student in students_in_class:
                # Randomly mark some students as absent or late
                status = random.choices(
                    [Attendance.Status.PRESENT, Attendance.Status.ABSENT, Attendance.Status.LATE],
                    weights=[90, 7, 3], k=1
                )[0]
                Attendance.objects.create(student=student, date=current_date, status=status)
    print("Attendance records for the past 30 days created.")

def create_sample_assignments_and_grades(classes, teachers):
    """Create sample assignments and grades."""
    print("Creating sample assignments and grades...")
    for class_obj in classes:
        # Get students for this class
        students_in_class = list(Student.objects.filter(school_class=class_obj))
        if not students_in_class:
            continue

        # Get timetable entries to find teachers for this class
        teacher_for_class = teachers[class_obj.id - 1] # Simple assignment of teacher
        # Get subject from user profile
        subject = teacher_for_class.user.profile.subject if hasattr(teacher_for_class.user, 'profile') and teacher_for_class.user.profile.subject else "General"
        for i in range(3): # 3 assignments per class
            assignment = Assignment.objects.create(
                title=f"{subject} Assignment #{i+1}",
                description=f"Complete the exercises in Chapter {i*2 + 1}.",
                due_date=date.today() + timedelta(days=10 + i*5),
                school_class=class_obj,
                teacher=teacher_for_class,
                allow_file_upload=(i % 2 == 0)
            )
            # Create grades for 80% of the students
            num_students_to_grade = int(len(students_in_class) * 0.8)
            students_to_grade = random.sample(students_in_class, num_students_to_grade)
            for student in students_to_grade:
                Grade.objects.create(
                    student=student,
                    assignment=assignment,
                    score=random.randint(65, 98)
                )
    print("Assignments and grades created.")
    
def create_leave_requests(teachers, classes):
    """Create sample leave requests."""
    print("Creating sample leave requests...")
    # Teacher leave requests
    for teacher in random.sample(teachers, 5):
        LeaveRequest.objects.create(
            user=teacher.user,
            start_date=date.today() + timedelta(days=random.randint(5,10)),
            end_date=date.today() + timedelta(days=random.randint(11,15)),
            reason=random.choice(["Family function", "Personal work", "Medical appointment"]),
            status=random.choice([LeaveRequest.Status.PENDING, LeaveRequest.Status.APPROVED])
        )
    # Student leave requests - get students from first 2 classes
    students_from_first_two_classes = Student.objects.filter(school_class__in=classes[:2])
    students_list = list(students_from_first_two_classes)
    if students_list:
        num_students = min(10, len(students_list))
        selected_students = random.sample(students_list, num_students)
        for student in selected_students:
            LeaveRequest.objects.create(
                user=student.user,
                start_date=date.today() - timedelta(days=random.randint(2,5)),
                end_date=date.today() - timedelta(days=random.randint(1,2)),
                reason="Not feeling well.",
                status=LeaveRequest.Status.APPROVED
            )
    print("Sample leave requests created.")

def create_reimbursement_types():
    """Create sample reimbursement types."""
    print("Creating reimbursement types...")
    reimbursement_types_data = [
        {'name': 'Travel Expenses', 'max_amount': 5000.00},
        {'name': 'Stationery & Supplies', 'max_amount': 2000.00},
        {'name': 'Professional Development', 'max_amount': 10000.00},
        {'name': 'Internet & Communication', 'max_amount': 1500.00, 'requires_approval': False}
    ]
    reimbursement_types = [ReimbursementType.objects.create(**data) for data in reimbursement_types_data]
    print(f"Created {len(reimbursement_types)} reimbursement types.")
    return reimbursement_types

def create_sample_reimbursements(teachers, types):
    """Create sample reimbursement requests."""
    print("Creating sample reimbursement requests...")
    num_teachers = min(10, len(teachers))
    selected_teachers = random.sample(teachers, num_teachers)
    for teacher in selected_teachers:
        for _ in range(random.randint(1, 2)):
            rt = random.choice(types)
            amount = random.uniform(500, rt.max_amount or 5000)
            Reimbursement.objects.create(
                teacher=teacher, reimbursement_type=rt,
                amount=round(amount, 2),
                description=f"Claim for {rt.name}.",
                status=random.choice(['pending', 'approved', 'paid'])
            )
    print("Sample reimbursement requests created.")

# --- Main Execution ---

def main():
    """Main function to run the demo script."""
    print("Starting school management database demo population...")
    print("=" * 60)

    try:
        with transaction.atomic():
            clear_all_data()
            principal, school = create_principal_and_school()
            classes = create_classes()
            teachers = create_teachers(classes)
            periods = create_periods()
            create_students(classes)
            create_timetable(classes, teachers, periods)
            create_fee_structure(classes)
            create_sample_attendance(classes)
            create_sample_assignments_and_grades(classes, teachers)
            create_leave_requests(teachers, classes)
            reimbursement_types = create_reimbursement_types()
            create_sample_reimbursements(teachers, reimbursement_types)
        
        print("\n" + "=" * 60)
        print("Demo database population completed successfully!")
        print("\nSummary:")
        print(f"- Principal & School: 1")
        print(f"- Classes: {SchoolClass.objects.count()}")
        print(f"- Teachers: {Teacher.objects.count()}")
        print(f"- Students: {Student.objects.count()}")
        print(f"- Periods: {Period.objects.count()}")
        print(f"- Timetable Entries: {Timetable.objects.count()}")
        print(f"- Fee Structures: {Fee.objects.count()}")
        print(f"- Attendance Records: {Attendance.objects.count()}")
        print(f"- Assignments: {Assignment.objects.count()}")
        print(f"- Grades Submitted: {Grade.objects.count()}")
        print(f"- Leave Requests: {LeaveRequest.objects.count()}")
        print(f"- Reimbursements: {Reimbursement.objects.count()}")
        
        print("\nLogin Credentials:")
        print("- Principal: username='principal', password='demo123'")
        print("- Teacher:   username='teacher1', password='demo123'")
        print("- Student:   username='student1', password='demo123'")

    except Exception as e:
        print(f"\nAn unexpected error occurred: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()