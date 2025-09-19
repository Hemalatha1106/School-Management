from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from django.core.validators import validate_email, MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.utils.html import strip_tags
import re
import logging
from .models import *

logger = logging.getLogger('api.fee_operations')

# === Dashboard Stats Serializers ===

class LibraryStatsSerializer(serializers.ModelSerializer):
    class Meta:
        model = LibraryStats
        fields = ['books_borrowed', 'books_due_soon', 'books_overdue', 'updated_at']

class StudentClassRankSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentClassRank
        fields = ['rank', 'total_students', 'calculated_at']

class WeeklyTimetableSerializer(serializers.ModelSerializer):
    teacher_name = serializers.SerializerMethodField()

    class Meta:
        model = WeeklyTimetable
        fields = ['day_of_week', 'period_number', 'subject', 'teacher_name', 'start_time', 'end_time']

    def get_teacher_name(self, obj):
        if obj.teacher:
            return f"{obj.teacher.user.first_name} {obj.teacher.user.last_name}"
        return "Unknown"

class TeacherAttendanceStatsSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeacherAttendanceStats
        fields = [
            'today_attendance_rate', 'present_today', 'late_today', 'absent_today',
            'overall_attendance_rate', 'updated_at'
        ]

class TeacherAssignmentStatsSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeacherAssignmentStats
        fields = ['total_assignments', 'pending_submissions', 'graded_assignments', 'updated_at']

class TeacherReimbursementStatsSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeacherReimbursementStats
        fields = [
            'total_requested', 'pending_approval', 'approved_amount', 'paid_amount', 'updated_at'
        ]

class TeacherGradeStatsSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeacherGradeStats
        fields = [
            'pending_grades', 'graded_today', 'average_grade', 'late_submissions', 'updated_at'
        ]

# === User and Auth Serializers ===

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['phone', 'address', 'class_name', 'subject']

class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'profile']

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        serializer = UserSerializer(self.user)
        data['user'] = serializer.data
        return data

# === Admin Action Serializers ===

class AdminUserUpdateSerializer(serializers.Serializer):
    """
    Serializer for the admin action to update a user's credentials.
    """
    user_id = serializers.IntegerField(required=True)
    username = serializers.CharField(required=False, allow_blank=False)
    password = serializers.CharField(required=False, allow_blank=False, style={'input_type': 'password'})

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("This username is already taken.")
        return value
    
    def validate_password(self, value):
        validate_password(value)
        return value

# === Model Serializers with Create/Update Logic ===

class StudentSerializer(serializers.ModelSerializer):
    user = UserSerializer()
    school_class = serializers.StringRelatedField() # Display class name instead of ID

    class Meta:
        model = Student
        fields = '__all__'

    @transaction.atomic
    def create(self, validated_data):
        user_data = validated_data.pop('user')
        # Note: Password should be set during creation, assuming a default or passed in
        user = User.objects.create_user(
            username=user_data['username'],
            email=user_data.get('email', ''),
            first_name=user_data.get('first_name', ''),
            last_name=user_data.get('last_name', ''),
            role=User.Role.STUDENT
        )
        student = Student.objects.create(user=user, **validated_data)
        return student

    @transaction.atomic
    def update(self, instance, validated_data):
        user_data = validated_data.pop('user', {})
        user = instance.user

        user.email = user_data.get('email', user.email)
        user.first_name = user_data.get('first_name', user.first_name)
        user.last_name = user_data.get('last_name', user.last_name)
        user.save()

        instance.school_class = validated_data.get('school_class', instance.school_class)
        instance.save()
        return instance

class TeacherSerializer(serializers.ModelSerializer):
    user = UserSerializer()
    class Meta:
        model = Teacher
        fields = '__all__'

class PeriodSerializer(serializers.ModelSerializer):
    class Meta:
        model = Period
        fields = '__all__'

class TimetableSerializer(serializers.ModelSerializer):
    teacher = TeacherSerializer(read_only=True, allow_null=True)
    period = PeriodSerializer(read_only=True) # <-- Use the new serializer

    class Meta:
        model = Timetable
        fields = '__all__'

class FeeTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeeType
        fields = '__all__'

class FeeSerializer(serializers.ModelSerializer):
    student = StudentSerializer(read_only=True)

    class Meta:
        model = Fee
        fields = '__all__'

    def validate_amount(self, value):
        """Validate fee amount."""
        if value <= 0:
            raise serializers.ValidationError("Fee amount must be greater than zero.")
        if value > 1000000:  # Max fee amount limit
            raise serializers.ValidationError("Fee amount cannot exceed ₹10,00,000.")
        return value

    def validate_due_date(self, value):
        """Validate due date."""
        if value < timezone.now().date():
            raise serializers.ValidationError("Due date cannot be in the past.")
        if value > timezone.now().date() + timezone.timedelta(days=365*2):  # Max 2 years in future
            raise serializers.ValidationError("Due date cannot be more than 2 years in the future.")
        return value

    def validate_waived_amount(self, value):
        """Validate waived amount."""
        if value < 0:
            raise serializers.ValidationError("Waived amount cannot be negative.")
        return value

    def validate(self, data):
        """Cross-field validation."""
        amount = data.get('amount', self.instance.amount if self.instance else 0)
        waived_amount = data.get('waived_amount', self.instance.waived_amount if self.instance else 0)

        if waived_amount > amount:
            raise serializers.ValidationError("Waived amount cannot exceed fee amount.")

        return data

class PaymentSerializer(serializers.ModelSerializer):
    fee = FeeSerializer(read_only=True)
    processed_by = UserSerializer(read_only=True)
    stripe_payment_method_id = serializers.CharField(
        required=False,
        write_only=True,
        help_text="Stripe payment method ID for card payments"
    )

    class Meta:
        model = Payment
        fields = '__all__'
        read_only_fields = ['payment_date', 'processed_by']

    def validate_amount(self, value):
        """Validate payment amount."""
        if value <= 0:
            raise serializers.ValidationError("Payment amount must be greater than zero.")
        if value > 1000000:  # Max payment amount limit
            raise serializers.ValidationError("Payment amount cannot exceed ₹10,00,000.")
        return value

    def validate_transaction_id(self, value):
        """Validate transaction ID."""
        if value:
            # Sanitize transaction ID - allow only alphanumeric characters, hyphens, underscores
            if not re.match(r'^[a-zA-Z0-9\-_\.]+$', value):
                raise serializers.ValidationError("Transaction ID contains invalid characters.")

            # Check for uniqueness
            if Payment.objects.filter(transaction_id=value).exclude(
                pk=self.instance.pk if self.instance else None
            ).exists():
                raise serializers.ValidationError("Transaction ID must be unique.")

        return value

    def validate_notes(self, value):
        """Sanitize notes field."""
        if value:
            # Strip HTML tags and limit length
            value = strip_tags(value)
            if len(value) > 1000:
                raise serializers.ValidationError("Notes cannot exceed 1000 characters.")
        return value

    def validate(self, data):
        """Cross-field validation."""
        fee = self.instance.fee if self.instance else data.get('fee')
        amount = data.get('amount', self.instance.amount if self.instance else 0)
        payment_method = data.get('payment_method', self.instance.payment_method if self.instance else None)
        stripe_payment_method_id = data.get('stripe_payment_method_id')

        if fee:
            # Check if payment amount doesn't exceed outstanding balance
            outstanding = fee.get_outstanding_amount()
            if amount > outstanding:
                raise serializers.ValidationError(f"Payment amount cannot exceed outstanding balance of ₹{outstanding:.2f}")

        # Validate Stripe payment method ID
        if payment_method == 'stripe':
            if not stripe_payment_method_id:
                raise serializers.ValidationError("Stripe payment method ID is required for Stripe payments.")
            if not stripe_payment_method_id.startswith('pm_'):
                raise serializers.ValidationError("Invalid Stripe payment method ID format.")

        return data

    def create(self, validated_data):
        # Set the processed_by field to the current user
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['processed_by'] = request.user
            # Log payment creation
            logger.info(f"Payment created by {request.user.username} for fee {validated_data['fee'].id}")
        return super().create(validated_data)

class AttendanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attendance
        fields = '__all__'

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'user', 'title', 'message', 'is_read', 'created_at']
        read_only_fields = ['created_at']

class LeaveRequestSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    class Meta:
        model = LeaveRequest
        fields = '__all__'
        read_only_fields = ['user']
    def create(self, validated_data):
      validated_data['user'] = self.context['request'].user
      return super().create(validated_data)

class AssignmentSerializer(serializers.ModelSerializer):
    teacher = TeacherSerializer(read_only=True)
    class Meta:
        model = Assignment
        fields = ['id', 'title', 'description', 'due_date', 'school_class', 'teacher', 'created_at', 'allow_file_upload']
        read_only_fields = ['created_at']

    def create(self, validated_data):
        # Set the teacher based on the current user
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            try:
                teacher = Teacher.objects.get(user=request.user)
                validated_data['teacher'] = teacher
            except Teacher.DoesNotExist:
                raise serializers.ValidationError("Teacher profile not found for current user.")
        return super().create(validated_data)

class AssignmentSubmissionSerializer(serializers.ModelSerializer):
    student = StudentSerializer(read_only=True)
    assignment = AssignmentSerializer(read_only=True)
    graded_by = TeacherSerializer(read_only=True)
    is_late = serializers.SerializerMethodField()

    class Meta:
        model = AssignmentSubmission
        fields = [
            'id', 'assignment', 'student', 'submitted_at', 'status', 'text_content',
            'file_name', 'file_data', 'file_mime_type', 'grade', 'feedback',
            'graded_at', 'graded_by', 'is_late'
        ]
        read_only_fields = ['submitted_at', 'graded_at', 'graded_by']

    def get_is_late(self, obj):
        return obj.is_late()

    def create(self, validated_data):
        # Set the student based on the current user
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            try:
                student = Student.objects.get(user=request.user)
                validated_data['student'] = student
            except Student.DoesNotExist:
                raise serializers.ValidationError("Student profile not found for current user.")
        return super().create(validated_data)
class SchoolClassSerializer(serializers.ModelSerializer):
    class Meta:
        model = SchoolClass
        fields = '__all__'

class SchoolSerializer(serializers.ModelSerializer):
    logo_url = serializers.SerializerMethodField()

    class Meta:
        model = School
        fields = [
            'id', 'name', 'address', 'phone', 'email', 'website',
            'logo', 'logo_url', 'google_upi_id', 'razorpay_id',
            'academic_year', 'school_timings', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def get_logo_url(self, obj):
        if obj.logo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.logo.url)
        return None

class SchoolSettingSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = SchoolSetting
        fields = [
            'id', 'key', 'label', 'value', 'setting_type', 'required',
            'description', 'file_data', 'file_name', 'file_mime_type',
            'file_url', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'file_url']

    def get_file_url(self, obj):
        if obj.file_data and obj.file_mime_type:
            # For binary data, we could return a data URL or serve it via a view
            # For now, return None as we'll handle file display on frontend
            return None
        return None

    def create(self, validated_data):
        # Get the school (assuming single school setup)
        school = School.objects.first()
        if not school:
            school = School.objects.create(
                name="Springfield High School",
                academic_year="2024-2025",
                school_timings="8:00 AM - 3:00 PM"
            )
        validated_data['school'] = school
        return super().create(validated_data)

class GradeSerializer(serializers.ModelSerializer):
    assignment = AssignmentSerializer(read_only=True)
    class Meta:
        model = Grade
        fields = ['id', 'assignment', 'score', 'graded_date']
class SetPasswordSerializer(serializers.Serializer):
    """
    Serializer for the set password action.
    Validates that a user_id and a new_password are provided.
    """
    user_id = serializers.IntegerField(required=True)
    new_password = serializers.CharField(required=True, style={'input_type': 'password'})

    def validate_new_password(self, value):
        # You can add password strength validation here if desired
        if len(value) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters long.")
        return value

class PasswordResetRequestSerializer(serializers.Serializer):
    """
    Serializer for password reset request.
    Accepts either username or email.
    """
    identifier = serializers.CharField(required=True, help_text="Username or email address")

    def validate_identifier(self, value):
        if not value:
            raise serializers.ValidationError("This field is required.")

        # Check if it's a valid email or username format
        from django.core.validators import validate_email
        import re

        try:
            validate_email(value)
            # It's a valid email, check if user exists
            if not User.objects.filter(email__iexact=value).exists():
                raise serializers.ValidationError("No account found with this email address.")
        except:
            # Not a valid email, treat as username
            if not re.match(r'^[a-zA-Z0-9]{3,20}$', value):
                raise serializers.ValidationError("Please enter a valid email address or username (3-20 alphanumeric characters).")
            if not User.objects.filter(username__iexact=value).exists():
                raise serializers.ValidationError("No account found with this username.")

        return value

class PasswordResetConfirmSerializer(serializers.Serializer):
    """
    Serializer for password reset confirmation.
    """
    token = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, style={'input_type': 'password'})

    def validate_new_password(self, value):
        if len(value) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters long.")
        return value

# === Task Serializers ===

class TaskSerializer(serializers.ModelSerializer):
    teacher = TeacherSerializer(read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    task_type_display = serializers.CharField(source='get_task_type_display', read_only=True)

    class Meta:
        model = Task
        fields = [
            'id', 'teacher', 'title', 'description', 'task_type', 'task_type_display',
            'priority', 'priority_display', 'status', 'status_display',
            'due_date', 'due_time', 'created_at', 'updated_at', 'completed_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'completed_at']

    def create(self, validated_data):
        # Set the teacher based on the current user
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            try:
                teacher = Teacher.objects.get(user=request.user)
                validated_data['teacher'] = teacher
            except Teacher.DoesNotExist:
                raise serializers.ValidationError("Teacher profile not found for current user.")
        return super().create(validated_data)

# === Reimbursement Serializers ===

class ReimbursementTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReimbursementType
        fields = ['id', 'name', 'description', 'max_amount', 'requires_approval', 'created_at']
        read_only_fields = ['created_at']

class ReimbursementSerializer(serializers.ModelSerializer):
    teacher = serializers.SerializerMethodField()
    reimbursement_type = ReimbursementTypeSerializer(read_only=True)
    reviewed_by = UserSerializer(read_only=True)

    class Meta:
        model = Reimbursement
        fields = [
            'id', 'teacher', 'reimbursement_type', 'amount', 'description',
            'receipt_file_name', 'receipt_file_data', 'receipt_file_mime_type',
            'status', 'submitted_at', 'reviewed_at', 'reviewed_by', 'review_notes'
        ]
        read_only_fields = ['submitted_at', 'reviewed_at', 'reviewed_by']

    def get_teacher(self, obj):
        return TeacherSerializer(obj.teacher).data

    def create(self, validated_data):
        # Set the teacher based on the current user
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            try:
                teacher = Teacher.objects.get(user=request.user)
                validated_data['teacher'] = teacher
            except Teacher.DoesNotExist:
                raise serializers.ValidationError("Teacher profile not found for current user.")
        return super().create(validated_data)

# === Fee Management Serializers ===

class FeeStructureSerializer(serializers.ModelSerializer):
    fee_type = FeeTypeSerializer(read_only=True)
    school_class = SchoolClassSerializer(read_only=True)
    school = serializers.SerializerMethodField()

    class Meta:
        model = FeeStructure
        fields = ['id', 'school', 'fee_type', 'school_class', 'amount', 'is_active']
        read_only_fields = ['school']

    def get_school(self, obj):
        return SchoolSerializer(obj.school).data

class DiscountSerializer(serializers.ModelSerializer):
    student = StudentSerializer(read_only=True)
    fee = FeeSerializer(read_only=True)
    applied_by = UserSerializer(read_only=True)

    class Meta:
        model = Discount
        fields = ['id', 'student', 'fee', 'discount_type', 'value', 'reason', 'applied_by', 'applied_at']
        read_only_fields = ['applied_at', 'applied_by']

    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['applied_by'] = request.user
        return super().create(validated_data)

class RefundSerializer(serializers.ModelSerializer):
    payment = PaymentSerializer(read_only=True)
    processed_by = UserSerializer(read_only=True)

    class Meta:
        model = Refund
        fields = ['id', 'payment', 'amount', 'reason', 'status', 'processed_by', 'processed_at']
        read_only_fields = ['processed_at', 'processed_by']

    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['processed_by'] = request.user
        return super().create(validated_data)

class PaymentPlanSerializer(serializers.ModelSerializer):
    fee = FeeSerializer(read_only=True)

    class Meta:
        model = PaymentPlan
        fields = ['id', 'fee', 'total_installments', 'installment_amount', 'start_date', 'end_date']

class FeeReportSerializer(serializers.ModelSerializer):
    school = SchoolSerializer(read_only=True)
    generated_by = UserSerializer(read_only=True)

    class Meta:
        model = FeeReport
        fields = ['id', 'school', 'report_type', 'filters', 'generated_by', 'generated_at', 'file_path']
        read_only_fields = ['generated_at', 'generated_by']

    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['generated_by'] = request.user
        # Get the school (assuming single school setup)
        school = School.objects.first()
        if school:
            validated_data['school'] = school
        return super().create(validated_data)

# Enhanced Fee and Payment Serializers with nested relationships

class EnhancedFeeSerializer(serializers.ModelSerializer):
    student = StudentSerializer(read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)
    discounts = DiscountSerializer(many=True, read_only=True)
    payment_plan = PaymentPlanSerializer(read_only=True)
    total_paid = serializers.SerializerMethodField()
    outstanding_balance = serializers.SerializerMethodField()
    is_overdue = serializers.SerializerMethodField()

    class Meta:
        model = Fee
        fields = [
            'id', 'student', 'amount', 'due_date', 'status', 'overdue_date',
            'waived_amount', 'payments', 'discounts', 'payment_plan',
            'total_paid', 'outstanding_balance', 'is_overdue'
        ]
        read_only_fields = ['status']  # Status is updated automatically

    def get_total_paid(self, obj):
        return obj.payments.filter(status=Payment.Status.COMPLETED).aggregate(
            total=models.Sum('amount')
        )['total'] or 0

    def get_outstanding_balance(self, obj):
        total_paid = self.get_total_paid(obj)
        total_discounts = obj.discounts.aggregate(
            total=models.Sum('value')
        )['total'] or 0
        return max(0, obj.amount - total_paid - total_discounts - obj.waived_amount)

    def get_is_overdue(self, obj):
        from django.utils import timezone
        return obj.due_date < timezone.now().date() and obj.status in [Fee.Status.UNPAID, Fee.Status.PARTIAL]

class EnhancedPaymentSerializer(serializers.ModelSerializer):
    fee = EnhancedFeeSerializer(read_only=True)
    processed_by = UserSerializer(read_only=True)
    refunds = RefundSerializer(many=True, read_only=True)

    class Meta:
        model = Payment
        fields = [
            'id', 'fee', 'amount', 'payment_method', 'transaction_id',
            'status', 'payment_date', 'notes', 'processed_by', 'refunds'
        ]
        read_only_fields = ['payment_date', 'processed_by']

    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['processed_by'] = request.user
        return super().create(validated_data)

# === User and Auth Serializers ===

