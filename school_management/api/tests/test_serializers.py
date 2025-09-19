import pytest
from django.test import TestCase
from django.core.exceptions import ValidationError
from django.utils import timezone
from decimal import Decimal
from rest_framework.test import APIRequestFactory
from rest_framework import serializers

from ..models import *
from ..serializers import *
from .test_utils import *


class FeeSerializerTest(TestCase):
    """Test cases for FeeSerializer."""

    def setUp(self):
        """Set up test data."""
        self.scenario = create_complete_fee_scenario()
        self.fee = self.scenario['fee']
        self.student = self.scenario['student']
        self.principal = self.scenario['principal_user']
        self.factory = APIRequestFactory()

    def test_fee_serializer_valid_data(self):
        """Test FeeSerializer with valid data."""
        data = {
            'student': self.student.id,
            'amount': '2500.00',
            'due_date': (timezone.now().date() + timezone.timedelta(days=30)).isoformat(),
            'waived_amount': '0.00'
        }
        serializer = FeeSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        self.assertEqual(serializer.validated_data['amount'], Decimal('2500.00'))

    def test_fee_serializer_invalid_amount_zero(self):
        """Test FeeSerializer with zero amount."""
        data = {
            'student': self.student.id,
            'amount': '0.00',
            'due_date': (timezone.now().date() + timezone.timedelta(days=30)).isoformat()
        }
        serializer = FeeSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('amount', serializer.errors)

    def test_fee_serializer_invalid_amount_negative(self):
        """Test FeeSerializer with negative amount."""
        data = {
            'student': self.student.id,
            'amount': '-100.00',
            'due_date': (timezone.now().date() + timezone.timedelta(days=30)).isoformat()
        }
        serializer = FeeSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('amount', serializer.errors)

    def test_fee_serializer_invalid_amount_too_large(self):
        """Test FeeSerializer with amount exceeding limit."""
        data = {
            'student': self.student.id,
            'amount': '2000000.00',  # 20 lakhs, exceeds 10 lakhs limit
            'due_date': (timezone.now().date() + timezone.timedelta(days=30)).isoformat()
        }
        serializer = FeeSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('amount', serializer.errors)

    def test_fee_serializer_invalid_due_date_past(self):
        """Test FeeSerializer with past due date."""
        data = {
            'student': self.student.id,
            'amount': '1000.00',
            'due_date': (timezone.now().date() - timezone.timedelta(days=1)).isoformat()
        }
        serializer = FeeSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('due_date', serializer.errors)

    def test_fee_serializer_invalid_due_date_too_far_future(self):
        """Test FeeSerializer with due date too far in future."""
        data = {
            'student': self.student.id,
            'amount': '1000.00',
            'due_date': (timezone.now().date() + timezone.timedelta(days=800)).isoformat()  # More than 2 years
        }
        serializer = FeeSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('due_date', serializer.errors)

    def test_fee_serializer_invalid_waived_amount_negative(self):
        """Test FeeSerializer with negative waived amount."""
        data = {
            'student': self.student.id,
            'amount': '1000.00',
            'due_date': (timezone.now().date() + timezone.timedelta(days=30)).isoformat(),
            'waived_amount': '-100.00'
        }
        serializer = FeeSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('waived_amount', serializer.errors)

    def test_fee_serializer_cross_field_validation_waived_exceeds_amount(self):
        """Test FeeSerializer cross-field validation when waived amount exceeds total."""
        data = {
            'student': self.student.id,
            'amount': '1000.00',
            'due_date': (timezone.now().date() + timezone.timedelta(days=30)).isoformat(),
            'waived_amount': '1500.00'
        }
        serializer = FeeSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('non_field_errors', serializer.errors)

    def test_fee_serializer_read_only_fields(self):
        """Test that read-only fields are excluded from input."""
        data = {
            'student': self.student.id,
            'amount': '1000.00',
            'due_date': (timezone.now().date() + timezone.timedelta(days=30)).isoformat(),
            'status': 'paid',  # This should be ignored
            'created_at': timezone.now().isoformat()  # This should be ignored
        }
        serializer = FeeSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        # Status should not be in validated_data since it's read-only
        self.assertNotIn('status', serializer.validated_data)
        self.assertNotIn('created_at', serializer.validated_data)


class PaymentSerializerTest(TestCase):
    """Test cases for PaymentSerializer."""

    def setUp(self):
        """Set up test data."""
        self.scenario = create_complete_fee_scenario()
        self.fee = self.scenario['fee']
        self.principal = self.scenario['principal_user']
        self.factory = APIRequestFactory()

    def test_payment_serializer_valid_data(self):
        """Test PaymentSerializer with valid data."""
        data = {
            'fee': self.fee.id,
            'amount': '1000.00',
            'payment_method': 'upi',
            'transaction_id': 'TEST123456',
            'notes': 'Test payment'
        }
        request = self.factory.post('/api/payments/', data)
        request.user = self.principal
        serializer = PaymentSerializer(data=data, context={'request': request})
        self.assertTrue(serializer.is_valid())
        self.assertEqual(serializer.validated_data['amount'], Decimal('1000.00'))

    def test_payment_serializer_invalid_amount_zero(self):
        """Test PaymentSerializer with zero amount."""
        data = {
            'fee': self.fee.id,
            'amount': '0.00',
            'payment_method': 'upi'
        }
        serializer = PaymentSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('amount', serializer.errors)

    def test_payment_serializer_invalid_amount_too_large(self):
        """Test PaymentSerializer with amount exceeding limit."""
        data = {
            'fee': self.fee.id,
            'amount': '2000000.00',  # Exceeds 10 lakhs limit
            'payment_method': 'upi'
        }
        serializer = PaymentSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('amount', serializer.errors)

    def test_payment_serializer_invalid_transaction_id_characters(self):
        """Test PaymentSerializer with invalid transaction ID characters."""
        data = {
            'fee': self.fee.id,
            'amount': '1000.00',
            'payment_method': 'upi',
            'transaction_id': 'INVALID@#$%'
        }
        serializer = PaymentSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('transaction_id', serializer.errors)

    def test_payment_serializer_duplicate_transaction_id(self):
        """Test PaymentSerializer with duplicate transaction ID."""
        # Create first payment
        Payment.objects.create(
            fee=self.fee,
            amount=Decimal('500.00'),
            payment_method=Payment.PaymentMethod.UPI,
            transaction_id='DUPLICATE123',
            processed_by=self.principal
        )

        # Try to create second payment with same transaction ID
        data = {
            'fee': self.fee.id,
            'amount': '1000.00',
            'payment_method': 'upi',
            'transaction_id': 'DUPLICATE123'
        }
        serializer = PaymentSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('transaction_id', serializer.errors)

    def test_payment_serializer_notes_too_long(self):
        """Test PaymentSerializer with notes exceeding length limit."""
        long_notes = 'A' * 1001  # Exceeds 1000 character limit
        data = {
            'fee': self.fee.id,
            'amount': '1000.00',
            'payment_method': 'upi',
            'notes': long_notes
        }
        serializer = PaymentSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('notes', serializer.errors)

    def test_payment_serializer_cross_field_validation_exceeds_balance(self):
        """Test PaymentSerializer cross-field validation when amount exceeds outstanding balance."""
        data = {
            'fee': self.fee.id,
            'amount': '3000.00',  # Exceeds outstanding balance of 2000
            'payment_method': 'upi'
        }
        serializer = PaymentSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('non_field_errors', serializer.errors)

    def test_payment_serializer_read_only_fields(self):
        """Test that read-only fields are excluded from input."""
        data = {
            'fee': self.fee.id,
            'amount': '1000.00',
            'payment_method': 'upi',
            'payment_date': timezone.now().isoformat(),  # Should be ignored
            'processed_by': self.principal.id  # Should be ignored
        }
        serializer = PaymentSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        self.assertNotIn('payment_date', serializer.validated_data)
        self.assertNotIn('processed_by', serializer.validated_data)

    def test_payment_serializer_create_sets_processed_by(self):
        """Test that create method sets processed_by from request user."""
        data = {
            'fee': self.fee.id,
            'amount': '500.00',
            'payment_method': 'upi',
            'transaction_id': 'TESTCREATE123'
        }
        request = self.factory.post('/api/payments/', data)
        request.user = self.principal
        serializer = PaymentSerializer(data=data, context={'request': request})
        self.assertTrue(serializer.is_valid())
        payment = serializer.save()
        self.assertEqual(payment.processed_by, self.principal)


class EnhancedFeeSerializerTest(TestCase):
    """Test cases for EnhancedFeeSerializer."""

    def setUp(self):
        """Set up test data."""
        self.scenario = create_complete_fee_scenario()
        self.fee = self.scenario['fee']

    def test_enhanced_fee_serializer_includes_calculated_fields(self):
        """Test that EnhancedFeeSerializer includes calculated fields."""
        serializer = EnhancedFeeSerializer(self.fee)
        data = serializer.data

        self.assertIn('total_paid', data)
        self.assertIn('outstanding_balance', data)
        self.assertIn('is_overdue', data)
        self.assertIn('payments', data)
        self.assertIn('discounts', data)

    def test_enhanced_fee_serializer_total_paid_calculation(self):
        """Test total_paid calculation in EnhancedFeeSerializer."""
        serializer = EnhancedFeeSerializer(self.fee)
        data = serializer.data
        expected_total_paid = Decimal('3000.00')  # From the initial payment
        self.assertEqual(Decimal(str(data['total_paid'])), expected_total_paid)

    def test_enhanced_fee_serializer_outstanding_balance_calculation(self):
        """Test outstanding_balance calculation in EnhancedFeeSerializer."""
        serializer = EnhancedFeeSerializer(self.fee)
        data = serializer.data
        expected_outstanding = self.fee.amount - Decimal('3000.00')  # 5000 - 3000
        self.assertEqual(Decimal(str(data['outstanding_balance'])), expected_outstanding)

    def test_enhanced_fee_serializer_is_overdue_calculation(self):
        """Test is_overdue calculation in EnhancedFeeSerializer."""
        serializer = EnhancedFeeSerializer(self.fee)
        data = serializer.data
        self.assertFalse(data['is_overdue'])  # Fee is not overdue

        # Make fee overdue
        self.fee.due_date = timezone.now().date() - timezone.timedelta(days=1)
        self.fee.save()
        serializer = EnhancedFeeSerializer(self.fee)
        data = serializer.data
        self.assertTrue(data['is_overdue'])


class EnhancedPaymentSerializerTest(TestCase):
    """Test cases for EnhancedPaymentSerializer."""

    def setUp(self):
        """Set up test data."""
        self.scenario = create_complete_fee_scenario()
        self.payment = self.scenario['payment']

    def test_enhanced_payment_serializer_includes_nested_data(self):
        """Test that EnhancedPaymentSerializer includes nested fee data."""
        serializer = EnhancedPaymentSerializer(self.payment)
        data = serializer.data

        self.assertIn('fee', data)
        self.assertIn('refunds', data)
        self.assertIn('processed_by', data)

    def test_enhanced_payment_serializer_fee_data(self):
        """Test that fee data is properly nested in EnhancedPaymentSerializer."""
        serializer = EnhancedPaymentSerializer(self.payment)
        data = serializer.data

        fee_data = data['fee']
        self.assertEqual(fee_data['id'], self.payment.fee.id)
        self.assertEqual(Decimal(fee_data['amount']), self.payment.fee.amount)


class StudentSerializerTest(TestCase):
    """Test cases for StudentSerializer."""

    def setUp(self):
        """Set up test data."""
        self.scenario = create_complete_fee_scenario()
        self.student = self.scenario['student']

    def test_student_serializer_includes_user_data(self):
        """Test that StudentSerializer includes nested user data."""
        serializer = StudentSerializer(self.student)
        data = serializer.data

        self.assertIn('user', data)
        self.assertEqual(data['user']['id'], self.student.user.id)
        self.assertEqual(data['user']['username'], self.student.user.username)

    def test_student_serializer_create_with_user(self):
        """Test StudentSerializer create method with user data."""
        user_data = {
            'username': 'newstudent',
            'email': 'newstudent@test.com',
            'first_name': 'New',
            'last_name': 'Student'
        }
        data = {
            'user': user_data
        }
        serializer = StudentSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        student = serializer.save()
        self.assertEqual(student.user.username, 'newstudent')
        self.assertEqual(student.user.role, User.Role.STUDENT)


class UserSerializerTest(TestCase):
    """Test cases for UserSerializer."""

    def setUp(self):
        """Set up test data."""
        self.user = UserFactory()

    def test_user_serializer_includes_profile(self):
        """Test that UserSerializer includes profile data."""
        serializer = UserSerializer(self.user)
        data = serializer.data

        self.assertIn('profile', data)
        self.assertIn('id', data)
        self.assertIn('username', data)
        self.assertIn('email', data)

    def test_user_serializer_fields(self):
        """Test UserSerializer field inclusion."""
        serializer = UserSerializer(self.user)
        data = serializer.data

        expected_fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'profile']
        for field in expected_fields:
            self.assertIn(field, data)


class FeeTypeSerializerTest(TestCase):
    """Test cases for FeeTypeSerializer."""

    def test_fee_type_serializer_valid_data(self):
        """Test FeeTypeSerializer with valid data."""
        data = {
            'name': 'Test Fee Type',
            'description': 'Test description',
            'amount': '1500.00',
            'category': 'tuition'
        }
        serializer = FeeTypeSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        self.assertEqual(serializer.validated_data['amount'], Decimal('1500.00'))

    def test_fee_type_serializer_invalid_amount_zero(self):
        """Test FeeTypeSerializer with zero amount."""
        data = {
            'name': 'Test Fee Type',
            'amount': '0.00',
            'category': 'tuition'
        }
        serializer = FeeTypeSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('amount', serializer.errors)


class DiscountSerializerTest(TestCase):
    """Test cases for DiscountSerializer."""

    def setUp(self):
        """Set up test data."""
        self.scenario = create_complete_fee_scenario()
        self.fee = self.scenario['fee']
        self.student = self.scenario['student']
        self.principal = self.scenario['principal_user']
        self.factory = APIRequestFactory()

    def test_discount_serializer_valid_percentage(self):
        """Test DiscountSerializer with valid percentage discount."""
        data = {
            'discount_type': 'percentage',
            'value': '15.00',
            'reason': 'Academic excellence'
        }
        request = self.factory.post('/api/discounts/', data)
        request.user = self.principal
        serializer = DiscountSerializer(data=data, context={'request': request})
        self.assertTrue(serializer.is_valid())

    def test_discount_serializer_valid_amount(self):
        """Test DiscountSerializer with valid amount discount."""
        data = {
            'discount_type': 'amount',
            'value': '500.00',
            'reason': 'Financial assistance'
        }
        request = self.factory.post('/api/discounts/', data)
        request.user = self.principal
        serializer = DiscountSerializer(data=data, context={'request': request})
        self.assertTrue(serializer.is_valid())

    def test_discount_serializer_invalid_percentage_over_100(self):
        """Test DiscountSerializer with percentage over 100."""
        data = {
            'discount_type': 'percentage',
            'value': '150.00',
            'reason': 'Invalid discount'
        }
        serializer = DiscountSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('value', serializer.errors)

    def test_discount_serializer_invalid_value_zero(self):
        """Test DiscountSerializer with zero value."""
        data = {
            'discount_type': 'amount',
            'value': '0.00',
            'reason': 'Invalid discount'
        }
        serializer = DiscountSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('value', serializer.errors)

    def test_discount_serializer_reason_too_long(self):
        """Test DiscountSerializer with reason exceeding length limit."""
        long_reason = 'A' * 501  # Exceeds 500 character limit
        data = {
            'discount_type': 'amount',
            'value': '100.00',
            'reason': long_reason
        }
        serializer = DiscountSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('reason', serializer.errors)

    def test_discount_serializer_create_sets_applied_by(self):
        """Test that create method sets applied_by from request user."""
        data = {
            'discount_type': 'amount',
            'value': '200.00',
            'reason': 'Test discount'
        }
        request = self.factory.post('/api/discounts/', data)
        request.user = self.principal
        serializer = DiscountSerializer(data=data, context={'request': request})
        self.assertTrue(serializer.is_valid())
        discount = serializer.save(fee=self.fee, student=self.student)
        self.assertEqual(discount.applied_by, self.principal)


class RefundSerializerTest(TestCase):
    """Test cases for RefundSerializer."""

    def setUp(self):
        """Set up test data."""
        self.scenario = create_complete_fee_scenario()
        self.payment = self.scenario['payment']
        self.principal = self.scenario['principal_user']
        self.factory = APIRequestFactory()

    def test_refund_serializer_valid_data(self):
        """Test RefundSerializer with valid data."""
        data = {
            'amount': '1000.00',
            'reason': 'Duplicate payment refund'
        }
        request = self.factory.post('/api/refunds/', data)
        request.user = self.principal
        serializer = RefundSerializer(data=data, context={'request': request})
        self.assertTrue(serializer.is_valid())

    def test_refund_serializer_invalid_amount_zero(self):
        """Test RefundSerializer with zero amount."""
        data = {
            'amount': '0.00',
            'reason': 'Test refund'
        }
        serializer = RefundSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('amount', serializer.errors)

    def test_refund_serializer_invalid_amount_exceeds_payment(self):
        """Test RefundSerializer with amount exceeding payment amount."""
        data = {
            'amount': '4000.00',  # Exceeds payment amount of 3000
            'reason': 'Test refund'
        }
        serializer = RefundSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('amount', serializer.errors)

    def test_refund_serializer_missing_reason(self):
        """Test RefundSerializer with missing reason."""
        data = {
            'amount': '500.00'
            # Missing reason
        }
        serializer = RefundSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('reason', serializer.errors)

    def test_refund_serializer_reason_too_long(self):
        """Test RefundSerializer with reason exceeding length limit."""
        long_reason = 'A' * 501  # Exceeds 500 character limit
        data = {
            'amount': '500.00',
            'reason': long_reason
        }
        serializer = RefundSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('reason', serializer.errors)

    def test_refund_serializer_create_sets_processed_by(self):
        """Test that create method sets processed_by from request user."""
        data = {
            'amount': '500.00',
            'reason': 'Test refund'
        }
        request = self.factory.post('/api/refunds/', data)
        request.user = self.principal
        serializer = RefundSerializer(data=data, context={'request': request})
        self.assertTrue(serializer.is_valid())
        refund = serializer.save(payment=self.payment)
        self.assertEqual(refund.processed_by, self.principal)


class SerializerIntegrationTest(TestCase):
    """Integration tests for serializer interactions."""

    def test_fee_payment_integration(self):
        """Test integration between Fee and Payment serializers."""
        scenario = create_complete_fee_scenario()
        fee = scenario['fee']

        # Serialize fee
        fee_serializer = EnhancedFeeSerializer(fee)
        fee_data = fee_serializer.data

        # Create payment for the fee
        payment_data = {
            'fee': fee.id,
            'amount': '500.00',
            'payment_method': 'cash',
            'transaction_id': 'INTEGRATION123'
        }
        payment_serializer = PaymentSerializer(data=payment_data)
        self.assertTrue(payment_serializer.is_valid())
        payment = payment_serializer.save(processed_by=scenario['principal_user'])

        # Refresh fee and check updated data
        fee.refresh_from_db()
        updated_fee_serializer = EnhancedFeeSerializer(fee)
        updated_fee_data = updated_fee_serializer.data

        # Check that total_paid increased
        self.assertEqual(
            Decimal(str(updated_fee_data['total_paid'])),
            Decimal(str(fee_data['total_paid'])) + Decimal('500.00')
        )

        # Check that outstanding_balance decreased
        self.assertEqual(
            Decimal(str(updated_fee_data['outstanding_balance'])),
            Decimal(str(fee_data['outstanding_balance'])) - Decimal('500.00')
        )

    def test_nested_serializer_data_consistency(self):
        """Test that nested serializer data is consistent."""
        scenario = create_complete_fee_scenario()
        payment = scenario['payment']

        # Get payment with nested fee data
        payment_serializer = EnhancedPaymentSerializer(payment)
        payment_data = payment_serializer.data

        # Get fee data directly
        fee_serializer = EnhancedFeeSerializer(payment.fee)
        fee_data = fee_serializer.data

        # Check that nested fee data matches direct fee data
        self.assertEqual(payment_data['fee']['id'], fee_data['id'])
        self.assertEqual(payment_data['fee']['amount'], fee_data['amount'])
        self.assertEqual(payment_data['fee']['student']['id'], fee_data['student']['id'])