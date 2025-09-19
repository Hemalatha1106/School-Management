# api/admin.py

from django.contrib import admin
from .models import User, UserProfile, SchoolClass, Student, Teacher, Fee, Attendance, LeaveRequest

# A simple way to register many models
admin.site.register(User)
admin.site.register(UserProfile)
admin.site.register(SchoolClass)
admin.site.register(Student)
admin.site.register(Teacher)
admin.site.register(Fee)
admin.site.register(Attendance)
admin.site.register(LeaveRequest)