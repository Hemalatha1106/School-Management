from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator, MaxValueValidator
import logging

# Custom Exceptions for Fee Management
class FeeError(Exception):
    """Base exception for fee-related errors."""
    pass

class PaymentProcessingError(FeeError):
    """Exception raised when payment processing fails."""
    pass

class InsufficientFundsError(FeeError):
    """Exception raised when there are insufficient funds for a transaction."""
    pass

class InvalidFeeAmountError(FeeError):
    """Exception raised when fee amount is invalid."""
    pass

class PermissionDeniedError(FeeError):
    """Exception raised when user doesn't have permission for an operation."""
    pass

class FeeAlreadyPaidError(FeeError):
    """Exception raised when trying to process payment for already paid fee."""
    pass

# Setup logging
logger = logging.getLogger('api.fee_operations')

# === School Settings Model ===

class School(models.Model):
    name = models.CharField(max_length=200, default="Springfield High School")
    address = models.TextField(blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    website = models.URLField(blank=True, null=True)
    logo = models.ImageField(upload_to='school_logos/', blank=True, null=True)
    google_upi_id = models.CharField(max_length=100, blank=True, null=True, help_text="Google UPI ID for fee payments")
    razorpay_id = models.CharField(max_length=100, blank=True, null=True, help_text="Razorpay merchant ID")
    academic_year = models.CharField(max_length=20, default="2024-2025")
    school_timings = models.CharField(max_length=50, default="8:00 AM - 3:00 PM")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "School"
        verbose_name_plural = "School Settings"

    def __str__(self):
        return self.name

# === User and Profile Models ===

class User(AbstractUser):
    class Role(models.TextChoices):
        PRINCIPAL = "principal", "Principal"
        TEACHER = "teacher", "Teacher"
        STUDENT = "student", "Student"

    role = models.CharField(max_length=10, choices=Role.choices, default=Role.STUDENT)
    is_account_locked = models.BooleanField(default=False)
    failed_login_attempts = models.PositiveIntegerField(default=0)
    last_login_attempt = models.DateTimeField(null=True, blank=True)
    account_locked_until = models.DateTimeField(null=True, blank=True)
    password_changed_at = models.DateTimeField(null=True, blank=True)

    def has_fee_permission(self, fee):
        """Check if user has permission to access/modify a fee."""
        if self.role == self.Role.PRINCIPAL:
            return True
        elif self.role == self.Role.TEACHER:
            return True  # Teachers can manage fees
        elif self.role == self.Role.STUDENT:
            return fee.student.user == self
        return False

    def has_payment_permission(self, payment):
        """Check if user has permission to access/modify a payment."""
        if self.role == self.Role.PRINCIPAL:
            return True
        elif self.role == self.Role.TEACHER:
            return True  # Teachers can process payments
        elif self.role == self.Role.STUDENT:
            return payment.fee.student.user == self
        return False

    def can_manage_students(self):
        """Check if user can manage student data."""
        return self.role in [self.Role.PRINCIPAL, self.Role.TEACHER]

    def can_process_payments(self):
        """Check if user can process payments."""
        return self.role in [self.Role.PRINCIPAL, self.Role.TEACHER]

    def is_account_locked_check(self):
        """Check if account is currently locked."""
        if not self.is_account_locked:
            return False

        if self.account_locked_until and timezone.now() > self.account_locked_until:
            # Unlock account if lock period has expired
            self.is_account_locked = False
            self.account_locked_until = None
            self.save()
            return False

        return True

    def record_failed_login(self):
        """Record a failed login attempt."""
        self.failed_login_attempts += 1
        self.last_login_attempt = timezone.now()

        # Lock account after 5 failed attempts
        if self.failed_login_attempts >= 5:
            self.is_account_locked = True
            self.account_locked_until = timezone.now() + timedelta(hours=1)  # Lock for 1 hour

        self.save()

    def record_successful_login(self):
        """Record a successful login."""
        self.failed_login_attempts = 0
        self.last_login_attempt = timezone.now()
        self.save()

class Period(models.Model):
    period_number = models.PositiveIntegerField(unique=True, help_text="e.g., 1 for 1st period")
    start_time = models.TimeField()
    end_time = models.TimeField()

    class Meta:
        ordering = ['period_number']

    def __str__(self):
        return f"Period {self.period_number} ({self.start_time.strftime('%H:%M')} - {self.end_time.strftime('%H:%M')})"

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    phone = models.CharField(max_length=20, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    class_name = models.CharField(max_length=100, blank=True, null=True)
    subject = models.CharField(max_length=100, blank=True, null=True)

    def __str__(self):
        return self.user.username

# === Academic Models ===

class SchoolClass(models.Model):
    name = models.CharField(max_length=100, unique=True)
    teacher = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='taught_classes', limit_choices_to={'role': User.Role.TEACHER})
    
    def __str__(self):
        return self.name

# === Dynamic School Settings Model ===

class SchoolSetting(models.Model):
    class SettingType(models.TextChoices):
        TEXT = 'text', 'Text'
        EMAIL = 'email', 'Email'
        URL = 'url', 'URL'
        TEXTAREA = 'textarea', 'Textarea'
        FILE = 'file', 'File'

    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name='settings')
    key = models.CharField(max_length=100, help_text="Unique key for the setting")
    label = models.CharField(max_length=200, help_text="Display label for the setting")
    value = models.TextField(blank=True, help_text="The setting value")
    setting_type = models.CharField(max_length=20, choices=SettingType.choices, default=SettingType.TEXT)
    required = models.BooleanField(default=False, help_text="Whether this setting is required")
    description = models.TextField(blank=True, help_text="Optional description")
    file_data = models.BinaryField(blank=True, null=True, help_text="Binary data for file uploads")
    file_name = models.CharField(max_length=255, blank=True, help_text="Original file name")
    file_mime_type = models.CharField(max_length=100, blank=True, help_text="File MIME type")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('school', 'key')
        ordering = ['created_at']

    def __str__(self):
        return f"{self.school.name}: {self.label}"

class Student(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, primary_key=True, limit_choices_to={'role': User.Role.STUDENT})
    school_class = models.ForeignKey(SchoolClass, on_delete=models.SET_NULL, null=True, blank=True, related_name='students')

    def __str__(self):
        return self.user.get_full_name() or self.user.username

class Teacher(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, primary_key=True, limit_choices_to={'role': User.Role.TEACHER})
    salary = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Monthly salary in rupees")

    def __str__(self):
        return self.user.get_full_name() or self.user.username

class Attendance(models.Model):
    class Status(models.TextChoices):
        PRESENT = 'present', 'Present'
        ABSENT = 'absent', 'Absent'
        LATE = 'late', 'Late'

    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='attendance_records')
    date = models.DateField()
    status = models.CharField(max_length=10, choices=Status.choices)
    
    class Meta:
        unique_together = ('student', 'date')

class Timetable(models.Model):
    class Day(models.TextChoices):
        MONDAY = 'MON', 'Monday'
        TUESDAY = 'TUE', 'Tuesday'
        WEDNESDAY = 'WED', 'Wednesday'
        THURSDAY = 'THU', 'Thursday'
        FRIDAY = 'FRI', 'Friday'

    school_class = models.ForeignKey(SchoolClass, on_delete=models.CASCADE, related_name='timetable_entries')
    day_of_week = models.CharField(max_length=3, choices=Day.choices)
    start_time = models.TimeField()
    end_time = models.TimeField()
    subject = models.CharField(max_length=100)
    teacher = models.ForeignKey(Teacher, on_delete=models.SET_NULL, null=True)

class Assignment(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    due_date = models.DateField()
    school_class = models.ForeignKey(SchoolClass, on_delete=models.CASCADE, related_name='assignments')
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE, related_name='created_assignments')
    created_at = models.DateTimeField(auto_now_add=True)
    allow_file_upload = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.title} for {self.school_class.name}"

class AssignmentSubmission(models.Model):
    class Status(models.TextChoices):
        SUBMITTED = 'submitted', 'Submitted'
        GRADED = 'graded', 'Graded'
        LATE = 'late', 'Late'

    assignment = models.ForeignKey(Assignment, on_delete=models.CASCADE, related_name='submissions')
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='assignment_submissions')
    submitted_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.SUBMITTED)
    text_content = models.TextField(blank=True)
    file_name = models.CharField(max_length=255, blank=True)
    file_data = models.BinaryField(blank=True, null=True)
    file_mime_type = models.CharField(max_length=100, blank=True)
    grade = models.PositiveIntegerField(null=True, blank=True)  # Score out of 100
    feedback = models.TextField(blank=True)
    graded_at = models.DateTimeField(null=True, blank=True)
    graded_by = models.ForeignKey(Teacher, on_delete=models.SET_NULL, null=True, blank=True, related_name='graded_submissions')

    class Meta:
        unique_together = ('assignment', 'student')

    def __str__(self):
        return f"{self.student.user.get_full_name()} - {self.assignment.title}"

    def is_late(self):
        return self.submitted_at.date() > self.assignment.due_date

class Grade(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='grades')
    assignment = models.ForeignKey(Assignment, on_delete=models.CASCADE, related_name='grades')
    score = models.PositiveIntegerField() # Score out of 100
    graded_date = models.DateField(auto_now_add=True)

    def __str__(self):
        return f"Grade for {self.student} on {self.assignment.title}: {self.score}%"

# === Finance Models ===

class FeeType(models.Model):
    class Category(models.TextChoices):
        ADMISSION = "Admission", "Admission"
        ANNUAL = "Annual", "Annual"
        TUITION = "Tuition", "Tuition"
        TRANSPORT = "Transport", "Transport"
        OTHER = "Other", "Other"

    name = models.CharField(max_length=100, unique=True)
    description = models.CharField(max_length=255, blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    category = models.CharField(max_length=20, choices=Category.choices)

    def __str__(self):
        return f"{self.name} ({self.category}) - ₹{self.amount}"

class Fee(models.Model):
    class Status(models.TextChoices):
        PAID = 'paid', 'Paid'
        UNPAID = 'unpaid', 'Unpaid'
        PARTIAL = 'partial', 'Partial'

    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='fees')
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0.01)]
    )
    due_date = models.DateField()
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.UNPAID)
    overdue_date = models.DateField(null=True, blank=True)
    waived_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0.00,
        validators=[MinValueValidator(0.00)]
    )
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['due_date']
        indexes = [
            models.Index(fields=['student', 'status']),
            models.Index(fields=['due_date']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"Fee for {self.student} due {self.due_date} - {self.status}"

    def clean(self):
        """Validate fee data."""
        if self.amount <= 0:
            raise ValidationError("Fee amount must be greater than zero.")
        if self.waived_amount > self.amount:
            raise ValidationError("Waived amount cannot exceed fee amount.")
        if self.due_date < timezone.now().date():
            self.status = self.Status.UNPAID  # Ensure overdue fees are marked as unpaid

    def save(self, *args, **kwargs):
        self.clean()
        logger.info(f"Fee {self.id or 'new'} saved for student {self.student.user.username}")
        super().save(*args, **kwargs)

    def get_outstanding_amount(self):
        """Calculate the outstanding amount for this fee."""
        total_paid = self.payments.filter(status=Payment.Status.COMPLETED).aggregate(
            total=models.Sum('amount')
        )['total'] or 0
        return max(0, self.amount - self.waived_amount - total_paid)

    def is_overdue(self):
        """Check if the fee is overdue."""
        return self.due_date < timezone.now().date() and self.get_outstanding_amount() > 0

    def can_process_payment(self, amount, user):
        """Check if a payment can be processed for this fee."""
        if self.status == self.Status.PAID:
            raise FeeAlreadyPaidError("Fee is already fully paid.")

        if amount <= 0:
            raise InvalidFeeAmountError("Payment amount must be greater than zero.")

        if amount > self.get_outstanding_amount():
            raise InvalidFeeAmountError("Payment amount exceeds outstanding balance.")

        # Check user permissions
        if user.role == User.Role.STUDENT and self.student.user != user:
            raise PermissionDeniedError("Students can only pay their own fees.")

        return True

class Payment(models.Model):
    class PaymentMethod(models.TextChoices):
        UPI = 'upi', 'UPI'
        CASH = 'cash', 'Cash'
        BANK_TRANSFER = 'bank_transfer', 'Bank Transfer'
        CHEQUE = 'cheque', 'Cheque'
        STRIPE = 'stripe', 'Stripe'
        OTHER = 'other', 'Other'

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        PROCESSING = 'processing', 'Processing'
        COMPLETED = 'completed', 'Completed'
        FAILED = 'failed', 'Failed'
        CANCELLED = 'cancelled', 'Cancelled'
        REFUNDED = 'refunded', 'Refunded'

    fee = models.ForeignKey(Fee, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0.01)]
    )
    payment_method = models.CharField(max_length=20, choices=PaymentMethod.choices, default=PaymentMethod.UPI)
    transaction_id = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        unique=True,
        help_text="UPI transaction ID or reference number"
    )
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    payment_date = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True, null=True)
    processed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='processed_payments')
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, null=True)
    stripe_payment_intent_id = models.CharField(max_length=255, blank=True, null=True)
    stripe_charge_id = models.CharField(max_length=255, blank=True, null=True)
    stripe_customer_id = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        ordering = ['-payment_date']
        indexes = [
            models.Index(fields=['fee', 'status']),
            models.Index(fields=['transaction_id']),
            models.Index(fields=['payment_date']),
        ]

    def __str__(self):
        return f"Payment of ₹{self.amount} for {self.fee.student} - {self.status}"

    def clean(self):
        """Validate payment data."""
        if self.amount <= 0:
            raise ValidationError("Payment amount must be greater than zero.")

        if self.transaction_id and Payment.objects.filter(
            transaction_id=self.transaction_id
        ).exclude(pk=self.pk).exists():
            raise ValidationError("Transaction ID must be unique.")

    def save(self, *args, **kwargs):
        self.clean()

        # Log payment operation
        logger.info(f"Payment {self.id or 'new'} saved for fee {self.fee.id} - Status: {self.status}")

        # If payment is completed and fee is not already paid, update fee status
        if self.status == self.Status.COMPLETED and self.fee.status != Fee.Status.PAID:
            # Check if total payments for this fee equal or exceed the fee amount
            total_paid = Payment.objects.filter(
                fee=self.fee,
                status=self.Status.COMPLETED
            ).exclude(pk=self.pk).aggregate(total=models.Sum('amount'))['total'] or 0

            if total_paid + self.amount >= self.fee.amount - self.fee.waived_amount:
                self.fee.status = Fee.Status.PAID
                self.fee.save()
                logger.info(f"Fee {self.fee.id} marked as fully paid")

        super().save(*args, **kwargs)

    def can_refund(self, user):
        """Check if payment can be refunded."""
        if self.status != self.Status.COMPLETED:
            raise PaymentProcessingError("Only completed payments can be refunded.")

        if user.role not in [User.Role.PRINCIPAL, User.Role.TEACHER]:
            raise PermissionDeniedError("Only principals and teachers can process refunds.")

        # Check if refund already exists
        if hasattr(self, 'refund') and self.refund.status == 'Processed':
            raise PaymentProcessingError("Refund already processed for this payment.")

        return True

    def process_refund(self, amount, reason, processed_by):
        """Process a refund for this payment."""
        if amount > self.amount:
            raise InvalidFeeAmountError("Refund amount cannot exceed payment amount.")

        from .models import Refund  # Import here to avoid circular import
        refund = Refund.objects.create(
            payment=self,
            amount=amount,
            reason=reason,
            processed_by=processed_by,
            status='Processed'
        )

        self.status = self.Status.REFUNDED
        self.save()

        logger.warning(f"Refund processed for payment {self.id} - Amount: ₹{amount}")
        return refund

# === Additional Fee Management Models ===

class AuditLog(models.Model):
    model_name = models.CharField(max_length=100)
    object_id = models.PositiveIntegerField()
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    action = models.CharField(max_length=50)
    old_value = models.TextField(blank=True)
    new_value = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

class PaymentGateway(models.Model):
    school = models.ForeignKey(School, on_delete=models.CASCADE)
    gateway_type = models.CharField(max_length=50)
    api_key = models.CharField(max_length=255)
    secret_key = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class TransactionLog(models.Model):
    payment = models.ForeignKey(Payment, on_delete=models.CASCADE)
    gateway = models.ForeignKey(PaymentGateway, on_delete=models.CASCADE)
    transaction_id = models.CharField(max_length=100)
    status = models.CharField(max_length=50)
    response_data = models.JSONField(default=dict)
    timestamp = models.DateTimeField(auto_now_add=True)

class FeeHistory(models.Model):
    fee = models.ForeignKey(Fee, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    action = models.CharField(max_length=50)
    old_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True)
    new_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True)
    old_status = models.CharField(max_length=10, null=True)
    new_status = models.CharField(max_length=10, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)

class PaymentHistory(models.Model):
    payment = models.ForeignKey(Payment, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    action = models.CharField(max_length=50)
    old_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True)
    new_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True)
    old_status = models.CharField(max_length=10, null=True)
    new_status = models.CharField(max_length=10, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)

class FeeStructure(models.Model):
    school = models.ForeignKey(School, on_delete=models.CASCADE)
    fee_type = models.ForeignKey(FeeType, on_delete=models.CASCADE)
    school_class = models.ForeignKey(SchoolClass, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    is_active = models.BooleanField(default=True)

class Discount(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE)
    fee = models.ForeignKey(Fee, on_delete=models.CASCADE)
    discount_type = models.CharField(max_length=20, choices=[('percentage', 'Percentage'), ('amount', 'Amount')])
    value = models.DecimalField(max_digits=10, decimal_places=2)
    reason = models.TextField(blank=True)
    applied_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    applied_at = models.DateTimeField(auto_now_add=True)

class Refund(models.Model):
    payment = models.ForeignKey(Payment, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=[('Pending', 'Pending'), ('Processed', 'Processed'), ('Rejected', 'Rejected')])
    processed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    processed_at = models.DateTimeField(null=True, blank=True)

class LateFee(models.Model):
    fee = models.ForeignKey(Fee, on_delete=models.CASCADE)
    penalty_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True)
    penalty_percentage = models.DecimalField(max_digits=5, decimal_places=2, null=True)
    due_date = models.DateField()
    calculated_at = models.DateTimeField(auto_now_add=True)

class PaymentPlan(models.Model):
    fee = models.ForeignKey(Fee, on_delete=models.CASCADE)
    total_installments = models.PositiveIntegerField()
    installment_amount = models.DecimalField(max_digits=10, decimal_places=2)
    start_date = models.DateField()
    end_date = models.DateField()

class FeeReport(models.Model):
    school = models.ForeignKey(School, on_delete=models.CASCADE)
    report_type = models.CharField(max_length=50)
    filters = models.JSONField(default=dict)
    generated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    generated_at = models.DateTimeField(auto_now_add=True)
    file_path = models.CharField(max_length=255, blank=True)

# === Leave & Notification Models ===

class LeaveRequest(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='leave_requests')
    start_date = models.DateField()
    end_date = models.DateField()
    reason = models.TextField()
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)

class Notification(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=200)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Notification for {self.user.username}: {self.title}"

# === Task Management Models ===

class Task(models.Model):
    class Priority(models.TextChoices):
        LOW = 'low', 'Low'
        MEDIUM = 'medium', 'Medium'
        HIGH = 'high', 'High'
        URGENT = 'urgent', 'Urgent'

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        IN_PROGRESS = 'in_progress', 'In Progress'
        COMPLETED = 'completed', 'Completed'
        CANCELLED = 'cancelled', 'Cancelled'

    class TaskType(models.TextChoices):
        LESSON_PLANNING = 'lesson_planning', 'Lesson Planning'
        GRADE_ASSIGNMENTS = 'grade_assignments', 'Grade Assignments'
        ATTENDANCE_MARKING = 'attendance_marking', 'Attendance Marking'
        PARENT_MEETINGS = 'parent_meetings', 'Parent Meetings'
        CLASS_PREPARATION = 'class_preparation', 'Class Preparation'
        ADMINISTRATIVE = 'administrative', 'Administrative'
        OTHER = 'other', 'Other'

    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE, related_name='tasks')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    task_type = models.CharField(max_length=20, choices=TaskType.choices, default=TaskType.OTHER)
    priority = models.CharField(max_length=10, choices=Priority.choices, default=Priority.MEDIUM)
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.PENDING)
    due_date = models.DateField()
    due_time = models.TimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['due_date', 'due_time', 'priority']

    def __str__(self):
        return f"{self.teacher.user.get_full_name()}: {self.title}"

    def mark_completed(self):
        """Mark the task as completed and set completion timestamp."""
        self.status = self.Status.COMPLETED
        self.completed_at = timezone.now()
        self.save()

    def mark_in_progress(self):
        """Mark the task as in progress."""
        self.status = self.Status.IN_PROGRESS
        self.save()

# === Reimbursement Models ===

class ReimbursementType(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    max_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    requires_approval = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Reimbursement(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        APPROVED = 'approved', 'Approved'
        REJECTED = 'rejected', 'Rejected'
        PAID = 'paid', 'Paid'

    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE, related_name='reimbursements')
    reimbursement_type = models.ForeignKey(ReimbursementType, on_delete=models.CASCADE, related_name='reimbursements')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.TextField()
    receipt_file_name = models.CharField(max_length=255, blank=True)
    receipt_file_data = models.BinaryField(blank=True, null=True)
    receipt_file_mime_type = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    submitted_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_reimbursements')
    review_notes = models.TextField(blank=True)

    def __str__(self):
        return f"{self.teacher.user.get_full_name()} - {self.reimbursement_type.name} - ₹{self.amount}"

# === Dashboard Stats Models ===

class LibraryStats(models.Model):
    """Library statistics for students."""
    student = models.OneToOneField(Student, on_delete=models.CASCADE, related_name='library_stats')
    books_borrowed = models.PositiveIntegerField(default=0)
    books_due_soon = models.PositiveIntegerField(default=0)  # Due within 7 days
    books_overdue = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Library stats for {self.student}"

class StudentClassRank(models.Model):
    """Class rank information for students."""
    student = models.OneToOneField(Student, on_delete=models.CASCADE, related_name='class_rank')
    rank = models.PositiveIntegerField()
    total_students = models.PositiveIntegerField()
    calculated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.student} - Rank {self.rank} of {self.total_students}"

class WeeklyTimetable(models.Model):
    """Weekly timetable entries for classes."""
    school_class = models.ForeignKey(SchoolClass, on_delete=models.CASCADE, related_name='weekly_timetable')
    day_of_week = models.CharField(max_length=10, choices=[
        ('monday', 'Monday'),
        ('tuesday', 'Tuesday'),
        ('wednesday', 'Wednesday'),
        ('thursday', 'Thursday'),
        ('friday', 'Friday'),
    ])
    period_number = models.PositiveIntegerField()
    subject = models.CharField(max_length=100)
    teacher = models.ForeignKey(Teacher, on_delete=models.SET_NULL, null=True, related_name='weekly_schedule')
    start_time = models.TimeField()
    end_time = models.TimeField()

    class Meta:
        unique_together = ('school_class', 'day_of_week', 'period_number')
        ordering = ['day_of_week', 'period_number']

    def __str__(self):
        return f"{self.school_class.name} - {self.day_of_week} Period {self.period_number}: {self.subject}"

class TeacherAttendanceStats(models.Model):
    """Attendance statistics for teachers."""
    teacher = models.OneToOneField(Teacher, on_delete=models.CASCADE, related_name='attendance_stats')
    today_attendance_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)  # Percentage
    present_today = models.PositiveIntegerField(default=0)
    late_today = models.PositiveIntegerField(default=0)
    absent_today = models.PositiveIntegerField(default=0)
    overall_attendance_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)  # Percentage
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Attendance stats for {self.teacher}"

class TeacherAssignmentStats(models.Model):
    """Assignment statistics for teachers."""
    teacher = models.OneToOneField(Teacher, on_delete=models.CASCADE, related_name='assignment_stats')
    total_assignments = models.PositiveIntegerField(default=0)
    pending_submissions = models.PositiveIntegerField(default=0)
    graded_assignments = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Assignment stats for {self.teacher}"

class TeacherReimbursementStats(models.Model):
    """Reimbursement statistics for teachers."""
    teacher = models.OneToOneField(Teacher, on_delete=models.CASCADE, related_name='reimbursement_stats')
    total_requested = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    pending_approval = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    approved_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    paid_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Reimbursement stats for {self.teacher}"

class TeacherGradeStats(models.Model):
    """Grade statistics for teachers."""
    teacher = models.OneToOneField(Teacher, on_delete=models.CASCADE, related_name='grade_stats')
    pending_grades = models.PositiveIntegerField(default=0)
    graded_today = models.PositiveIntegerField(default=0)
    average_grade = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)  # Percentage
    late_submissions = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Grade stats for {self.teacher}"