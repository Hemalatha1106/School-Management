#!/usr/bin/env python
"""
Script to check and populate teacher data for testing the teacher dashboard.
"""
import os
import sys
import django
from django.conf import settings

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'school_management.settings')
django.setup()

from django.contrib.auth import get_user_model
from api.models import Teacher, SchoolClass, Student, User

User = get_user_model()

def check_teacher_data():
    """Check if teachers have classes assigned and create sample data if needed."""
    print("Checking teacher data...")

    # Get all teachers
    teachers = Teacher.objects.select_related('user').all()
    print(f"Found {teachers.count()} teachers in database")

    for teacher in teachers:
        print(f"\nTeacher: {teacher.user.first_name} {teacher.user.last_name} ({teacher.user.username})")

        # Check classes taught by this teacher
        classes_taught = SchoolClass.objects.filter(teacher=teacher.user)
        print(f"   Classes taught: {classes_taught.count()}")

        for cls in classes_taught:
            student_count = Student.objects.filter(school_class=cls).count()
            print(f"      • {cls.name}: {student_count} students")

        if classes_taught.count() == 0:
            print("   WARNING: No classes assigned to this teacher!")

    # Check if there are any classes without teachers
    classes_without_teachers = SchoolClass.objects.filter(teacher__isnull=True)
    if classes_without_teachers.exists():
        print(f"\nWARNING: Found {classes_without_teachers.count()} classes without teachers assigned:")
        for cls in classes_without_teachers:
            print(f"   • {cls.name}")

def assign_classes_to_teachers():
    """Assign classes to teachers if none are assigned."""
    print("\nAssigning classes to teachers...")

    teachers = Teacher.objects.select_related('user').all()
    classes_without_teachers = SchoolClass.objects.filter(teacher__isnull=True)

    if not teachers.exists():
        print("ERROR: No teachers found in database!")
        return

    if not classes_without_teachers.exists():
        print("SUCCESS: All classes already have teachers assigned!")
        return

    # Assign classes to teachers round-robin style
    teacher_list = list(teachers)
    for i, cls in enumerate(classes_without_teachers):
        teacher = teacher_list[i % len(teacher_list)]
        cls.teacher = teacher.user
        cls.save()
        print(f"   SUCCESS: Assigned {cls.name} to {teacher.user.first_name} {teacher.user.last_name}")

    print(f"SUCCESS: Successfully assigned {classes_without_teachers.count()} classes to teachers!")

def create_sample_teacher():
    """Create a sample teacher if none exist."""
    print("\nCreating sample teacher...")

    # Check if teacher user already exists
    if User.objects.filter(username='teacher1').exists():
        print("SUCCESS: Teacher user 'teacher1' already exists!")
        return

    # Create teacher user
    teacher_user = User.objects.create_user(
        username='teacher1',
        email='teacher1@school.com',
        password='password123',
        first_name='John',
        last_name='Smith',
        role=User.Role.TEACHER
    )

    # Create teacher profile
    teacher = Teacher.objects.create(
        user=teacher_user,
        salary=50000.00
    )

    print(f"SUCCESS: Created teacher: {teacher.user.first_name} {teacher.user.last_name}")
    print("   Username: teacher1")
    print("   Password: password123")
    print("   Role: Teacher")

def main():
    """Main function."""
    print("School Management - Teacher Data Check")
    print("=" * 50)

    check_teacher_data()

    # Ask user if they want to assign classes
    classes_without_teachers = SchoolClass.objects.filter(teacher__isnull=True)
    if classes_without_teachers.exists():
        print(f"\nFound {classes_without_teachers.count()} classes without teachers.")
        response = input("Do you want to assign these classes to existing teachers? (y/n): ").lower().strip()

        if response == 'y':
            assign_classes_to_teachers()
        else:
            print("Skipping class assignment...")

    # Check if we need to create a sample teacher
    if not Teacher.objects.exists():
        response = input("No teachers found. Do you want to create a sample teacher? (y/n): ").lower().strip()
        if response == 'y':
            create_sample_teacher()

    print("\nRe-checking teacher data after updates...")
    check_teacher_data()

    print("\nTeacher data check completed!")
    print("\nTo test the teacher dashboard:")
    print("   1. Start the Django server: python manage.py runserver")
    print("   2. Start the Next.js app: cd my-app && npm run dev")
    print("   3. Login as teacher1 with password: password123")
    print("   4. Navigate to the teacher dashboard")

if __name__ == '__main__':
    main()