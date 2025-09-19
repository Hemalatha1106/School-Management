#!/usr/bin/env python
import os
import sys
import django

# Add the project directory to the Python path
sys.path.append('school_management')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'school_management.settings')

# Setup Django
django.setup()

from api.models import User

# Check if principal user exists
u = User.objects.filter(username='principal').first()
print(f'User exists: {u is not None}')
if u:
    print(f'Password valid: {u.check_password("demo")}')
    print(f'Is superuser: {u.is_superuser}')
    print(f'Is staff: {u.is_staff}')
    print(f'Is active: {u.is_active}')
    print(f'Role: {u.role}')
else:
    print('Creating principal user...')
    user = User.objects.create_user(
        username='principal',
        password='demo',
        first_name='Admin',
        last_name='Principal',
        email='principal@school.edu',
        role=User.Role.PRINCIPAL,
        is_staff=True,
        is_superuser=True
    )
    print(f'Created user: {user.username}')