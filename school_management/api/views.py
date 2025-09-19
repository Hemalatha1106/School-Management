from rest_framework import viewsets, status, generics, views
from rest_framework.decorators import action, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from django.http import HttpResponse
from django.template.loader import render_to_string
from django.db import models
from django.db.models import Sum, Count, Avg, F, Q
from django.utils import timezone
from django.views.decorators.cache import cache_page
from django.utils.decorators import method_decorator
from django.core.cache import cache
from asgiref.sync import sync_to_async
from datetime import timedelta
import asyncio
import logging
import json
from functools import wraps
import stripe
from .models import *
from .serializers import *
from .forms import *
from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.urls import reverse
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_exempt, csrf_protect
from django.utils.decorators import method_decorator
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.views.generic import ListView, DetailView, CreateView, UpdateView, DeleteView
from django.db.models import Sum, Count, Q
from django.core.exceptions import PermissionDenied, ValidationError

# Setup logging
logger = logging.getLogger('api.fee_operations')
audit_logger = logging.getLogger('api.audit')
payment_logger = logging.getLogger('api.payment_processing')

# Custom decorators for security
def require_fee_permission(view_func):
    """Decorator to check fee-related permissions."""
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            raise PermissionDenied("Authentication required")

        fee_id = kwargs.get('pk') or request.data.get('fee_id')
        if fee_id:
            try:
                fee = Fee.objects.get(pk=fee_id)
                if not request.user.has_fee_permission(fee):
                    audit_logger.warning(f"Unauthorized fee access attempt by {request.user.username} for fee {fee_id}")
                    raise PermissionDenied("You don't have permission to access this fee")
            except Fee.DoesNotExist:
                raise PermissionDenied("Fee not found")

        return view_func(request, *args, **kwargs)
    return wrapper

def require_payment_permission(view_func):
    """Decorator to check payment-related permissions."""
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            raise PermissionDenied("Authentication required")

        payment_id = kwargs.get('pk')
        if payment_id:
            try:
                payment = Payment.objects.get(pk=payment_id)
                if not request.user.has_payment_permission(payment):
                    audit_logger.warning(f"Unauthorized payment access attempt by {request.user.username} for payment {payment_id}")
                    raise PermissionDenied("You don't have permission to access this payment")
            except Payment.DoesNotExist:
                raise PermissionDenied("Payment not found")

        return view_func(request, *args, **kwargs)
    return wrapper

def audit_log(action):
    """Decorator to log audit events."""
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            user = request.user.username if request.user.is_authenticated else 'Anonymous'
            audit_logger.info(f"AUDIT: {user} performed {action} - {request.method} {request.path}")
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator

# === Rate Limiting Mixin ===

class RateLimitMixin:
    """Mixin to add rate limiting to views."""

    def check_rate_limit(self, request, max_attempts=5, window_seconds=300):
        """
        Check if the request exceeds rate limit.
        Returns (is_allowed, remaining_attempts, reset_time)
        """
        # Get client IP
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')

        cache_key = f"login_attempts_{ip}"
        current_time = timezone.now().timestamp()

        # Get existing attempts from cache
        attempts_data = cache.get(cache_key, {'count': 0, 'first_attempt': current_time})

        # Reset if window has passed
        if current_time - attempts_data['first_attempt'] > window_seconds:
            attempts_data = {'count': 0, 'first_attempt': current_time}

        # Check if limit exceeded
        if attempts_data['count'] >= max_attempts:
            reset_time = attempts_data['first_attempt'] + window_seconds
            return False, 0, reset_time

        # Increment attempts
        attempts_data['count'] += 1
        cache.set(cache_key, attempts_data, window_seconds)

        remaining_attempts = max_attempts - attempts_data['count']
        reset_time = attempts_data['first_attempt'] + window_seconds

        return True, remaining_attempts, reset_time

# === Public & Authentication Views ===

class HealthCheckView(views.APIView):
    """A public endpoint to check if the backend is running."""
    permission_classes = [AllowAny]

    @method_decorator(cache_page(60))  # Cache for 1 minute
    def get(self, request, *args, **kwargs):
        return Response({"status": "ok", "message": "Backend is connected and running."})

class CustomTokenObtainPairView(RateLimitMixin, TokenObtainPairView):
    """Login endpoint. Returns tokens and user data."""
    permission_classes = [AllowAny]
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        try:
            # Check rate limit
            is_allowed, remaining_attempts, reset_time = self.check_rate_limit(request)

            if not is_allowed:
                logger.warning(f"Rate limit exceeded for IP: {self.get_client_ip(request)}")
                return Response({
                    'error': 'Too many login attempts. Please try again later.',
                    'remaining_attempts': remaining_attempts,
                    'reset_time': reset_time
                }, status=status.HTTP_429_TOO_MANY_REQUESTS)

            # Proceed with normal login
            response = super().post(request, *args, **kwargs)

            if response.status_code == status.HTTP_200_OK:
                # Successful login
                username = request.data.get('username', 'unknown')
                user = User.objects.filter(username=username).first()
                if user:
                    user.record_successful_login()
                    logger.info(f"Successful login for user: {username}")
                else:
                    logger.warning(f"Login attempt with non-existent username: {username}")
            else:
                # Failed login
                username = request.data.get('username', 'unknown')
                user = User.objects.filter(username=username).first()
                if user:
                    user.record_failed_login()
                    logger.warning(f"Failed login attempt for user: {username}")

                    if user.is_account_locked_check():
                        return Response({
                            'error': 'Account is temporarily locked due to multiple failed login attempts.',
                            'locked_until': user.account_locked_until.isoformat() if user.account_locked_until else None
                        }, status=status.HTTP_423_LOCKED)

            return response

        except Exception as e:
            logger.error(f"Login error: {str(e)}")
            return Response({
                'error': 'Login failed due to server error. Please try again.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def get_client_ip(self, request):
        """Get client IP address."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

class CurrentUserView(generics.RetrieveAPIView):
    """Returns the currently authenticated user's data."""
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer
    def get_object(self):
        return self.request.user

class LogoutView(views.APIView):
    """Handles logout by blacklisting the refresh token."""
    permission_classes = [IsAuthenticated]
    def post(self, request):
        try:
            refresh_token = request.data["refresh"]
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response(status=status.HTTP_205_RESET_CONTENT)
        except Exception:
            return Response(status=status.HTTP_400_BAD_REQUEST)

class PasswordResetRequestView(views.APIView):
    """Handles password reset requests."""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        if serializer.is_valid():
            identifier = serializer.validated_data['identifier']

            # Find user by email or username
            try:
                if '@' in identifier:
                    user = User.objects.get(email__iexact=identifier)
                else:
                    user = User.objects.get(username__iexact=identifier)

                # In a real implementation, you would:
                # 1. Generate a secure reset token
                # 2. Store it in the database with expiration
                # 3. Send an email with the reset link

                # For demo purposes, we'll just return success
                return Response({
                    'message': 'Password reset link sent successfully. Please check your email.'
                }, status=status.HTTP_200_OK)

            except User.DoesNotExist:
                # Don't reveal if user exists or not for security
                return Response({
                    'message': 'If an account with this email/username exists, a password reset link has been sent.'
                }, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class PasswordResetConfirmView(views.APIView):
    """Handles password reset confirmation."""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        if serializer.is_valid():
            token = serializer.validated_data['token']
            new_password = serializer.validated_data['new_password']

            # In a real implementation, you would:
            # 1. Validate the token
            # 2. Find the associated user
            # 3. Update the password
            # 4. Mark token as used

            # For demo purposes, we'll just return success
            return Response({
                'message': 'Password reset successfully. You can now log in with your new password.'
            }, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class SchoolConfigView(views.APIView):
    """Returns school-wide configuration settings for the frontend."""
    permission_classes = [AllowAny]

    def get(self, request):
        try:
            # Get the school (assuming single school setup)
            school = School.objects.first()
            if not school:
                return Response({
                    'login_methods': ['username', 'email'],
                    'branding': {
                        'school_name': 'School Management System',
                        'logo_url': None,
                        'primary_color': '#3b82f6',
                        'secondary_color': '#64748b'
                    },
                    'features': {
                        'remember_login': True,
                        'password_reset': True,
                        'rate_limiting': True
                    }
                })

            # Get school settings
            settings = SchoolSetting.objects.filter(school=school)
            settings_dict = {setting.key: setting.value for setting in settings}

            # Build configuration response
            config = {
                'login_methods': settings_dict.get('login_methods', 'username,email').split(','),
                'branding': {
                    'school_name': school.name,
                    'logo_url': school.logo.url if school.logo else None,
                    'primary_color': settings_dict.get('primary_color', '#3b82f6'),
                    'secondary_color': settings_dict.get('secondary_color', '#64748b'),
                    'school_timings': school.school_timings,
                    'academic_year': school.academic_year
                },
                'features': {
                    'remember_login': settings_dict.get('remember_login', 'true').lower() == 'true',
                    'password_reset': settings_dict.get('password_reset', 'true').lower() == 'true',
                    'rate_limiting': settings_dict.get('rate_limiting', 'true').lower() == 'true',
                    'max_login_attempts': int(settings_dict.get('max_login_attempts', '5')),
                    'login_window_seconds': int(settings_dict.get('login_window_seconds', '300'))
                },
                'contact': {
                    'email': school.email,
                    'phone': school.phone,
                    'address': school.address,
                    'website': school.website
                }
            }

            return Response(config)

        except Exception as e:
            return Response({
                'error': f'Failed to load configuration: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# === Dashboard Stats Views ===

class LibraryStatsViewSet(viewsets.ReadOnlyModelViewSet):
    """API endpoint for library statistics."""
    serializer_class = LibraryStatsSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Return library stats for the current student."""
        if self.request.user.role == User.Role.STUDENT:
            try:
                student = Student.objects.get(user=self.request.user)
                return LibraryStats.objects.filter(student=student)
            except Student.DoesNotExist:
                return LibraryStats.objects.none()
        return LibraryStats.objects.none()

class StudentClassRankViewSet(viewsets.ReadOnlyModelViewSet):
    """API endpoint for student class ranks."""
    serializer_class = StudentClassRankSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Return class rank for the current student."""
        if self.request.user.role == User.Role.STUDENT:
            try:
                student = Student.objects.get(user=self.request.user)
                return StudentClassRank.objects.filter(student=student)
            except Student.DoesNotExist:
                return StudentClassRank.objects.none()
        return StudentClassRank.objects.none()

class WeeklyTimetableViewSet(viewsets.ReadOnlyModelViewSet):
    """API endpoint for weekly timetable."""
    serializer_class = WeeklyTimetableSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Return weekly timetable for the current student's class."""
        if self.request.user.role == User.Role.STUDENT:
            try:
                student = Student.objects.get(user=self.request.user)
                return WeeklyTimetable.objects.filter(school_class=student.school_class)
            except Student.DoesNotExist:
                return WeeklyTimetable.objects.none()
        return WeeklyTimetable.objects.none()

class TeacherAttendanceStatsViewSet(viewsets.ReadOnlyModelViewSet):
    """API endpoint for teacher attendance statistics."""
    serializer_class = TeacherAttendanceStatsSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Return attendance stats for the current teacher."""
        if self.request.user.role == User.Role.TEACHER:
            try:
                teacher = Teacher.objects.get(user=self.request.user)
                return TeacherAttendanceStats.objects.filter(teacher=teacher)
            except Teacher.DoesNotExist:
                return TeacherAttendanceStats.objects.none()
        return TeacherAttendanceStats.objects.none()

class TeacherAssignmentStatsViewSet(viewsets.ReadOnlyModelViewSet):
    """API endpoint for teacher assignment statistics."""
    serializer_class = TeacherAssignmentStatsSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Return assignment stats for the current teacher."""
        if self.request.user.role == User.Role.TEACHER:
            try:
                teacher = Teacher.objects.get(user=self.request.user)
                return TeacherAssignmentStats.objects.filter(teacher=teacher)
            except Teacher.DoesNotExist:
                return TeacherAssignmentStats.objects.none()
        return TeacherAssignmentStats.objects.none()

class TeacherReimbursementStatsViewSet(viewsets.ReadOnlyModelViewSet):
    """API endpoint for teacher reimbursement statistics."""
    serializer_class = TeacherReimbursementStatsSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Return reimbursement stats for the current teacher."""
        if self.request.user.role == User.Role.TEACHER:
            try:
                teacher = Teacher.objects.get(user=self.request.user)
                return TeacherReimbursementStats.objects.filter(teacher=teacher)
            except Teacher.DoesNotExist:
                return TeacherReimbursementStats.objects.none()
        return TeacherReimbursementStats.objects.none()

class TeacherGradeStatsViewSet(viewsets.ReadOnlyModelViewSet):
    """API endpoint for teacher grade statistics."""
    serializer_class = TeacherGradeStatsSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Return grade stats for the current teacher."""
        if self.request.user.role == User.Role.TEACHER:
            try:
                teacher = Teacher.objects.get(user=self.request.user)
                return TeacherGradeStats.objects.filter(teacher=teacher)
            except Teacher.DoesNotExist:
                return TeacherGradeStats.objects.none()
        return TeacherGradeStats.objects.none()

# === Dashboard Views ===

class StudentDashboardView(views.APIView):
    """Provides all necessary data for the student dashboard in a single endpoint."""
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        user = self.request.user
        if user.role != User.Role.STUDENT:
            return Response({"error": "User is not a student"}, status=status.HTTP_403_FORBIDDEN)

        try:
            student = Student.objects.select_related('user').get(user=user)
        except Student.DoesNotExist:
            return Response({"error": "Student profile not found"}, status=status.HTTP_404_NOT_FOUND)

        # Get attendance records
        attendance_records = student.attendance_records.all()
        total_days = attendance_records.count()
        present_days = attendance_records.filter(
            status__in=[Attendance.Status.PRESENT, Attendance.Status.LATE]
        ).count()
        attendance_rate = (present_days / total_days * 100) if total_days > 0 else 100

        # Get schedule, grades, and assignments
        schedule_data = Timetable.objects.filter(school_class=student.school_class)
        grades_data = student.grades.all().order_by('-graded_date')
        assignments_data = Assignment.objects.filter(school_class=student.school_class).order_by('due_date')

        stats_data = {
            "attendanceRate": round(attendance_rate, 1),
            "currentGPA": 3.7,
            "completedAssignments": 28,
            "totalAssignments": 32,
            "upcomingDeadlines": 5,
            "currentGrade": "A-"
        }

        # Process subjects data
        subjects_data = []
        unique_subjects = set((entry.subject, entry.teacher_id) for entry in schedule_data)

        # Batch fetch teachers
        teacher_ids = [teacher_id for _, teacher_id in unique_subjects if teacher_id]
        teachers = {teacher.user_id: teacher for teacher in Teacher.objects.filter(user_id__in=teacher_ids).select_related('user')}

        for idx, (subject, teacher_id) in enumerate(unique_subjects):
            teacher = teachers.get(teacher_id)
            teacher_name = f"{teacher.user.first_name} {teacher.user.last_name}" if teacher else "Unknown"
            subjects_data.append({
                "id": idx + 1,
                "name": subject,
                "teacher": teacher_name,
                "grade": "A-",
                "attendance": 95,
                "nextClass": "Tomorrow 9:00 AM"
            })

        payload = {
            "stats": stats_data,
            "subjects": subjects_data,
            "assignments": AssignmentSerializer(assignments_data, many=True).data,
            "schedule": TimetableSerializer(schedule_data, many=True).data,
            "grades": GradeSerializer(grades_data, many=True).data,
        }
        return Response(payload)

# === Admin Action Views ===

class AdminUserUpdateView(generics.GenericAPIView):
    """Endpoint for admins to change any user's username and/or password."""
    serializer_class = AdminUserUpdateSerializer
    permission_classes = [IsAdminUser]
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = User.objects.get(pk=serializer.validated_data['user_id'])
        if serializer.validated_data.get('username'):
            user.username = serializer.validated_data['username']
        if serializer.validated_data.get('password'):
            user.set_password(serializer.validated_data['password'])
        user.save()
        return Response({"message": "User updated successfully."}, status=status.HTTP_200_OK)

class FeeActionsView(views.APIView):
    """Handles complex actions and reports related to fees."""
    permission_classes = [IsAdminUser]
    def post(self, request, *args, **kwargs):
        action = request.data.get("action")
        if action == "create_class_fee":
            school_class = SchoolClass.objects.get(pk=request.data.get("class_id"))
            count = 0
            for student in school_class.students.all():
                Fee.objects.create(student=student, amount=request.data.get("amount"), due_date=request.data.get("due_date"))
                count += 1
            return Response({"message": f"Fee created for {count} students in {school_class.name}."}, status=status.HTTP_201_CREATED)
        elif action == "send_reminders":
            count = 0
            for fee in Fee.objects.filter(status__in=[Fee.Status.UNPAID, Fee.Status.PARTIAL]):
                Notification.objects.create(user=fee.student.user, title="Fee Payment Reminder", message=f"Reminder: Fee of ${fee.amount} due on {fee.due_date}.")
                count += 1
            return Response({"message": f"{count} payment reminders sent."}, status=status.HTTP_200_OK)
        return Response({"error": "Invalid action."}, status=status.HTTP_400_BAD_REQUEST)
    
    def get(self, request, *args, **kwargs):
        if request.query_params.get("action") == "generate_report":
            fees = Fee.objects.select_related('student__user').all().order_by('student__user__last_name')
            html = render_to_string('fees_report.html', {'fees': fees})
            return HttpResponse(html)
        return Response({"error": "Invalid action."}, status=status.HTTP_400_BAD_REQUEST)

# === Model ViewSets ===

class UserViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = User.objects.all().order_by('first_name', 'last_name')
    serializer_class = UserSerializer
    permission_classes = [IsAdminUser]

    @method_decorator(cache_page(600))  # Cache for 10 minutes
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

class StudentViewSet(viewsets.ModelViewSet):
    queryset = Student.objects.select_related('user').all()
    serializer_class = StudentSerializer

    @method_decorator(cache_page(600))  # Cache for 10 minutes
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

class TeacherViewSet(viewsets.ModelViewSet):
    queryset = Teacher.objects.select_related('user').all()
    serializer_class = TeacherSerializer

    @method_decorator(cache_page(600))  # Cache for 10 minutes
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @action(detail=True, methods=['get'])
    def students(self, request, pk=None):
        teacher = self.get_object()
        classes_taught = SchoolClass.objects.filter(teacher=teacher.user)
        students = Student.objects.filter(school_class__in=classes_taught).distinct()
        serializer = StudentSerializer(students, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def classes(self, request, pk=None):
        teacher = self.get_object()
        classes_taught = SchoolClass.objects.filter(teacher=teacher.user)
        serializer = SchoolClassSerializer(classes_taught, many=True)
        return Response(serializer.data)

class SchoolClassViewSet(viewsets.ModelViewSet):
    queryset = SchoolClass.objects.all()
    serializer_class = SchoolClassSerializer

class SchoolViewSet(viewsets.ModelViewSet):
    queryset = School.objects.all()
    serializer_class = SchoolSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        # Return only one school record (assuming single school setup)
        # If no school exists, this will return empty queryset
        return School.objects.all()[:1] if School.objects.exists() else School.objects.none()

    def get_object(self):
        # For single school setup, always return the first (and only) school
        if School.objects.exists():
            return School.objects.first()
        # If no school exists, create a default one
        school = School.objects.create(
            name="Springfield High School",
            academic_year="2024-2025",
            school_timings="8:00 AM - 3:00 PM"
        )
        return school

class SchoolSettingViewSet(viewsets.ModelViewSet):
    queryset = SchoolSetting.objects.all()
    serializer_class = SchoolSettingSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        # Get settings for the current school (assuming single school setup)
        school = School.objects.first()
        if school:
            return SchoolSetting.objects.filter(school=school)
        return SchoolSetting.objects.none()

    def perform_create(self, serializer):
        # Ensure the setting is created for the current school
        school = School.objects.first()
        if not school:
            school = School.objects.create(
                name="Springfield High School",
                academic_year="2024-2025",
                school_timings="8:00 AM - 3:00 PM"
            )
        serializer.save(school=school)

class FeeTypeViewSet(viewsets.ModelViewSet):
    queryset = FeeType.objects.all().order_by('category', 'name')
    serializer_class = FeeTypeSerializer
    permission_classes = [IsAdminUser]

class FeeViewSet(viewsets.ModelViewSet):
    """
    Enhanced ViewSet for Fee management with CRUD operations and advanced features.
    """
    serializer_class = EnhancedFeeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        try:
            queryset = Fee.objects.select_related('student__user').prefetch_related(
                'payments', 'discounts', 'payment_plan'
            )

            # Filter by student if provided
            student_id = self.request.query_params.get('student_id', None)
            if student_id is not None:
                queryset = queryset.filter(student_id=student_id)

            # Filter by status
            status_filter = self.request.query_params.get('status', None)
            if status_filter is not None:
                queryset = queryset.filter(status=status_filter)

            # Filter by overdue
            overdue = self.request.query_params.get('overdue', None)
            if overdue == 'true':
                from django.utils import timezone
                queryset = queryset.filter(
                    due_date__lt=timezone.now().date(),
                    status__in=[Fee.Status.UNPAID, Fee.Status.PARTIAL]
                )

            return queryset
        except Exception as e:
            logger.error(f"Error in FeeViewSet.get_queryset: {str(e)}")
            return Fee.objects.none()

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return FeeSerializer  # Use basic serializer for input
        return EnhancedFeeSerializer  # Use enhanced for output

    def perform_create(self, serializer):
        try:
            fee = serializer.save()
            logger.info(f"Fee created: {fee.id} for student {fee.student.user.username}")
            audit_logger.info(f"FEE_CREATED: Fee {fee.id} created by {self.request.user.username}")
        except Exception as e:
            logger.error(f"Error creating fee: {str(e)}")
            raise

    def perform_update(self, serializer):
        try:
            fee = serializer.save()
            logger.info(f"Fee updated: {fee.id}")
            audit_logger.info(f"FEE_UPDATED: Fee {fee.id} updated by {self.request.user.username}")
        except Exception as e:
            logger.error(f"Error updating fee: {str(e)}")
            raise

    @action(detail=True, methods=['post'])
    @require_fee_permission
    @audit_log('apply_discount')
    def apply_discount(self, request, pk=None):
        """Apply a discount to a fee."""
        try:
            fee = self.get_object()
            serializer = DiscountSerializer(data=request.data)
            if serializer.is_valid():
                discount = serializer.save(fee=fee, student=fee.student, applied_by=request.user)
                logger.info(f"Discount applied to fee {fee.id}: ₹{discount.value}")
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except PermissionDenied as e:
            return Response({'error': str(e)}, status=status.HTTP_403_FORBIDDEN)
        except Exception as e:
            logger.error(f"Error applying discount to fee {pk}: {str(e)}")
            return Response({'error': 'Failed to apply discount'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    @require_fee_permission
    @audit_log('waive_amount')
    def waive_amount(self, request, pk=None):
        """Waive a portion of the fee amount."""
        try:
            fee = self.get_object()
            amount = request.data.get('amount')

            if amount is None:
                return Response({'error': 'Amount is required'}, status=status.HTTP_400_BAD_REQUEST)

            try:
                amount = float(amount)
                if amount <= 0:
                    raise ValueError()
            except (ValueError, TypeError):
                return Response({'error': 'Invalid amount'}, status=status.HTTP_400_BAD_REQUEST)

            if amount > fee.get_outstanding_amount():
                return Response({'error': 'Waiver amount exceeds outstanding balance'}, status=status.HTTP_400_BAD_REQUEST)

            old_waived = fee.waived_amount
            fee.waived_amount += amount
            fee.save()

            logger.info(f"Fee waiver: ₹{amount} waived on fee {fee.id}")
            audit_logger.info(f"FEE_WAIVED: ₹{amount} waived on fee {fee.id} by {request.user.username}")

            serializer = self.get_serializer(fee)
            return Response(serializer.data)
        except PermissionDenied as e:
            return Response({'error': str(e)}, status=status.HTTP_403_FORBIDDEN)
        except Exception as e:
            logger.error(f"Error waiving amount for fee {pk}: {str(e)}")
            return Response({'error': 'Failed to waive amount'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    @require_fee_permission
    @audit_log('create_payment_plan')
    def create_payment_plan(self, request, pk=None):
        """Create a payment plan for the fee."""
        try:
            fee = self.get_object()
            serializer = PaymentPlanSerializer(data=request.data)
            if serializer.is_valid():
                payment_plan = serializer.save(fee=fee)
                logger.info(f"Payment plan created for fee {fee.id}")
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except PermissionDenied as e:
            return Response({'error': str(e)}, status=status.HTTP_403_FORBIDDEN)
        except Exception as e:
            logger.error(f"Error creating payment plan for fee {pk}: {str(e)}")
            return Response({'error': 'Failed to create payment plan'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class PaymentViewSet(viewsets.ModelViewSet):
    """
    Enhanced ViewSet for Payment management with processing and status updates.
    """
    serializer_class = EnhancedPaymentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        try:
            queryset = Payment.objects.select_related('fee__student__user', 'processed_by').prefetch_related('refunds')

            # Filter by fee if provided
            fee_id = self.request.query_params.get('fee_id', None)
            if fee_id is not None:
                queryset = queryset.filter(fee_id=fee_id)

            # Filter by status
            payment_status = self.request.query_params.get('status', None)
            if payment_status is not None:
                queryset = queryset.filter(status=payment_status)

            # Filter by date range
            start_date = self.request.query_params.get('start_date', None)
            end_date = self.request.query_params.get('end_date', None)
            if start_date:
                queryset = queryset.filter(payment_date__date__gte=start_date)
            if end_date:
                queryset = queryset.filter(payment_date__date__lte=end_date)

            return queryset
        except Exception as e:
            logger.error(f"Error in PaymentViewSet.get_queryset: {str(e)}")
            return Payment.objects.none()

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return PaymentSerializer  # Use basic serializer for input
        return EnhancedPaymentSerializer  # Use enhanced for output

    def perform_create(self, serializer):
        try:
            # Capture client IP and user agent
            request = self.get_serializer_context()['request']
            payment = serializer.save(
                processed_by=request.user,
                ip_address=self.get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )
            payment_logger.info(f"Payment created: {payment.id} for fee {payment.fee.id} - Amount: ₹{payment.amount}")
            audit_logger.info(f"PAYMENT_CREATED: Payment {payment.id} created by {request.user.username}")
        except Exception as e:
            logger.error(f"Error creating payment: {str(e)}")
            raise

    def perform_update(self, serializer):
        try:
            payment = serializer.save()
            payment_logger.info(f"Payment updated: {payment.id}")
            audit_logger.info(f"PAYMENT_UPDATED: Payment {payment.id} updated by {self.request.user.username}")
        except Exception as e:
            logger.error(f"Error updating payment: {str(e)}")
            raise

    @action(detail=True, methods=['post'])
    @require_payment_permission
    @audit_log('update_payment_status')
    def update_status(self, request, pk=None):
        """Update payment status."""
        try:
            payment = self.get_object()
            new_status = request.data.get('status')

            if new_status not in dict(Payment.Status.choices):
                return Response({'error': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)

            # Check permissions - only admins can change status to completed/failed
            if new_status in [Payment.Status.COMPLETED, Payment.Status.FAILED]:
                if request.user.role not in [User.Role.PRINCIPAL, User.Role.TEACHER]:
                    audit_logger.warning(f"Unauthorized payment status change attempt by {request.user.username}")
                    return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

            old_status = payment.status
            payment.status = new_status
            payment.save()

            payment_logger.info(f"Payment {payment.id} status changed from {old_status} to {new_status}")
            audit_logger.info(f"PAYMENT_STATUS_CHANGED: Payment {payment.id} status changed by {request.user.username}")

            serializer = self.get_serializer(payment)
            return Response(serializer.data)
        except PermissionDenied as e:
            return Response({'error': str(e)}, status=status.HTTP_403_FORBIDDEN)
        except Exception as e:
            logger.error(f"Error updating payment status for {pk}: {str(e)}")
            return Response({'error': 'Failed to update payment status'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    @require_payment_permission
    @audit_log('process_refund')
    def process_refund(self, request, pk=None):
        """Process a refund for the payment."""
        try:
            payment = self.get_object()
            serializer = RefundSerializer(data=request.data)
            if serializer.is_valid():
                refund = serializer.save(payment=payment, processed_by=request.user)
                payment_logger.warning(f"Refund processed for payment {payment.id}: ₹{refund.amount}")
                audit_logger.info(f"REFUND_PROCESSED: Refund {refund.id} processed by {request.user.username}")
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except PermissionDenied as e:
            return Response({'error': str(e)}, status=status.HTTP_403_FORBIDDEN)
        except Exception as e:
            logger.error(f"Error processing refund for payment {pk}: {str(e)}")
            return Response({'error': 'Failed to process refund'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def get_client_ip(self, request):
        """Get client IP address."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

class PaymentProcessingView(views.APIView):
    """Handle Stripe payment processing and confirmation"""
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        fee_id = request.data.get('fee_id')
        amount = request.data.get('amount')
        payment_method_id = request.data.get('payment_method_id')  # Stripe payment method ID
        notes = request.data.get('notes', '')

        if not fee_id or not amount or not payment_method_id:
            return Response(
                {'error': 'fee_id, amount, and payment_method_id are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            fee = Fee.objects.get(pk=fee_id)

            # Check if user has permission to process payment for this fee
            if request.user.role == User.Role.STUDENT:
                # Students can only pay their own fees
                if fee.student.user != request.user:
                    return Response(
                        {'error': 'Permission denied'},
                        status=status.HTTP_403_FORBIDDEN
                    )
            elif request.user.role not in [User.Role.PRINCIPAL, User.Role.TEACHER]:
                return Response(
                    {'error': 'Permission denied'},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Convert amount to cents (Stripe uses smallest currency unit)
            amount_cents = int(float(amount) * 100)

            # Create Stripe PaymentIntent
            intent = stripe.PaymentIntent.create(
                amount=amount_cents,
                currency='inr',  # Indian Rupee
                payment_method=payment_method_id,
                confirmation_method='manual',
                confirm=True,
                metadata={
                    'fee_id': str(fee_id),
                    'student_id': str(fee.student.id),
                    'user_id': str(request.user.id)
                }
            )

            # Check if payment succeeded
            if intent.status == 'succeeded':
                payment_status = Payment.Status.COMPLETED
                transaction_id = intent.id
            elif intent.status == 'requires_payment_method':
                return Response(
                    {'error': 'Payment method failed. Please try again.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            else:
                payment_status = Payment.Status.PENDING

            # Create payment record
            payment = Payment.objects.create(
                fee=fee,
                amount=amount,
                payment_method='stripe',
                transaction_id=transaction_id,
                status=payment_status,
                notes=notes,
                processed_by=request.user,
                stripe_payment_intent_id=intent.id,
                stripe_charge_id=getattr(intent, 'charges', {}).data[0].id if intent.charges.data else None
            )

            # Update fee status if payment completed
            if payment_status == Payment.Status.COMPLETED:
                fee.status = Fee.Status.PAID
                fee.save()

                # Create notification for the student
                Notification.objects.create(
                    user=fee.student.user,
                    title="Payment Confirmed",
                    message=f"Your payment of ₹{amount} has been confirmed via Stripe. Transaction ID: {transaction_id}"
                )

            payment_logger.info(f"Stripe payment processed: {payment.id} - Intent: {intent.id} - Status: {intent.status}")

            serializer = PaymentSerializer(payment)
            return Response({
                'message': 'Payment processed successfully',
                'payment': serializer.data,
                'stripe_client_secret': intent.client_secret
            }, status=status.HTTP_201_CREATED)

        except stripe.error.StripeError as e:
            payment_logger.error(f"Stripe error: {str(e)}")
            return Response(
                {'error': f'Payment processing failed: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Fee.DoesNotExist:
            return Response(
                {'error': 'Fee not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            payment_logger.error(f"Payment processing error: {str(e)}")
            return Response(
                {'error': f'Payment processing failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@method_decorator(csrf_exempt, name='dispatch')
class StripeWebhookView(views.APIView):
    """Handle Stripe webhook events for payment confirmations"""
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        payload = request.body
        sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')

        try:
            # Verify webhook signature
            from django.conf import settings
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
        except ValueError as e:
            # Invalid payload
            payment_logger.error(f"Invalid webhook payload: {str(e)}")
            return Response({'error': 'Invalid payload'}, status=status.HTTP_400_BAD_REQUEST)
        except stripe.error.SignatureVerificationError as e:
            # Invalid signature
            payment_logger.error(f"Invalid webhook signature: {str(e)}")
            return Response({'error': 'Invalid signature'}, status=status.HTTP_400_BAD_REQUEST)

        # Handle the event
        event_type = event['type']
        payment_logger.info(f"Received Stripe webhook: {event_type}")

        if event_type == 'payment_intent.succeeded':
            payment_intent = event['data']['object']
            self.handle_payment_succeeded(payment_intent)
        elif event_type == 'payment_intent.payment_failed':
            payment_intent = event['data']['object']
            self.handle_payment_failed(payment_intent)
        elif event_type == 'charge.dispute.created':
            # Handle dispute if needed
            pass
        # Add more event types as needed

        return Response({'status': 'success'}, status=status.HTTP_200_OK)

    def handle_payment_succeeded(self, payment_intent):
        """Handle successful payment"""
        try:
            # Find the payment record by stripe_payment_intent_id
            payment = Payment.objects.get(stripe_payment_intent_id=payment_intent['id'])

            # Update payment status
            payment.status = Payment.Status.COMPLETED
            payment.transaction_id = payment_intent['id']
            if payment_intent.get('charges', {}).get('data'):
                payment.stripe_charge_id = payment_intent['charges']['data'][0]['id']
            payment.save()

            # Update fee status
            fee = payment.fee
            fee.status = Fee.Status.PAID
            fee.save()

            # Create notification
            Notification.objects.create(
                user=fee.student.user,
                title="Payment Confirmed",
                message=f"Your payment of ₹{payment.amount} has been confirmed via Stripe."
            )

            payment_logger.info(f"Payment confirmed via webhook: {payment.id}")

        except Payment.DoesNotExist:
            payment_logger.error(f"Payment not found for intent: {payment_intent['id']}")
        except Exception as e:
            payment_logger.error(f"Error handling payment success: {str(e)}")

    def handle_payment_failed(self, payment_intent):
        """Handle failed payment"""
        try:
            payment = Payment.objects.get(stripe_payment_intent_id=payment_intent['id'])
            payment.status = Payment.Status.FAILED
            payment.save()

            payment_logger.warning(f"Payment failed via webhook: {payment.id}")

        except Payment.DoesNotExist:
            payment_logger.error(f"Payment not found for failed intent: {payment_intent['id']}")
        except Exception as e:
            payment_logger.error(f"Error handling payment failure: {str(e)}")

class NotificationViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing notifications.
    """
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Return notifications for the current user."""
        return Notification.objects.filter(user=self.request.user).order_by('-created_at')

    def perform_create(self, serializer):
        """Set the user when creating a notification."""
        serializer.save(user=self.request.user)

class LeaveRequestViewSet(viewsets.ModelViewSet):
    queryset = LeaveRequest.objects.all().order_by('-id')
    serializer_class = LeaveRequestSerializer

class AttendanceViewSet(viewsets.ModelViewSet):
    queryset = Attendance.objects.all()
    serializer_class = AttendanceSerializer

class TimetableViewSet(viewsets.ModelViewSet):
    queryset = Timetable.objects.all()
    serializer_class = TimetableSerializer

    @action(detail=False, methods=['get'], url_path='class/(?P<class_id>\d+)')
    def by_class(self, request, class_id=None):
        """Get timetable entries for a specific class."""
        try:
            school_class = SchoolClass.objects.get(pk=class_id)
            timetable_entries = Timetable.objects.filter(school_class=school_class).select_related('teacher__user', 'school_class')
            serializer = self.get_serializer(timetable_entries, many=True)
            return Response(serializer.data)
        except SchoolClass.DoesNotExist:
            return Response({'error': 'Class not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], url_path='overview')
    def overview(self, request):
        """Get a comprehensive overview of all timetable data."""
        try:
            # Get all classes with their timetable statistics
            classes = SchoolClass.objects.all()
            overview_data = []

            for school_class in classes:
                timetable_entries = Timetable.objects.filter(school_class=school_class)
                teachers = set()
                subjects = set()

                for entry in timetable_entries:
                    subjects.add(entry.subject)
                    if entry.teacher:
                        teachers.add(f"{entry.teacher.user.first_name} {entry.teacher.user.last_name}")

                overview_data.append({
                    'class_id': school_class.id,
                    'class_name': school_class.name,
                    'total_slots': timetable_entries.count(),
                    'unique_subjects': len(subjects),
                    'unique_teachers': len(teachers),
                    'subjects_list': list(subjects),
                    'teachers_list': list(teachers)
                })

            return Response({
                'total_classes': len(overview_data),
                'total_timetable_entries': sum(item['total_slots'] for item in overview_data),
                'classes_overview': overview_data
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class ReportViewSet(viewsets.ViewSet):
    permission_classes = [IsAdminUser]

    @method_decorator(cache_page(600))  # Cache for 10 minutes
    @action(detail=False, methods=['get'])
    def academic(self, request):
        return Response({
            "total_students": Student.objects.count(),
            "total_teachers": Teacher.objects.count(),
            "total_classes": SchoolClass.objects.count(),
        })

    @method_decorator(cache_page(600))  # Cache for 10 minutes
    @action(detail=False, methods=['get'], url_path='fees-summary')
    def fees_summary(self, request):
        paid_fees = Fee.objects.filter(status='paid')
        unpaid_fees = Fee.objects.filter(status__in=['unpaid', 'partial'])
        pie_chart_data = {
            'paid_count': paid_fees.count(),
            'paid_total': paid_fees.aggregate(total=Sum('amount'))['total'] or 0,
            'unpaid_count': unpaid_fees.count(),
            'unpaid_total': unpaid_fees.aggregate(total=Sum('amount'))['total'] or 0,
        }
        class_breakdown = unpaid_fees.values('student__school_class__name') \
            .annotate(total_pending=Sum('amount'), student_count=Count('student', distinct=True)) \
            .order_by('-total_pending')
        return Response({"pie_chart": pie_chart_data, "class_breakdown": list(class_breakdown)})
class ClassViewSet(viewsets.ModelViewSet):
    queryset = SchoolClass.objects.all()
    serializer_class = SchoolClassSerializer

    @action(detail=True, methods=['get'])
    def details(self, request, pk=None):
        """Get detailed information about a specific class including students and teacher."""
        try:
            school_class = self.get_object()
            students = Student.objects.filter(school_class=school_class).select_related('user')
            teacher = school_class.teacher

            data = {
                'class_info': SchoolClassSerializer(school_class).data,
                'teacher': UserSerializer(teacher.user).data if teacher else None,
                'students': StudentSerializer(students, many=True).data,
                'total_students': students.count()
            }
            return Response(data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class StudentDetailView(views.APIView):
    """Get detailed information about a specific student."""
    permission_classes = [IsAuthenticated]

    def get(self, request, student_id):
        try:
            student = Student.objects.select_related('user').get(pk=student_id)
            # Check if user has permission to view this student
            if request.user.role == 'student' and request.user != student.user:
                return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

            # Get student's attendance, grades, fees, etc.
            attendance_records = student.attendance_records.all()
            grades = student.grades.all().order_by('-graded_date')
            fees = Fee.objects.filter(student=student)

            data = {
                'student': StudentSerializer(student).data,
                'attendance': AttendanceSerializer(attendance_records, many=True).data,
                'grades': GradeSerializer(grades, many=True).data,
                'fees': FeeSerializer(fees, many=True).data,
                'attendance_rate': (attendance_records.filter(status__in=['present', 'late']).count() / attendance_records.count() * 100) if attendance_records.count() > 0 else 0
            }
            return Response(data)
        except Student.DoesNotExist:
            return Response({'error': 'Student not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class PeriodViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing the school's period time slots.
    """
    queryset = Period.objects.all()
    serializer_class = PeriodSerializer
    permission_classes = [IsAdminUser] # Only principals can edit period timings

class TaskViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing teacher tasks.
    """
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Return tasks for the current teacher user."""
        if self.request.user.role == User.Role.TEACHER:
            try:
                teacher = Teacher.objects.get(user=self.request.user)
                return Task.objects.filter(teacher=teacher)
            except Teacher.DoesNotExist:
                return Task.objects.none()
        elif self.request.user.role == User.Role.PRINCIPAL:
            # Principals can see all tasks
            return Task.objects.all()
        return Task.objects.none()

    def perform_create(self, serializer):
        """Set the teacher when creating a task."""
        if self.request.user.role == User.Role.TEACHER:
            try:
                teacher = Teacher.objects.get(user=self.request.user)
                serializer.save(teacher=teacher)
            except Teacher.DoesNotExist:
                raise serializers.ValidationError("Teacher profile not found.")
        else:
            serializer.save()

    @action(detail=True, methods=['post'])
    def mark_completed(self, request, pk=None):
        """Mark a task as completed."""
        task = self.get_object()
        task.mark_completed()
        serializer = self.get_serializer(task)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def mark_in_progress(self, request, pk=None):
        """Mark a task as in progress."""
        task = self.get_object()
        task.mark_in_progress()
        serializer = self.get_serializer(task)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def today_tasks(self, request):
        """Get tasks for today."""
        today = timezone.now().date()
        queryset = self.get_queryset().filter(due_date=today)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def upcoming_tasks(self, request):
        """Get upcoming tasks (next 7 days)."""
        today = timezone.now().date()
        next_week = today + timedelta(days=7)
        queryset = self.get_queryset().filter(
            due_date__gte=today,
            due_date__lte=next_week
        ).order_by('due_date', 'due_time')
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

# === Database Snapshot/Backup Views ===

class DatabaseSnapshotView(views.APIView):
    """Create and manage database snapshots for backup purposes."""
    permission_classes = [IsAdminUser]

    async def get(self, request, *args, **kwargs):
        """Export complete database snapshot in JSON format."""
        try:
            # Use async database queries for better performance
            async def get_users():
                return await sync_to_async(lambda: UserSerializer(User.objects.all(), many=True).data)()

            async def get_students():
                return await sync_to_async(lambda: StudentSerializer(Student.objects.select_related('user').all(), many=True).data)()

            async def get_teachers():
                return await sync_to_async(lambda: TeacherSerializer(Teacher.objects.select_related('user').all(), many=True).data)()

            async def get_classes():
                return await sync_to_async(lambda: SchoolClassSerializer(SchoolClass.objects.all(), many=True).data)()

            async def get_fees():
                return await sync_to_async(lambda: FeeSerializer(Fee.objects.select_related('student__user').all(), many=True).data)()

            async def get_fee_types():
                return await sync_to_async(lambda: FeeTypeSerializer(FeeType.objects.all(), many=True).data)()

            async def get_leave_requests():
                return await sync_to_async(lambda: LeaveRequestSerializer(LeaveRequest.objects.all(), many=True).data)()

            async def get_attendances():
                return await sync_to_async(lambda: AttendanceSerializer(Attendance.objects.all(), many=True).data)()

            async def get_timetables():
                return await sync_to_async(lambda: TimetableSerializer(Timetable.objects.select_related('teacher__user', 'school_class').all(), many=True).data)()

            async def get_assignments():
                return await sync_to_async(lambda: AssignmentSerializer(Assignment.objects.all(), many=True).data)()

            async def get_grades():
                return await sync_to_async(lambda: GradeSerializer(Grade.objects.all(), many=True).data)()

            async def get_tasks():
                return await sync_to_async(lambda: TaskSerializer(Task.objects.all(), many=True).data)()

            async def get_periods():
                return await sync_to_async(lambda: PeriodSerializer(Period.objects.all(), many=True).data)()

            async def get_notifications():
                return await sync_to_async(lambda: NotificationSerializer(Notification.objects.all(), many=True).data)()

            # Parallel async queries for maximum performance
            data_tasks = await asyncio.gather(
                get_users(),
                get_students(),
                get_teachers(),
                get_classes(),
                get_fees(),
                get_fee_types(),
                get_leave_requests(),
                get_attendances(),
                get_timetables(),
                get_assignments(),
                get_grades(),
                get_tasks(),
                get_periods(),
                get_notifications()
            )

            # Statistics queries
            stats_tasks = await asyncio.gather(
                sync_to_async(User.objects.count)(),
                sync_to_async(Student.objects.count)(),
                sync_to_async(Teacher.objects.count)(),
                sync_to_async(SchoolClass.objects.count)(),
                sync_to_async(Fee.objects.count)(),
                sync_to_async(LeaveRequest.objects.count)(),
                sync_to_async(Attendance.objects.count)(),
                sync_to_async(Timetable.objects.count)(),
                sync_to_async(Assignment.objects.count)(),
                sync_to_async(Grade.objects.count)(),
                sync_to_async(Task.objects.count)(),
            )

            # Collect all data from all models
            snapshot_data = {
                'metadata': {
                    'timestamp': timezone.now().isoformat(),
                    'version': '1.0',
                    'description': 'Complete database snapshot'
                },
                'data': {
                    'users': data_tasks[0],
                    'students': data_tasks[1],
                    'teachers': data_tasks[2],
                    'school_classes': data_tasks[3],
                    'fees': data_tasks[4],
                    'fee_types': data_tasks[5],
                    'leave_requests': data_tasks[6],
                    'attendances': data_tasks[7],
                    'timetables': data_tasks[8],
                    'assignments': data_tasks[9],
                    'grades': data_tasks[10],
                    'tasks': data_tasks[11],
                    'periods': data_tasks[12],
                    'notifications': data_tasks[13],
                },
                'statistics': {
                    'total_users': stats_tasks[0],
                    'total_students': stats_tasks[1],
                    'total_teachers': stats_tasks[2],
                    'total_classes': stats_tasks[3],
                    'total_fees': stats_tasks[4],
                    'total_leave_requests': stats_tasks[5],
                    'total_attendances': stats_tasks[6],
                    'total_timetable_entries': stats_tasks[7],
                    'total_assignments': stats_tasks[8],
                    'total_grades': stats_tasks[9],
                    'total_tasks': stats_tasks[10],
                }
            }

            return Response(snapshot_data)

        except Exception as e:
            return Response(
                {'error': f'Failed to create database snapshot: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    async def post(self, request, *args, **kwargs):
        """Import database snapshot from JSON data."""
        try:
            snapshot_data = request.data

            if not isinstance(snapshot_data, dict) or 'data' not in snapshot_data:
                return Response(
                    {'error': 'Invalid snapshot format'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # This would require careful implementation to avoid data conflicts
            # For now, return a message that import is not implemented
            return Response({
                'message': 'Database import functionality is not yet implemented',
                'received_data_keys': list(snapshot_data.get('data', {}).keys())
            })

        except Exception as e:
            return Response(
                {'error': f'Failed to import database snapshot: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

# === Async Task Processing ===

class AsyncTaskViewSet(viewsets.ViewSet):
    """Handle async background tasks"""
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['post'])
    async def process_bulk_data(self, request):
        """Process bulk data operations asynchronously"""
        try:
            operation_type = request.data.get('operation')
            data = request.data.get('data', [])

            if operation_type == 'bulk_grade_update':
                # Simulate async bulk grade processing
                await asyncio.sleep(0.1)  # Simulate processing time
                return Response({
                    'message': f'Processed {len(data)} grade updates asynchronously',
                    'status': 'completed'
                })

            elif operation_type == 'bulk_attendance':
                # Simulate async bulk attendance processing
                await asyncio.sleep(0.1)
                return Response({
                    'message': f'Processed {len(data)} attendance records asynchronously',
                    'status': 'completed'
                })

            return Response({'error': 'Unknown operation type'}, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            return Response(
                {'error': f'Async processing failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'])
    async def generate_report_async(self, request):
        """Generate reports asynchronously"""
        try:
            report_type = request.data.get('report_type', 'academic')

            # Simulate async report generation
            await asyncio.sleep(0.5)  # Simulate report generation time

            return Response({
                'message': f'{report_type.title()} report generated asynchronously',
                'report_id': f'report_{timezone.now().strftime("%Y%m%d_%H%M%S")}',
                'status': 'completed'
            })

        except Exception as e:
            return Response(
                {'error': f'Report generation failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

# === Report Management Views ===

class ReportManagementViewSet(viewsets.ViewSet):
    """Manage report generation, storage, and retrieval"""
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['post'])
    def generate(self, request):
        """Generate a new report"""
        from django.core.management import call_command
        from django.conf import settings
        import os

        report_type = request.data.get('report_type', 'all')
        output_format = request.data.get('format', 'json')

        try:
            # Generate report using management command
            call_command('generate_reports',
                        report_type=report_type,
                        format=output_format)

            # Find the latest report directory
            reports_base_dir = os.path.join(settings.BASE_DIR, 'reports')
            if os.path.exists(reports_base_dir):
                report_dirs = [d for d in os.listdir(reports_base_dir)
                             if d.startswith('report_')]
                if report_dirs:
                    latest_report = max(report_dirs)
                    report_path = os.path.join(reports_base_dir, latest_report)

                    return Response({
                        'message': 'Report generated successfully',
                        'report_id': latest_report,
                        'report_path': report_path,
                        'generated_at': timezone.now().isoformat()
                    })

            return Response({'message': 'Report generated successfully'})

        except Exception as e:
            return Response(
                {'error': f'Failed to generate report: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def list_reports(self, request):
        """List all available reports"""
        from django.conf import settings
        import os

        reports_base_dir = os.path.join(settings.BASE_DIR, 'reports')
        reports = []

        if os.path.exists(reports_base_dir):
            for item in os.listdir(reports_base_dir):
                item_path = os.path.join(reports_base_dir, item)
                if os.path.isdir(item_path) and item.startswith('report_'):
                    metadata_file = os.path.join(item_path, 'metadata.json')
                    if os.path.exists(metadata_file):
                        try:
                            with open(metadata_file, 'r') as f:
                                metadata = json.load(f)
                            reports.append(metadata)
                        except:
                            # If metadata can't be read, create basic info
                            reports.append({
                                'report_id': item,
                                'generated_at': item.replace('report_', '').replace('_', 'T'),
                                'report_type': 'unknown'
                            })

        # Sort by generation date (newest first)
        reports.sort(key=lambda x: x.get('generated_at', ''), reverse=True)

        return Response({
            'reports': reports,
            'total': len(reports)
        })

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """Download a specific report file"""
        from django.conf import settings
        from django.http import HttpResponse, Http404
        import os
        import mimetypes

        file_path = request.query_params.get('path', '')
        if not file_path:
            return Response(
                {'error': 'File path parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Security check - ensure path is within reports directory
        reports_base_dir = os.path.join(settings.BASE_DIR, 'reports')
        full_path = os.path.join(reports_base_dir, pk, file_path)

        # Prevent directory traversal
        if not os.path.abspath(full_path).startswith(os.path.abspath(reports_base_dir)):
            return Response(
                {'error': 'Invalid file path'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not os.path.exists(full_path) or not os.path.isfile(full_path):
            raise Http404("File not found")

        # Determine content type
        content_type, _ = mimetypes.guess_type(full_path)
        if content_type is None:
            content_type = 'application/octet-stream'

        # Read file and return response
        with open(full_path, 'rb') as f:
            file_data = f.read()

        response = HttpResponse(file_data, content_type=content_type)
        response['Content-Disposition'] = f'attachment; filename="{os.path.basename(full_path)}"'
        return response

    @action(detail=True, methods=['get'])
    def files(self, request, pk=None):
        """List files in a specific report directory"""
        from django.conf import settings
        import os

        reports_base_dir = os.path.join(settings.BASE_DIR, 'reports')
        report_dir = os.path.join(reports_base_dir, pk)

        if not os.path.exists(report_dir):
            return Response(
                {'error': 'Report not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        files = []
        for root, dirs, filenames in os.walk(report_dir):
            for filename in filenames:
                full_path = os.path.join(root, filename)
                rel_path = os.path.relpath(full_path, report_dir)
                file_size = os.path.getsize(full_path)
                files.append({
                    'name': filename,
                    'path': rel_path,
                    'size': file_size,
                    'type': filename.split('.')[-1] if '.' in filename else 'unknown'
                })

        return Response({
            'report_id': pk,
            'files': files,
            'total_files': len(files)
        })

    @action(detail=True, methods=['delete'])
    def delete(self, request, pk=None):
        """Delete a specific report"""
        from django.conf import settings
        import shutil

        # Only allow principals to delete reports
        if request.user.role != User.Role.PRINCIPAL:
            return Response(
                {'error': 'Only principals can delete reports'},
                status=status.HTTP_403_FORBIDDEN
            )

        reports_base_dir = os.path.join(settings.BASE_DIR, 'reports')
        report_dir = os.path.join(reports_base_dir, pk)

        if not os.path.exists(report_dir):
            return Response(
                {'error': 'Report not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        try:
            shutil.rmtree(report_dir)
            return Response({'message': f'Report {pk} deleted successfully'})
        except Exception as e:
            return Response(
                {'error': f'Failed to delete report: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

# === Assignment and Submission ViewSets ===

class AssignmentViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing assignments.
    """
    serializer_class = AssignmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Return assignments for the current teacher or all assignments for principals."""
        if self.request.user.role == User.Role.TEACHER:
            try:
                teacher = Teacher.objects.get(user=self.request.user)
                return Assignment.objects.filter(teacher=teacher)
            except Teacher.DoesNotExist:
                return Assignment.objects.none()
        elif self.request.user.role == User.Role.PRINCIPAL:
            return Assignment.objects.all()
        return Assignment.objects.none()

    @action(detail=True, methods=['get'])
    def submissions(self, request, pk=None):
        """Get all submissions for a specific assignment."""
        assignment = self.get_object()
        submissions = AssignmentSubmission.objects.filter(assignment=assignment).select_related('student__user', 'graded_by__user')
        serializer = AssignmentSubmissionSerializer(submissions, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def by_class(self, request):
        """Get assignments filtered by class."""
        class_id = request.query_params.get('class_id')
        if not class_id:
            return Response({'error': 'class_id parameter is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            school_class = SchoolClass.objects.get(pk=class_id)
            assignments = Assignment.objects.filter(school_class=school_class)
            serializer = self.get_serializer(assignments, many=True)
            return Response(serializer.data)
        except SchoolClass.DoesNotExist:
            return Response({'error': 'Class not found'}, status=status.HTTP_404_NOT_FOUND)

class AssignmentSubmissionViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing assignment submissions.
    """
    serializer_class = AssignmentSubmissionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Return submissions based on user role."""
        if self.request.user.role == User.Role.STUDENT:
            try:
                student = Student.objects.get(user=self.request.user)
                return AssignmentSubmission.objects.filter(student=student)
            except Student.DoesNotExist:
                return AssignmentSubmission.objects.none()
        elif self.request.user.role == User.Role.TEACHER:
            try:
                teacher = Teacher.objects.get(user=self.request.user)
                return AssignmentSubmission.objects.filter(assignment__teacher=teacher)
            except Teacher.DoesNotExist:
                return AssignmentSubmission.objects.none()
        elif self.request.user.role == User.Role.PRINCIPAL:
            return AssignmentSubmission.objects.all()
        return AssignmentSubmission.objects.none()

    @action(detail=True, methods=['post'])
    def grade(self, request, pk=None):
        """Grade a submission."""
        submission = self.get_object()
        grade = request.data.get('grade')
        feedback = request.data.get('feedback', '')

        if grade is None:
            return Response({'error': 'Grade is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            grade_int = int(grade)
            if grade_int < 0 or grade_int > 100:
                return Response({'error': 'Grade must be between 0 and 100'}, status=status.HTTP_400_BAD_REQUEST)
        except ValueError:
            return Response({'error': 'Grade must be a valid number'}, status=status.HTTP_400_BAD_REQUEST)

        # Update submission
        submission.grade = grade_int
        submission.feedback = feedback
        submission.status = AssignmentSubmission.Status.GRADED
        submission.graded_at = timezone.now()
        submission.graded_by = Teacher.objects.get(user=request.user)
        submission.save()

        serializer = self.get_serializer(submission)
        return Response(serializer.data)

# === Reimbursement ViewSets ===

class ReimbursementTypeViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing reimbursement types.
    """
    queryset = ReimbursementType.objects.all()
    serializer_class = ReimbursementTypeSerializer
    permission_classes = [IsAdminUser]

class ReimbursementViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing reimbursements.
    """
    serializer_class = ReimbursementSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Return reimbursements based on user role."""
        if self.request.user.role == User.Role.TEACHER:
            try:
                teacher = Teacher.objects.get(user=self.request.user)
                return Reimbursement.objects.filter(teacher=teacher)
            except Teacher.DoesNotExist:
                return Reimbursement.objects.none()
        elif self.request.user.role in [User.Role.PRINCIPAL, User.Role.TEACHER]:
            # Teachers and principals can see all reimbursements for approval
            return Reimbursement.objects.all()
        return Reimbursement.objects.none()

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve a reimbursement request."""
        reimbursement = self.get_object()

        if request.user.role not in [User.Role.PRINCIPAL, User.Role.TEACHER]:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

        reimbursement.status = Reimbursement.Status.APPROVED
        reimbursement.reviewed_at = timezone.now()
        reimbursement.reviewed_by = request.user
        reimbursement.review_notes = request.data.get('review_notes', '')
        reimbursement.save()

        serializer = self.get_serializer(reimbursement)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject a reimbursement request."""
        reimbursement = self.get_object()

        if request.user.role not in [User.Role.PRINCIPAL, User.Role.TEACHER]:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

        reimbursement.status = Reimbursement.Status.REJECTED
        reimbursement.reviewed_at = timezone.now()
        reimbursement.reviewed_by = request.user
        reimbursement.review_notes = request.data.get('review_notes', '')
        reimbursement.save()

        serializer = self.get_serializer(reimbursement)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def mark_paid(self, request, pk=None):
        """Mark a reimbursement as paid."""
        reimbursement = self.get_object()

        if request.user.role not in [User.Role.PRINCIPAL]:
            return Response({'error': 'Only principals can mark reimbursements as paid'}, status=status.HTTP_403_FORBIDDEN)

        reimbursement.status = Reimbursement.Status.PAID
        reimbursement.save()

        serializer = self.get_serializer(reimbursement)
        return Response(serializer.data)

# === Fee Management ViewSets ===

class FeeStructureViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing fee structures.
    """
    queryset = FeeStructure.objects.select_related('school', 'fee_type', 'school_class')
    serializer_class = FeeStructureSerializer
    permission_classes = [IsAdminUser]

class DiscountViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing discounts.
    """
    queryset = Discount.objects.select_related('student__user', 'fee', 'applied_by')
    serializer_class = DiscountSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        # Filter by student if provided
        student_id = self.request.query_params.get('student_id', None)
        if student_id is not None:
            queryset = queryset.filter(student_id=student_id)
        return queryset

class RefundViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing refunds.
    """
    queryset = Refund.objects.select_related('payment__fee__student__user', 'processed_by')
    serializer_class = RefundSerializer
    permission_classes = [IsAuthenticated]

class PaymentPlanViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing payment plans.
    """
    queryset = PaymentPlan.objects.select_related('fee__student__user')
    serializer_class = PaymentPlanSerializer
    permission_classes = [IsAuthenticated]

class FeeReportViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing fee reports.
    """
    queryset = FeeReport.objects.select_related('school', 'generated_by')
    serializer_class = FeeReportSerializer
    permission_classes = [IsAuthenticated]

# === Aggregated Data and Analytics Views ===

class FeeAnalyticsViewSet(viewsets.ViewSet):
    """
    ViewSet for fee analytics and aggregated data.
    """
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def student_fees_summary(self, request):
        """Get total fees per student."""
        student_id = request.query_params.get('student_id', None)
        queryset = Fee.objects.select_related('student__user')

        if student_id:
            queryset = queryset.filter(student_id=student_id)

        summary = queryset.values(
            'student__id', 'student__user__first_name', 'student__user__last_name'
        ).annotate(
            total_fees=Sum('amount'),
            total_paid=Sum('payments__amount', filter=Q(payments__status=Payment.Status.COMPLETED)),
            outstanding_balance=Sum('amount') - Sum('payments__amount', filter=Q(payments__status=Payment.Status.COMPLETED)),
            overdue_fees=Count('id', filter=Q(due_date__lt=timezone.now().date(), status__in=[Fee.Status.UNPAID, Fee.Status.PARTIAL]))
        ).order_by('student__user__last_name')

        return Response(list(summary))

    @action(detail=False, methods=['get'])
    def outstanding_balances(self, request):
        """Get outstanding balances summary."""
        balances = Fee.objects.filter(
            status__in=[Fee.Status.UNPAID, Fee.Status.PARTIAL]
        ).select_related('student__user').values(
            'student__id', 'student__user__first_name', 'student__user__last_name'
        ).annotate(
            total_outstanding=Sum('amount') - Sum('payments__amount', filter=Q(payments__status=Payment.Status.COMPLETED)) - Sum('waived_amount')
        ).filter(total_outstanding__gt=0).order_by('-total_outstanding')

        return Response(list(balances))

    @action(detail=False, methods=['get'])
    def payment_history(self, request):
        """Get payment history with filters."""
        queryset = Payment.objects.select_related('fee__student__user', 'processed_by')

        # Apply filters
        student_id = request.query_params.get('student_id')
        if student_id:
            queryset = queryset.filter(fee__student_id=student_id)

        start_date = request.query_params.get('start_date')
        if start_date:
            queryset = queryset.filter(payment_date__date__gte=start_date)

        end_date = request.query_params.get('end_date')
        if end_date:
            queryset = queryset.filter(payment_date__date__lte=end_date)

        payment_method = request.query_params.get('payment_method')
        if payment_method:
            queryset = queryset.filter(payment_method=payment_method)

        # Aggregate by month
        monthly_summary = queryset.extra(
            select={'month': "DATE_TRUNC('month', payment_date)"}
        ).values('month').annotate(
            total_amount=Sum('amount'),
            payment_count=Count('id')
        ).order_by('-month')

        return Response(list(monthly_summary))

    @action(detail=False, methods=['get'])
    def revenue_analytics(self, request):
        """Get revenue analytics by category and time period."""
        year = request.query_params.get('year', timezone.now().year)

        # Revenue by fee type
        revenue_by_type = Payment.objects.filter(
            status=Payment.Status.COMPLETED,
            payment_date__year=year
        ).select_related('fee').values(
            'fee__fee_type__name', 'fee__fee_type__category'
        ).annotate(
            total_revenue=Sum('amount'),
            payment_count=Count('id')
        ).order_by('-total_revenue')

        # Monthly revenue
        monthly_revenue = Payment.objects.filter(
            status=Payment.Status.COMPLETED,
            payment_date__year=year
        ).extra(
            select={'month': "EXTRACT(month FROM payment_date)"}
        ).values('month').annotate(
            revenue=Sum('amount')
        ).order_by('month')

        return Response({
            'revenue_by_type': list(revenue_by_type),
            'monthly_revenue': list(monthly_revenue)
        })

# === Student Fee Views ===

class StudentFeesView(generics.ListAPIView):
    """
    View for getting fees specific to a student.
    """
    serializer_class = EnhancedFeeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        student_id = self.kwargs['student_id']
        return Fee.objects.filter(student_id=student_id).select_related(
            'student__user'
        ).prefetch_related('payments', 'discounts', 'payment_plan')

# === Report Generation Views ===

class FeeReportsViewSet(viewsets.ViewSet):
    """
    ViewSet for generating various fee reports.
    """
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def overdue_fees(self, request):
        """Generate overdue fees report."""
        from django.utils import timezone

        overdue_fees = Fee.objects.filter(
            due_date__lt=timezone.now().date(),
            status__in=[Fee.Status.UNPAID, Fee.Status.PARTIAL]
        ).select_related('student__user', 'student__school_class').annotate(
            days_overdue=timezone.now().date() - F('due_date'),
            outstanding_amount=F('amount') - Sum('payments__amount', filter=Q(payments__status=Payment.Status.COMPLETED)) - F('waived_amount')
        ).filter(outstanding_amount__gt=0).order_by('-days_overdue')

        report_data = []
        for fee in overdue_fees:
            report_data.append({
                'student_name': f"{fee.student.user.first_name} {fee.student.user.last_name}",
                'class': fee.student.school_class.name if fee.student.school_class else 'N/A',
                'fee_amount': fee.amount,
                'outstanding_amount': fee.outstanding_amount,
                'due_date': fee.due_date,
                'days_overdue': fee.days_overdue.days
            })

        return Response({
            'report_type': 'overdue_fees',
            'generated_at': timezone.now(),
            'total_overdue': len(report_data),
            'data': report_data
        })

    @action(detail=False, methods=['get'])
    def fee_collection_trends(self, request):
        """Generate fee collection trends report."""
        months = request.query_params.get('months', 12)

        # Get data for the last N months
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=30 * int(months))

        trends = Payment.objects.filter(
            status=Payment.Status.COMPLETED,
            payment_date__date__gte=start_date
        ).extra(
            select={'month': "DATE_TRUNC('month', payment_date)"}
        ).values('month').annotate(
            collected_amount=Sum('amount'),
            payment_count=Count('id'),
            average_payment=Avg('amount')
        ).order_by('month')

        return Response({
            'report_type': 'fee_collection_trends',
            'period_months': months,
            'generated_at': timezone.now(),
            'data': list(trends)
        })

    @action(detail=False, methods=['get'])
    def student_performance(self, request):
        """Generate student fee payment performance report."""
        performance_data = Student.objects.annotate(
            total_fees=Sum('fees__amount'),
            total_paid=Sum('fees__payments__amount', filter=Q(fees__payments__status=Payment.Status.COMPLETED)),
            on_time_payments=Count('fees__payments', filter=Q(
                fees__payments__status=Payment.Status.COMPLETED,
                fees__payments__payment_date__date__lte=F('fees__due_date')
            )),
            late_payments=Count('fees__payments', filter=Q(
                fees__payments__status=Payment.Status.COMPLETED,
                fees__payments__payment_date__date__gt=F('fees__due_date')
            )),
            overdue_fees=Count('fees', filter=Q(
                fees__due_date__lt=timezone.now().date(),
                fees__status__in=[Fee.Status.UNPAID, Fee.Status.PARTIAL]
            ))
        ).values(
            'user__first_name', 'user__last_name', 'school_class__name',
            'total_fees', 'total_paid', 'on_time_payments', 'late_payments', 'overdue_fees'
        ).order_by('school_class__name', 'user__last_name')

        return Response({
            'report_type': 'student_performance',
            'generated_at': timezone.now(),
            'data': list(performance_data)
        })

# === Fee Management Web Interface Views ===

class FeeManagementMixin:
    """Mixin to handle role-based access for fee management."""

    def dispatch(self, request, *args, **kwargs):
        if not request.user.is_authenticated:
            return redirect('login')
        return super().dispatch(request, *args, **kwargs)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['user'] = self.request.user
        return context

@login_required
def student_fee_dashboard(request):
    """Student fee dashboard view."""
    if request.user.role != User.Role.STUDENT:
        messages.error(request, "Access denied. Student access required.")
        return redirect('admin_fee_dashboard')

    try:
        student = Student.objects.get(user=request.user)
    except Student.DoesNotExist:
        messages.error(request, "Student profile not found.")
        return redirect('home')

    # Get student's fees
    fees = Fee.objects.filter(student=student).select_related('fee_type').prefetch_related('payments')

    # Calculate summary data
    total_outstanding = 0
    paid_fees_count = 0
    pending_fees_count = 0
    overdue_fees_count = 0

    for fee in fees:
        outstanding = fee.amount - fee.waived_amount
        for payment in fee.payments.filter(status='completed'):
            outstanding -= payment.amount

        if outstanding <= 0:
            paid_fees_count += 1
        elif fee.due_date < timezone.now().date():
            overdue_fees_count += 1
            total_outstanding += outstanding
        else:
            pending_fees_count += 1
            total_outstanding += outstanding

    # Get recent payments
    payments = Payment.objects.filter(
        fee__student=student
    ).select_related('fee__fee_type').order_by('-payment_date')[:10]

    context = {
        'fees': fees,
        'payments': payments,
        'total_outstanding': total_outstanding,
        'paid_fees_count': paid_fees_count,
        'pending_fees_count': pending_fees_count,
        'overdue_fees_count': overdue_fees_count,
    }

    return render(request, 'fee_management/student_dashboard.html', context)

@login_required
def admin_fee_dashboard(request):
    """Admin/Principal fee dashboard view."""
    if request.user.role not in [User.Role.PRINCIPAL, User.Role.TEACHER]:
        messages.error(request, "Access denied. Admin access required.")
        return redirect('student_fee_dashboard')

    # Calculate key metrics
    total_collected = Payment.objects.filter(
        status='completed'
    ).aggregate(total=Sum('amount'))['total'] or 0

    monthly_collected = Payment.objects.filter(
        status='completed',
        payment_date__month=timezone.now().month,
        payment_date__year=timezone.now().year
    ).aggregate(total=Sum('amount'))['total'] or 0

    # Outstanding balances
    outstanding_fees = Fee.objects.filter(status__in=['unpaid', 'partial'])
    total_outstanding = 0
    for fee in outstanding_fees:
        outstanding = fee.amount - fee.waived_amount
        for payment in fee.payments.filter(status='completed'):
            outstanding -= payment.amount
        if outstanding > 0:
            total_outstanding += outstanding

    outstanding_count = outstanding_fees.count()

    # Overdue fees
    overdue_fees = Fee.objects.filter(
        due_date__lt=timezone.now().date(),
        status__in=['unpaid', 'partial']
    )
    overdue_amount = 0
    for fee in overdue_fees:
        outstanding = fee.amount - fee.waived_amount
        for payment in fee.payments.filter(status='completed'):
            outstanding -= payment.amount
        if outstanding > 0:
            overdue_amount += outstanding

    overdue_count = overdue_fees.count()

    # Active students with fees
    active_students_count = Student.objects.filter(fees__isnull=False).distinct().count()

    # Recent payments
    recent_payments = Payment.objects.select_related(
        'fee__student__user', 'processed_by'
    ).order_by('-payment_date')[:5]

    # Class-wise summary
    class_summary = []
    for school_class in SchoolClass.objects.all():
        class_fees = Fee.objects.filter(student__school_class=school_class)
        total_fees = class_fees.aggregate(total=Sum('amount'))['total'] or 0
        total_collected = Payment.objects.filter(
            fee__student__school_class=school_class,
            status='completed'
        ).aggregate(total=Sum('amount'))['total'] or 0

        total_outstanding = total_fees - total_collected
        collection_rate = (total_collected / total_fees * 100) if total_fees > 0 else 0

        class_summary.append({
            'class_name': school_class.name,
            'student_count': Student.objects.filter(school_class=school_class).count(),
            'total_fees': total_fees,
            'total_collected': total_collected,
            'total_outstanding': total_outstanding,
            'collection_rate': collection_rate,
        })

    context = {
        'total_collected': total_collected,
        'monthly_collected': monthly_collected,
        'total_outstanding': total_outstanding,
        'outstanding_count': outstanding_count,
        'overdue_amount': overdue_amount,
        'overdue_count': overdue_count,
        'active_students_count': active_students_count,
        'recent_payments': recent_payments,
        'overdue_fees': overdue_fees.select_related('student__user', 'fee_type')[:5],
        'class_summary': class_summary,
    }

    return render(request, 'fee_management/admin_dashboard.html', context)

class FeeListView(FeeManagementMixin, ListView):
    """List all fees with filtering and search."""
    model = Fee
    template_name = 'fee_management/fee_list.html'
    context_object_name = 'fees'
    paginate_by = 20

    def get_queryset(self):
        queryset = Fee.objects.select_related('student__user', 'fee_type')

        # Filter by status
        status = self.request.GET.get('status')
        if status:
            queryset = queryset.filter(status=status)

        # Filter by student
        student_id = self.request.GET.get('student_id')
        if student_id:
            queryset = queryset.filter(student_id=student_id)

        # Search by student name
        search = self.request.GET.get('search')
        if search:
            queryset = queryset.filter(
                Q(student__user__first_name__icontains=search) |
                Q(student__user__last_name__icontains=search) |
                Q(student__user__username__icontains=search)
            )

        return queryset.order_by('-due_date')

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['status_choices'] = Fee.Status.choices
        context['students'] = Student.objects.select_related('user').all()
        return context

class FeeDetailView(FeeManagementMixin, DetailView):
    """Detailed view of a single fee."""
    model = Fee
    template_name = 'fee_management/fee_detail.html'
    context_object_name = 'fee'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        fee = self.get_object()

        # Calculate outstanding amount
        outstanding = fee.amount - fee.waived_amount
        for payment in fee.payments.filter(status='completed'):
            outstanding -= payment.amount
        context['outstanding_amount'] = outstanding

        # Get payment history
        context['payments'] = fee.payments.select_related('processed_by').order_by('-payment_date')

        # Check permissions
        if self.request.user.role == User.Role.STUDENT:
            if fee.student.user != self.request.user:
                messages.error(self.request, "Access denied.")
                return redirect('student_fee_dashboard')

        return context

class FeeCreateView(FeeManagementMixin, CreateView):
    """Create a new fee."""
    model = Fee
    form_class = FeeForm
    template_name = 'fee_management/fee_form.html'
    success_url = '/fees/'

    def form_valid(self, form):
        messages.success(self.request, "Fee created successfully.")
        return super().form_valid(form)

    def form_invalid(self, form):
        messages.error(self.request, "Please correct the errors below.")
        return super().form_invalid(form)

class FeeUpdateView(FeeManagementMixin, UpdateView):
    """Update an existing fee."""
    model = Fee
    form_class = FeeForm
    template_name = 'fee_management/fee_form.html'
    success_url = '/fees/'

    def form_valid(self, form):
        messages.success(self.request, "Fee updated successfully.")
        return super().form_valid(form)

    def form_invalid(self, form):
        messages.error(self.request, "Please correct the errors below.")
        return super().form_invalid(form)

class PaymentCreateView(FeeManagementMixin, CreateView):
    """Process a payment for a fee."""
    model = Payment
    form_class = PaymentForm
    template_name = 'fee_management/payment_form.html'

    def get_form_kwargs(self):
        kwargs = super().get_form_kwargs()
        fee_id = self.kwargs.get('fee_id')
        if fee_id:
            fee = get_object_or_404(Fee, pk=fee_id)
            kwargs['fee'] = fee
        return kwargs

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        fee_id = self.kwargs.get('fee_id')
        if fee_id:
            context['fee'] = get_object_or_404(Fee, pk=fee_id)
        return context

    def form_valid(self, form):
        fee = form.fee
        payment = form.save(commit=False)
        payment.fee = fee
        payment.processed_by = self.request.user
        payment.save()

        messages.success(self.request, f"Payment of ₹{payment.amount} processed successfully.")
        return redirect('fee_detail', pk=fee.pk)

    def form_invalid(self, form):
        messages.error(self.request, "Please correct the errors below.")
        return super().form_invalid(form)

@login_required
def apply_discount(request, fee_id):
    """Apply a discount to a fee."""
    fee = get_object_or_404(Fee, pk=fee_id)

    if request.method == 'POST':
        discount_type = request.POST.get('discount_type')
        value = request.POST.get('value')
        reason = request.POST.get('reason')

        try:
            if discount_type == 'percentage':
                discount_amount = (fee.amount * float(value)) / 100
            else:
                discount_amount = float(value)

            Discount.objects.create(
                student=fee.student,
                fee=fee,
                discount_type=discount_type,
                value=float(value),
                reason=reason,
                applied_by=request.user
            )

            # Update fee waived amount
            fee.waived_amount += discount_amount
            fee.save()

            messages.success(request, f"Discount of ₹{discount_amount:.2f} applied successfully.")
            return redirect('fee_detail', pk=fee.pk)

        except ValueError:
            messages.error(request, "Invalid discount value.")

    return render(request, 'fee_management/discount_form.html', {'fee': fee})

@login_required
def process_refund(request, payment_id):
    """Process a refund for a payment."""
    payment = get_object_or_404(Payment, pk=payment_id)

    if request.method == 'POST':
        amount = request.POST.get('amount')
        reason = request.POST.get('reason')

        try:
            refund_amount = float(amount)

            if refund_amount > payment.amount:
                messages.error(request, "Refund amount cannot exceed payment amount.")
            else:
                Refund.objects.create(
                    payment=payment,
                    amount=refund_amount,
                    reason=reason,
                    processed_by=request.user
                )

                messages.success(request, f"Refund of ₹{refund_amount:.2f} processed successfully.")
                return redirect('fee_detail', pk=payment.fee.pk)

        except ValueError:
            messages.error(request, "Invalid refund amount.")

    return render(request, 'fee_management/refund_form.html', {'payment': payment})