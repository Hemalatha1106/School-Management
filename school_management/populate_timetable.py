#!/usr/bin/env python
import os
import django
import sys

# Setup Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'school_management.settings')
django.setup()

from api.models import *

def populate_sample_data():
    print("Creating sample timetable data...")

    # Create sample classes
    classes_data = [
        {'name': 'Class 10A'},
        {'name': 'Class 10B'},
        {'name': 'Class 9A'},
        {'name': 'Class 9B'},
        {'name': 'Class 8A'},
    ]

    classes = []
    for class_data in classes_data:
        cls, created = SchoolClass.objects.get_or_create(
            name=class_data['name'],
            defaults=class_data
        )
        classes.append(cls)
        if created:
            print(f"Created class: {cls.name}")

    # Create sample teachers
    teachers_data = [
        {'username': 'john_doe', 'first_name': 'John', 'last_name': 'Doe'},
        {'username': 'jane_smith', 'first_name': 'Jane', 'last_name': 'Smith'},
        {'username': 'bob_johnson', 'first_name': 'Bob', 'last_name': 'Johnson'},
        {'username': 'alice_brown', 'first_name': 'Alice', 'last_name': 'Brown'},
    ]

    teachers = []
    for teacher_data in teachers_data:
        user, user_created = User.objects.get_or_create(
            username=teacher_data['username'],
            defaults={
                'first_name': teacher_data['first_name'],
                'last_name': teacher_data['last_name'],
                'role': 'teacher'
            }
        )
        teacher, teacher_created = Teacher.objects.get_or_create(
            user=user,
            defaults={}
        )
        teachers.append(teacher)
        if user_created or teacher_created:
            print(f"Created teacher: {teacher.user.get_full_name()}")

    # Create sample timetable entries
    subjects = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'History', 'Geography', 'Computer Science']
    days = ['MON', 'TUE', 'WED', 'THU', 'FRI']
    time_slots = [
        ('08:00:00', '09:00:00'),
        ('09:00:00', '10:00:00'),
        ('10:00:00', '11:00:00'),
        ('11:00:00', '12:00:00'),
        ('13:00:00', '14:00:00'),
        ('14:00:00', '15:00:00'),
        ('15:00:00', '16:00:00'),
    ]

    timetable_count = 0
    for cls in classes:
        for day in days:
            # Create 4-6 subjects per day per class
            import random
            num_subjects = random.randint(4, 6)
            selected_slots = random.sample(time_slots, num_subjects)

            for i, (start_time, end_time) in enumerate(selected_slots):
                subject = random.choice(subjects)
                teacher = random.choice(teachers)

                timetable, created = Timetable.objects.get_or_create(
                    school_class=cls,
                    day_of_week=day,
                    start_time=start_time,
                    defaults={
                        'end_time': end_time,
                        'subject': subject,
                        'teacher': teacher
                    }
                )

                if created:
                    timetable_count += 1

    print(f"Created {timetable_count} timetable entries")
    print("Sample data population completed!")

if __name__ == '__main__':
    populate_sample_data()