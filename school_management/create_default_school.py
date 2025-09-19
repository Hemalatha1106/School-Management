#!/usr/bin/env python
"""
Script to create a default school record if none exists.
Run this script to ensure the school settings are available for the frontend.
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'school_management.settings')
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
django.setup()

from api.models import School

def create_default_school():
    """Create a default school record if none exists."""
    if School.objects.exists():
        print("School record already exists.")
        school = School.objects.first()
        print(f"School: {school.name}")
        print(f"Academic Year: {school.academic_year}")
        print(f"Timings: {school.school_timings}")
        return

    # Create default school
    school = School.objects.create(
        name="Springfield High School",
        address="123 Main Street, Springfield",
        phone="+91-9876543210",
        email="info@springfieldhigh.edu",
        website="https://www.springfieldhigh.edu",
        academic_year="2024-2025",
        school_timings="8:00 AM - 3:00 PM",
        google_upi_id="school@upi",  # Replace with actual UPI ID
        razorpay_id="rzp_test_1234567890"  # Replace with actual Razorpay ID
    )

    print("Default school created successfully!")
    print(f"School: {school.name}")
    print(f"Academic Year: {school.academic_year}")
    print(f"Timings: {school.school_timings}")

if __name__ == "__main__":
    create_default_school()