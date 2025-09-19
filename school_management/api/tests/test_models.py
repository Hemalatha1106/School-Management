import pytest
from django.test import TestCase
from django.core.exceptions import ValidationError
from django.utils import timezone
from decimal import Decimal
from datetime import timedelta

from ..models import *
from .test_utils import *


class FeeModelTest(TestCase):
    """Test cases for Fee model."""

    def setUp(self):
        """Set up test data."""
        self.scenario = create_complete_fee_scenario()
        self.fee = self.scenario['fee']
        self.student = self.scenario['student']
        self.principal = self.scenario['principal_user']

    def test_fee_creation(self):
        """Test basic fee creation."""
        fee = Fee.objects.create(
            student=self.student,
            amount=Decimal('1000.00'),
            due_date=timezone.now().date() + timedelta(days=30)
        )
        self.assertEqual(fee.status, Fee.Status.UNPAID)
        self.assertEqual(fee.waived_amount, Decimal('0.00'))
        self.assertIsNotNone(fee.created_at)

    def test_fee_validation_amount_zero(self):
        """Test fee validation with zero amount."""
        with self.assertRaises(ValidationError):
            Fee.objects.create(
                student=self.student,
                amount=Decimal('0.00'),
                due_date=timezone.now().date() + timedelta(days=30)
            )

    def test_fee_validation_negative_amount(self):
        """Test fee validation with negative amount."""
        with self.assertRaises(ValidationError):
            Fee.objects.create(
                student=self.student,
                amount=Decimal('-100.00'),
                due_date=timezone.now().date() + timedelta(days=30)
            )

    def test_fee_validation_waived_amount_exceeds_total(self):
        """Test fee validation when waived amount exceeds total amount."""
        with self.assertRaises(ValidationError):
            Fee.objects.create(
                student=self.student,
                amount=Decimal('1000.00'),
                waived_amount=Decimal('1500.00'),
                due_date=timezone.now().date() + timedelta(days=30)
            )

    def test_fee_str_representation(self):
        """Test fee string representation."""
        expected = f"Fee for {self.student} due {self.fee.due_date} - {self.fee.status}"
        self.assertEqual(str(self.fee), expected)

    def test_get_outstanding_amount_no_payments(self):
        """Test outstanding amount calculation with no payments."""
        self.assertEqual(self.fee.get_outstanding_amount(), self.fee.amount)

    def test_get_outstanding_amount_with_payments(self):
        """Test outstanding amount calculation with payments."""
        # Create additional payment
        Payment.objects.create(
            fee=self.fee,
            amount=Decimal('1000.00'),
            payment_method=Payment.PaymentMethod.CASH,
            status=Payment.Status.COMPLETED,
            processed_by=self.principal
        )
        expected_outstanding = self.fee.amount - Decimal('4000.00')  # 5000 - 3000 - 1000
        self.assertEqual(self.fee.get_outstanding_amount(), expected_outstanding)

    def test_get_outstanding_amount_with_waiver(self):
        """Test outstanding amount calculation with waiver."""
        self.fee.waived_amount = Decimal('500.00')
        self.fee.save()
        expected_outstanding = self.fee.amount - self.fee.waived_amount - Decimal('3000.00')
        self.assertEqual(self.fee.get_outstanding_amount(), expected_outstanding)

    def test_is_overdue_future_date(self):
        """Test overdue check for future due date."""
        self.assertFalse(self.fee.is_overdue())

    def test_is_overdue_past_date(self):
        """Test overdue check for past due date."""
        self.fee.due_date = timezone.now().date() - timedelta(days=1)
        self.fee.save()
        self.assertTrue(self.fee.is_overdue())

    def test_is_overdue_paid_fee(self):
        """Test overdue check for paid fee."""
        # Make fee overdue but fully paid
        self.fee.due_date = timezone.now().date() - timedelta(days=30)
        self.fee.status = Fee.Status.PAID
        self.fee.save()
        self.assertFalse(self.fee.is_overdue())

    def test_can_process_payment_valid(self):
        """Test payment processing permission check - valid case."""
        result = self.fee.can_process_payment(Decimal('1000.00'), self.principal)
        self.assertTrue(result)

    def test_can_process_payment_fee_already_paid(self):
        """Test payment processing permission check - fee already paid."""
        self.fee.status = Fee.Status.PAID
        self.fee.save()
        with self.assertRaises(FeeAlreadyPaidError):
            self.fee.can_process_payment(Decimal('1000.00'), self.principal)

    def test_can_process_payment_zero_amount(self):
        """Test payment processing permission check - zero amount."""
        with self.assertRaises(InvalidFeeAmountError):
            self.fee.can_process_payment(Decimal('0.00'), self.principal)

    def test_can_process_payment_exceeds_balance(self):
        """Test payment processing permission check - exceeds outstanding balance."""
        with self.assertRaises(InvalidFeeAmountError):
            self.fee.can_process_payment(Decimal('3000.00'), self.principal)

    def test_fee_status_update_on_payment_completion(self):
        """Test that fee status updates when payment is completed."""
        # Create payment that covers remaining balance
        Payment.objects.create(
            fee=self.fee,
            amount=Decimal('2000.00'),
            payment_method=Payment.PaymentMethod.UPI,
            status=Payment.Status.COMPLETED,
            processed_by=self.principal
        )
        self.fee.refresh_from_db()
        self.assertEqual(self.fee.status, Fee.Status.PAID)


class PaymentModelTest(TestCase):
    """Test cases for Payment model."""

    def setUp(self):
        """Set up test data."""
        self.scenario = create_complete_fee_scenario()
        self.fee = self.scenario['fee']
        self.payment = self.scenario['payment']
        self.principal = self.scenario['principal_user']

    def test_payment_creation(self):
        """Test basic payment creation."""
        payment = Payment.objects.create(
            fee=self.fee,
            amount=Decimal('500.00'),
            payment_method=Payment.PaymentMethod.UPI,
            transaction_id="TEST001",
            processed_by=self.principal
        )
        self.assertEqual(payment.status, Payment.Status.PENDING)
        self.assertIsNotNone(payment.payment_date)

    def test_payment_validation_zero_amount(self):
        """Test payment validation with zero amount."""
        with self.assertRaises(ValidationError):
            Payment.objects.create(
                fee=self.fee,
                amount=Decimal('0.00'),
                payment_method=Payment.PaymentMethod.UPI,
                processed_by=self.principal
            )

    def test_payment_validation_negative_amount(self):
        """Test payment validation with negative amount."""
        with self.assertRaises(ValidationError):
            Payment.objects.create(
                fee=self.fee,
                amount=Decimal('-100.00'),
                payment_method=Payment.PaymentMethod.UPI,
                processed_by=self.principal
            )

    def test_payment_validation_duplicate_transaction_id(self):
        """Test payment validation with duplicate transaction ID."""
        Payment.objects.create(
            fee=self.fee,
            amount=Decimal('100.00'),
            payment_method=Payment.PaymentMethod.UPI,
            transaction_id="DUPLICATE123",
            processed_by=self.principal
        )

        with self.assertRaises(ValidationError):
            Payment.objects.create(
                fee=self.fee,
                amount=Decimal('200.00'),
                payment_method=Payment.PaymentMethod.UPI,
                transaction_id="DUPLICATE123",
                processed_by=self.principal
            )

    def test_payment_str_representation(self):
        """Test payment string representation."""
        expected = f"Payment of ₹{self.payment.amount} for {self.fee.student} - {self.payment.status}"
        self.assertEqual(str(self.payment), expected)

    def test_can_refund_completed_payment(self):
        """Test refund permission check for completed payment."""
        result = self.payment.can_refund(self.principal)
        self.assertTrue(result)

    def test_can_refund_pending_payment(self):
        """Test refund permission check for pending payment."""
        self.payment.status = Payment.Status.PENDING
        self.payment.save()
        with self.assertRaises(PaymentProcessingError):
            self.payment.can_refund(self.principal)

    def test_can_refund_insufficient_permissions(self):
        """Test refund permission check with insufficient permissions."""
        student_user = User.objects.create_user(
            username='student_refund',
            email='student@test.com',
            role=User.Role.STUDENT
        )
        with self.assertRaises(PermissionDeniedError):
            self.payment.can_refund(student_user)

    def test_process_refund_valid(self):
        """Test refund processing - valid case."""
        refund_amount = Decimal('1500.00')
        refund = self.payment.process_refund(refund_amount, "Test refund", self.principal)

        self.assertEqual(refund.amount, refund_amount)
        self.assertEqual(refund.reason, "Test refund")
        self.assertEqual(refund.processed_by, self.principal)

        # Check payment status changed to refunded
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, Payment.Status.REFUNDED)

    def test_process_refund_exceeds_payment_amount(self):
        """Test refund processing - exceeds payment amount."""
        with self.assertRaises(InvalidFeeAmountError):
            self.payment.process_refund(Decimal('4000.00'), "Test refund", self.principal)

    def test_payment_status_update_triggers_fee_status_update(self):
        """Test that changing payment status updates fee status."""
        # Create a new payment
        new_payment = Payment.objects.create(
            fee=self.fee,
            amount=Decimal('2000.00'),
            payment_method=Payment.PaymentMethod.CASH,
            status=Payment.Status.PENDING,
            processed_by=self.principal
        )

        # Change status to completed
        new_payment.status = Payment.Status.COMPLETED
        new_payment.save()

        # Fee should be marked as paid
        self.fee.refresh_from_db()
        self.assertEqual(self.fee.status, Fee.Status.PAID)


class UserModelTest(TestCase):
    """Test cases for User model permissions."""

    def setUp(self):
        """Set up test data."""
        self.scenario = create_complete_fee_scenario()
        self.student_user = self.scenario['student_user']
        self.teacher_user = self.scenario['teacher_user']
        self.principal_user = self.scenario['principal_user']
        self.fee = self.scenario['fee']

    def test_principal_has_fee_permission(self):
        """Test that principal has permission for any fee."""
        self.assertTrue(self.principal_user.has_fee_permission(self.fee))

    def test_teacher_has_fee_permission(self):
        """Test that teacher has permission for any fee."""
        self.assertTrue(self.teacher_user.has_fee_permission(self.fee))

    def test_student_has_fee_permission_own_fee(self):
        """Test that student has permission for their own fee."""
        self.assertTrue(self.student_user.has_fee_permission(self.fee))

    def test_student_no_fee_permission_other_fee(self):
        """Test that student doesn't have permission for other student's fee."""
        other_student = StudentFactory()
        other_fee = FeeFactory(student=other_student)
        self.assertFalse(self.student_user.has_fee_permission(other_fee))

    def test_principal_has_payment_permission(self):
        """Test that principal has permission for any payment."""
        payment = self.scenario['payment']
        self.assertTrue(self.principal_user.has_payment_permission(payment))

    def test_teacher_has_payment_permission(self):
        """Test that teacher has permission for any payment."""
        payment = self.scenario['payment']
        self.assertTrue(self.teacher_user.has_payment_permission(payment))

    def test_student_has_payment_permission_own_payment(self):
        """Test that student has permission for their own payment."""
        payment = self.scenario['payment']
        self.assertTrue(self.student_user.has_payment_permission(payment))

    def test_student_no_payment_permission_other_payment(self):
        """Test that student doesn't have permission for other student's payment."""
        other_student = StudentFactory()
        other_fee = FeeFactory(student=other_student)
        other_payment = PaymentFactory(fee=other_fee)
        self.assertFalse(self.student_user.has_payment_permission(other_payment))

    def test_can_manage_students_principal(self):
        """Test principal can manage students."""
        self.assertTrue(self.principal_user.can_manage_students())

    def test_can_manage_students_teacher(self):
        """Test teacher can manage students."""
        self.assertTrue(self.teacher_user.can_manage_students())

    def test_can_manage_students_student(self):
        """Test student cannot manage students."""
        self.assertFalse(self.student_user.can_manage_students())

    def test_can_process_payments_principal(self):
        """Test principal can process payments."""
        self.assertTrue(self.principal_user.can_process_payments())

    def test_can_process_payments_teacher(self):
        """Test teacher can process payments."""
        self.assertTrue(self.teacher_user.can_process_payments())

    def test_can_process_payments_student(self):
        """Test student cannot process payments."""
        self.assertFalse(self.student_user.can_process_payments())


class FeeTypeModelTest(TestCase):
    """Test cases for FeeType model."""

    def test_fee_type_creation(self):
        """Test basic fee type creation."""
        fee_type = FeeType.objects.create(
            name="Annual Fee",
            description="Annual school fee",
            amount=Decimal('12000.00'),
            category=FeeType.Category.ANNUAL
        )
        self.assertEqual(fee_type.name, "Annual Fee")
        self.assertEqual(fee_type.category, FeeType.Category.ANNUAL)

    def test_fee_type_str_representation(self):
        """Test fee type string representation."""
        fee_type = FeeType.objects.create(
            name="Transport Fee",
            description="Monthly transport fee",
            amount=Decimal('800.00'),
            category=FeeType.Category.TRANSPORT
        )
        expected = f"{fee_type.name} ({fee_type.category}) - ₹{fee_type.amount}"
        self.assertEqual(str(fee_type), expected)

    def test_fee_type_unique_name(self):
        """Test that fee type names are unique."""
        FeeType.objects.create(
            name="Unique Fee",
            amount=Decimal('1000.00'),
            category=FeeType.Category.OTHER
        )

        with self.assertRaises(Exception):  # IntegrityError
            FeeType.objects.create(
                name="Unique Fee",
                amount=Decimal('2000.00'),
                category=FeeType.Category.TUITION
            )


class StudentModelTest(TestCase):
    """Test cases for Student model."""

    def test_student_creation(self):
        """Test basic student creation."""
        user = UserFactory(role=User.Role.STUDENT)
        student = Student.objects.create(user=user)
        self.assertEqual(student.user, user)

    def test_student_str_representation(self):
        """Test student string representation."""
        user = UserFactory(
            role=User.Role.STUDENT,
            first_name="John",
            last_name="Doe"
        )
        student = Student.objects.create(user=user)
        expected = "John Doe"
        self.assertEqual(str(student), expected)


class DiscountModelTest(TestCase):
    """Test cases for Discount model."""

    def setUp(self):
        """Set up test data."""
        self.scenario = create_complete_fee_scenario()
        self.fee = self.scenario['fee']
        self.student = self.scenario['student']
        self.principal = self.scenario['principal_user']

    def test_discount_creation_percentage(self):
        """Test discount creation with percentage type."""
        discount = Discount.objects.create(
            student=self.student,
            fee=self.fee,
            discount_type='percentage',
            value=Decimal('10.00'),
            reason="Merit scholarship",
            applied_by=self.principal
        )
        self.assertEqual(discount.discount_type, 'percentage')
        self.assertEqual(discount.value, Decimal('10.00'))

    def test_discount_creation_amount(self):
        """Test discount creation with amount type."""
        discount = Discount.objects.create(
            student=self.student,
            fee=self.fee,
            discount_type='amount',
            value=Decimal('500.00'),
            reason="Financial assistance",
            applied_by=self.principal
        )
        self.assertEqual(discount.discount_type, 'amount')
        self.assertEqual(discount.value, Decimal('500.00'))


class RefundModelTest(TestCase):
    """Test cases for Refund model."""

    def setUp(self):
        """Set up test data."""
        self.scenario = create_complete_fee_scenario()
        self.payment = self.scenario['payment']
        self.principal = self.scenario['principal_user']

    def test_refund_creation(self):
        """Test basic refund creation."""
        refund = Refund.objects.create(
            payment=self.payment,
            amount=Decimal('1000.00'),
            reason="Duplicate payment",
            processed_by=self.principal
        )
        self.assertEqual(refund.status, Refund.Status.PENDING)
        self.assertIsNotNone(refund.processed_at)


class EdgeCaseTests(TestCase):
    """Test edge cases and boundary conditions."""

    def test_fee_with_maximum_amount(self):
        """Test fee creation with maximum allowed amount."""
        student = StudentFactory()
        fee = Fee.objects.create(
            student=student,
            amount=Decimal('1000000.00'),  # 10 lakhs
            due_date=timezone.now().date() + timedelta(days=30)
        )
        self.assertEqual(fee.amount, Decimal('1000000.00'))

    def test_payment_with_maximum_amount(self):
        """Test payment creation with maximum allowed amount."""
        scenario = create_complete_fee_scenario()
        payment = Payment.objects.create(
            fee=scenario['fee'],
            amount=Decimal('1000000.00'),
            payment_method=Payment.PaymentMethod.BANK_TRANSFER,
            processed_by=scenario['principal_user']
        )
        self.assertEqual(payment.amount, Decimal('1000000.00'))

    def test_fee_due_date_far_future(self):
        """Test fee with due date far in the future."""
        student = StudentFactory()
        future_date = timezone.now().date() + timedelta(days=730)  # 2 years
        fee = Fee.objects.create(
            student=student,
            amount=Decimal('1000.00'),
            due_date=future_date
        )
        self.assertEqual(fee.due_date, future_date)

    def test_payment_with_long_transaction_id(self):
        """Test payment with long transaction ID."""
        scenario = create_complete_fee_scenario()
        long_txn_id = "VERY_LONG_TRANSACTION_ID_123456789012345678901234567890"
        payment = Payment.objects.create(
            fee=scenario['fee'],
            amount=Decimal('100.00'),
            payment_method=Payment.PaymentMethod.UPI,
            transaction_id=long_txn_id,
            processed_by=scenario['principal_user']
        )
        self.assertEqual(payment.transaction_id, long_txn_id)

    def test_fee_with_notes(self):
        """Test fee with notes field."""
        student = StudentFactory()
        fee = Fee.objects.create(
            student=student,
            amount=Decimal('1000.00'),
            due_date=timezone.now().date() + timedelta(days=30),
            notes="This is a test fee with notes."
        )
        self.assertEqual(fee.notes, "This is a test fee with notes.")

    def test_payment_with_notes(self):
        """Test payment with notes field."""
        scenario = create_complete_fee_scenario()
        payment = Payment.objects.create(
            fee=scenario['fee'],
            amount=Decimal('100.00'),
            payment_method=Payment.PaymentMethod.CASH,
            notes="Payment made in cash at the office.",
            processed_by=scenario['principal_user']
        )
        self.assertEqual(payment.notes, "Payment made in cash at the office.")