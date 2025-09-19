import pytest
from django.test import TestCase
from django.utils import timezone
from decimal import Decimal
from django.core.exceptions import ValidationError

from ..models import *
from ..forms import *
from .test_utils import *


class FeeFormTest(TestCase):
    """Test cases for FeeForm."""

    def setUp(self):
        """Set up test data."""
        self.scenario = create_complete_fee_scenario()
        self.student = self.scenario['student']

    def test_fee_form_valid_data(self):
        """Test FeeForm with valid data."""
        data = {
            'student': self.student.id,
            'amount': '2500.00',
            'due_date': (timezone.now().date() + timezone.timedelta(days=30)).isoformat(),
            'waived_amount': '0.00',
            'status': 'unpaid'
        }
        form = FeeForm(data=data)
        self.assertTrue(form.is_valid())
        self.assertEqual(form.cleaned_data['amount'], Decimal('2500.00'))

    def test_fee_form_invalid_amount_zero(self):
        """Test FeeForm with zero amount."""
        data = {
            'student': self.student.id,
            'amount': '0.00',
            'due_date': (timezone.now().date() + timezone.timedelta(days=30)).isoformat()
        }
        form = FeeForm(data=data)
        self.assertFalse(form.is_valid())
        self.assertIn('amount', form.errors)

    def test_fee_form_invalid_amount_negative(self):
        """Test FeeForm with negative amount."""
        data = {
            'student': self.student.id,
            'amount': '-100.00',
            'due_date': (timezone.now().date() + timezone.timedelta(days=30)).isoformat()
        }
        form = FeeForm(data=data)
        self.assertFalse(form.is_valid())
        self.assertIn('amount', form.errors)

    def test_fee_form_invalid_amount_too_large(self):
        """Test FeeForm with amount exceeding limit."""
        data = {
            'student': self.student.id,
            'amount': '2000000.00',  # 20 lakhs, exceeds 10 lakhs limit
            'due_date': (timezone.now().date() + timezone.timedelta(days=30)).isoformat()
        }
        form = FeeForm(data=data)
        self.assertFalse(form.is_valid())
        self.assertIn('amount', form.errors)

    def test_fee_form_invalid_due_date_past(self):
        """Test FeeForm with past due date."""
        data = {
            'student': self.student.id,
            'amount': '1000.00',
            'due_date': (timezone.now().date() - timezone.timedelta(days=1)).isoformat()
        }
        form = FeeForm(data=data)
        self.assertFalse(form.is_valid())
        self.assertIn('due_date', form.errors)

    def test_fee_form_invalid_due_date_too_far_future(self):
        """Test FeeForm with due date too far in future."""
        data = {
            'student': self.student.id,
            'amount': '1000.00',
            'due_date': (timezone.now().date() + timezone.timedelta(days=800)).isoformat()  # More than 2 years
        }
        form = FeeForm(data=data)
        self.assertFalse(form.is_valid())
        self.assertIn('due_date', form.errors)

    def test_fee_form_invalid_waived_amount_negative(self):
        """Test FeeForm with negative waived amount."""
        data = {
            'student': self.student.id,
            'amount': '1000.00',
            'due_date': (timezone.now().date() + timezone.timedelta(days=30)).isoformat(),
            'waived_amount': '-100.00'
        }
        form = FeeForm(data=data)
        self.assertFalse(form.is_valid())
        self.assertIn('waived_amount', form.errors)

    def test_fee_form_cross_field_validation_waived_exceeds_amount(self):
        """Test FeeForm cross-field validation when waived amount exceeds total."""
        data = {
            'student': self.student.id,
            'amount': '1000.00',
            'due_date': (timezone.now().date() + timezone.timedelta(days=30)).isoformat(),
            'waived_amount': '1500.00'
        }
        form = FeeForm(data=data)
        self.assertFalse(form.is_valid())
        self.assertIn('__all__', form.errors)

    def test_fee_form_default_due_date(self):
        """Test FeeForm sets default due date for new fees."""
        data = {
            'student': self.student.id,
            'amount': '1000.00'
        }
        form = FeeForm(data=data)
        # Should be valid and set default due date
        self.assertTrue(form.is_valid())
        self.assertIsNotNone(form.cleaned_data.get('due_date'))

    def test_fee_form_student_queryset(self):
        """Test FeeForm limits student choices to students only."""
        form = FeeForm()
        # Check that all students in queryset are actually students
        for student in form.fields['student'].queryset:
            self.assertEqual(student.user.role, User.Role.STUDENT)


class PaymentFormTest(TestCase):
    """Test cases for PaymentForm."""

    def setUp(self):
        """Set up test data."""
        self.scenario = create_complete_fee_scenario()
        self.fee = self.scenario['fee']

    def test_payment_form_valid_data(self):
        """Test PaymentForm with valid data."""
        data = {
            'amount': '1000.00',
            'payment_method': 'upi',
            'transaction_id': 'TEST123456',
            'notes': 'Test payment'
        }
        form = PaymentForm(data=data, fee=self.fee)
        self.assertTrue(form.is_valid())
        self.assertEqual(form.cleaned_data['amount'], Decimal('1000.00'))

    def test_payment_form_invalid_amount_zero(self):
        """Test PaymentForm with zero amount."""
        data = {
            'amount': '0.00',
            'payment_method': 'cash'
        }
        form = PaymentForm(data=data, fee=self.fee)
        self.assertFalse(form.is_valid())
        self.assertIn('amount', form.errors)

    def test_payment_form_invalid_amount_too_large(self):
        """Test PaymentForm with amount exceeding limit."""
        data = {
            'amount': '2000000.00',  # Exceeds 10 lakhs limit
            'payment_method': 'bank_transfer'
        }
        form = PaymentForm(data=data, fee=self.fee)
        self.assertFalse(form.is_valid())
        self.assertIn('amount', form.errors)

    def test_payment_form_invalid_transaction_id_characters(self):
        """Test PaymentForm with invalid transaction ID characters."""
        data = {
            'amount': '1000.00',
            'payment_method': 'upi',
            'transaction_id': 'INVALID@#$%'
        }
        form = PaymentForm(data=data, fee=self.fee)
        self.assertFalse(form.is_valid())
        self.assertIn('transaction_id', form.errors)

    def test_payment_form_duplicate_transaction_id(self):
        """Test PaymentForm with duplicate transaction ID."""
        # Create first payment
        Payment.objects.create(
            fee=self.fee,
            amount=Decimal('500.00'),
            payment_method=Payment.PaymentMethod.UPI,
            transaction_id='DUPLICATE123',
            processed_by=self.scenario['principal_user']
        )

        # Try to create form with same transaction ID
        data = {
            'amount': '1000.00',
            'payment_method': 'upi',
            'transaction_id': 'DUPLICATE123'
        }
        form = PaymentForm(data=data, fee=self.fee)
        self.assertFalse(form.is_valid())
        self.assertIn('transaction_id', form.errors)

    def test_payment_form_notes_too_long(self):
        """Test PaymentForm with notes exceeding length limit."""
        long_notes = 'A' * 1001  # Exceeds 1000 character limit
        data = {
            'amount': '1000.00',
            'payment_method': 'cash',
            'notes': long_notes
        }
        form = PaymentForm(data=data, fee=self.fee)
        self.assertFalse(form.is_valid())
        self.assertIn('notes', form.errors)

    def test_payment_form_exceeds_outstanding_balance(self):
        """Test PaymentForm with amount exceeding outstanding balance."""
        data = {
            'amount': '3000.00',  # More than outstanding balance of 2000
            'payment_method': 'cash'
        }
        form = PaymentForm(data=data, fee=self.fee)
        self.assertFalse(form.is_valid())
        self.assertIn('amount', form.errors)

    def test_payment_form_default_payment_date(self):
        """Test PaymentForm sets default payment date."""
        data = {
            'amount': '500.00',
            'payment_method': 'cash'
        }
        form = PaymentForm(data=data, fee=self.fee)
        self.assertTrue(form.is_valid())
        self.assertIsNotNone(form.cleaned_data.get('payment_date'))

    def test_payment_form_max_amount_attribute(self):
        """Test PaymentForm sets max amount attribute based on outstanding balance."""
        form = PaymentForm(fee=self.fee)
        expected_max = str(self.fee.get_outstanding_amount())
        self.assertEqual(form.fields['amount'].widget.attrs.get('max'), expected_max)


class DiscountFormTest(TestCase):
    """Test cases for DiscountForm."""

    def setUp(self):
        """Set up test data."""
        self.scenario = create_complete_fee_scenario()
        self.fee = self.scenario['fee']

    def test_discount_form_valid_percentage(self):
        """Test DiscountForm with valid percentage discount."""
        data = {
            'discount_type': 'percentage',
            'value': '15.00',
            'reason': 'Academic excellence'
        }
        form = DiscountForm(data=data, fee=self.fee)
        self.assertTrue(form.is_valid())
        self.assertEqual(form.cleaned_data['value'], Decimal('15.00'))

    def test_discount_form_valid_amount(self):
        """Test DiscountForm with valid amount discount."""
        data = {
            'discount_type': 'amount',
            'value': '500.00',
            'reason': 'Financial assistance'
        }
        form = DiscountForm(data=data, fee=self.fee)
        self.assertTrue(form.is_valid())
        self.assertEqual(form.cleaned_data['value'], Decimal('500.00'))

    def test_discount_form_invalid_percentage_over_100(self):
        """Test DiscountForm with percentage over 100."""
        data = {
            'discount_type': 'percentage',
            'value': '150.00',
            'reason': 'Invalid discount'
        }
        form = DiscountForm(data=data, fee=self.fee)
        self.assertFalse(form.is_valid())
        self.assertIn('value', form.errors)

    def test_discount_form_invalid_value_zero(self):
        """Test DiscountForm with zero value."""
        data = {
            'discount_type': 'amount',
            'value': '0.00',
            'reason': 'Invalid discount'
        }
        form = DiscountForm(data=data, fee=self.fee)
        self.assertFalse(form.is_valid())
        self.assertIn('value', form.errors)

    def test_discount_form_invalid_amount_exceeds_outstanding(self):
        """Test DiscountForm with amount exceeding outstanding balance."""
        data = {
            'discount_type': 'amount',
            'value': '3000.00',  # More than outstanding balance
            'reason': 'Excessive discount'
        }
        form = DiscountForm(data=data, fee=self.fee)
        self.assertFalse(form.is_valid())
        self.assertIn('value', form.errors)

    def test_discount_form_reason_too_long(self):
        """Test DiscountForm with reason exceeding length limit."""
        long_reason = 'A' * 501  # Exceeds 500 character limit
        data = {
            'discount_type': 'amount',
            'value': '100.00',
            'reason': long_reason
        }
        form = DiscountForm(data=data, fee=self.fee)
        self.assertFalse(form.is_valid())
        self.assertIn('reason', form.errors)

    def test_discount_form_missing_reason(self):
        """Test DiscountForm with missing reason."""
        data = {
            'discount_type': 'amount',
            'value': '100.00'
            # Missing reason
        }
        form = DiscountForm(data=data, fee=self.fee)
        self.assertFalse(form.is_valid())
        self.assertIn('reason', form.errors)


class RefundFormTest(TestCase):
    """Test cases for RefundForm."""

    def setUp(self):
        """Set up test data."""
        self.scenario = create_complete_fee_scenario()
        self.payment = self.scenario['payment']

    def test_refund_form_valid_data(self):
        """Test RefundForm with valid data."""
        data = {
            'amount': '1000.00',
            'reason': 'Duplicate payment refund'
        }
        form = RefundForm(data=data, payment=self.payment)
        self.assertTrue(form.is_valid())
        self.assertEqual(form.cleaned_data['amount'], Decimal('1000.00'))

    def test_refund_form_invalid_amount_zero(self):
        """Test RefundForm with zero amount."""
        data = {
            'amount': '0.00',
            'reason': 'Test refund'
        }
        form = RefundForm(data=data, payment=self.payment)
        self.assertFalse(form.is_valid())
        self.assertIn('amount', form.errors)

    def test_refund_form_invalid_amount_too_large(self):
        """Test RefundForm with amount exceeding limit."""
        data = {
            'amount': '2000000.00',  # Exceeds 10 lakhs limit
            'reason': 'Large refund'
        }
        form = RefundForm(data=data, payment=self.payment)
        self.assertFalse(form.is_valid())
        self.assertIn('amount', form.errors)

    def test_refund_form_invalid_amount_exceeds_payment(self):
        """Test RefundForm with amount exceeding payment amount."""
        data = {
            'amount': '4000.00',  # Exceeds payment amount of 3000
            'reason': 'Excessive refund'
        }
        form = RefundForm(data=data, payment=self.payment)
        self.assertFalse(form.is_valid())
        self.assertIn('amount', form.errors)

    def test_refund_form_missing_reason(self):
        """Test RefundForm with missing reason."""
        data = {
            'amount': '500.00'
            # Missing reason
        }
        form = RefundForm(data=data, payment=self.payment)
        self.assertFalse(form.is_valid())
        self.assertIn('reason', form.errors)

    def test_refund_form_reason_too_long(self):
        """Test RefundForm with reason exceeding length limit."""
        long_reason = 'A' * 501  # Exceeds 500 character limit
        data = {
            'amount': '500.00',
            'reason': long_reason
        }
        form = RefundForm(data=data, payment=self.payment)
        self.assertFalse(form.is_valid())
        self.assertIn('reason', form.errors)

    def test_refund_form_empty_reason(self):
        """Test RefundForm with empty reason."""
        data = {
            'amount': '500.00',
            'reason': ''  # Empty reason
        }
        form = RefundForm(data=data, payment=self.payment)
        self.assertFalse(form.is_valid())
        self.assertIn('reason', form.errors)

    def test_refund_form_whitespace_reason(self):
        """Test RefundForm with whitespace-only reason."""
        data = {
            'amount': '500.00',
            'reason': '   '  # Whitespace-only reason
        }
        form = RefundForm(data=data, payment=self.payment)
        self.assertFalse(form.is_valid())
        self.assertIn('reason', form.errors)

    def test_refund_form_max_amount_attribute(self):
        """Test RefundForm sets max amount attribute."""
        form = RefundForm(payment=self.payment)
        expected_max = str(self.payment.amount)
        self.assertEqual(form.fields['amount'].widget.attrs.get('max'), expected_max)


class FeeTypeFormTest(TestCase):
    """Test cases for FeeTypeForm."""

    def test_fee_type_form_valid_data(self):
        """Test FeeTypeForm with valid data."""
        data = {
            'name': 'Test Fee Type',
            'description': 'Test description',
            'amount': '1500.00',
            'category': 'tuition'
        }
        form = FeeTypeForm(data=data)
        self.assertTrue(form.is_valid())
        self.assertEqual(form.cleaned_data['amount'], Decimal('1500.00'))

    def test_fee_type_form_invalid_amount_zero(self):
        """Test FeeTypeForm with zero amount."""
        data = {
            'name': 'Test Fee Type',
            'amount': '0.00',
            'category': 'tuition'
        }
        form = FeeTypeForm(data=data)
        self.assertFalse(form.is_valid())
        self.assertIn('amount', form.errors)

    def test_fee_type_form_invalid_amount_negative(self):
        """Test FeeTypeForm with negative amount."""
        data = {
            'name': 'Test Fee Type',
            'amount': '-100.00',
            'category': 'tuition'
        }
        form = FeeTypeForm(data=data)
        self.assertFalse(form.is_valid())
        self.assertIn('amount', form.errors)


class FeeStructureFormTest(TestCase):
    """Test cases for FeeStructureForm."""

    def setUp(self):
        """Set up test data."""
        self.fee_type = FeeTypeFactory()
        self.school_class = SchoolClassFactory()

    def test_fee_structure_form_valid_data(self):
        """Test FeeStructureForm with valid data."""
        data = {
            'fee_type': self.fee_type.id,
            'school_class': self.school_class.id,
            'amount': '2000.00',
            'is_active': True
        }
        form = FeeStructureForm(data=data)
        self.assertTrue(form.is_valid())
        self.assertEqual(form.cleaned_data['amount'], Decimal('2000.00'))

    def test_fee_structure_form_invalid_amount_zero(self):
        """Test FeeStructureForm with zero amount."""
        data = {
            'fee_type': self.fee_type.id,
            'school_class': self.school_class.id,
            'amount': '0.00'
        }
        form = FeeStructureForm(data=data)
        self.assertFalse(form.is_valid())
        self.assertIn('amount', form.errors)

    def test_fee_structure_form_invalid_amount_negative(self):
        """Test FeeStructureForm with negative amount."""
        data = {
            'fee_type': self.fee_type.id,
            'school_class': self.school_class.id,
            'amount': '-500.00'
        }
        form = FeeStructureForm(data=data)
        self.assertFalse(form.is_valid())
        self.assertIn('amount', form.errors)


class FormIntegrationTest(TestCase):
    """Integration tests for form interactions."""

    def setUp(self):
        """Set up test data."""
        self.scenario = create_complete_fee_scenario()
        self.fee = self.scenario['fee']
        self.student = self.scenario['student']
        self.principal = self.scenario['principal_user']

    def test_fee_form_with_existing_fee(self):
        """Test FeeForm with existing fee instance."""
        form = FeeForm(instance=self.fee)
        self.assertEqual(form.instance, self.fee)

    def test_payment_form_with_fee_context(self):
        """Test PaymentForm properly uses fee context for validation."""
        # Create a payment form with the fee
        form = PaymentForm(fee=self.fee)

        # Test that max amount is set correctly
        outstanding = self.fee.get_outstanding_amount()
        self.assertEqual(
            form.fields['amount'].widget.attrs.get('max'),
            str(outstanding)
        )

        # Test validation with amount exceeding outstanding
        data = {
            'amount': str(outstanding + 100),
            'payment_method': 'cash'
        }
        form = PaymentForm(data=data, fee=self.fee)
        self.assertFalse(form.is_valid())

    def test_form_field_choices(self):
        """Test that form fields have correct choices."""
        # Test PaymentForm payment method choices
        payment_form = PaymentForm()
        expected_methods = [choice[0] for choice in Payment.PaymentMethod.choices]
        actual_methods = [choice[0] for choice in payment_form.fields['payment_method'].choices]
        self.assertEqual(set(actual_methods), set(expected_methods))

        # Test FeeForm status choices
        fee_form = FeeForm()
        expected_statuses = [choice[0] for choice in Fee.Status.choices]
        actual_statuses = [choice[0] for choice in fee_form.fields['status'].choices]
        self.assertEqual(set(actual_statuses), set(expected_statuses))

    def test_form_html_attributes(self):
        """Test that forms set correct HTML attributes."""
        # Test number input fields have step attribute
        fee_form = FeeForm()
        self.assertEqual(fee_form.fields['amount'].widget.attrs.get('step'), '0.01')
        self.assertEqual(fee_form.fields['waived_amount'].widget.attrs.get('step'), '0.01')

        # Test date input fields have correct type
        self.assertEqual(fee_form.fields['due_date'].widget.input_type, 'date')

        # Test textarea fields have correct rows
        payment_form = PaymentForm()
        self.assertEqual(payment_form.fields['notes'].widget.attrs.get('rows'), '3')


class FormValidationEdgeCasesTest(TestCase):
    """Test edge cases and boundary conditions in forms."""

    def setUp(self):
        """Set up test data."""
        self.scenario = create_complete_fee_scenario()
        self.fee = self.scenario['fee']

    def test_fee_form_boundary_amount_values(self):
        """Test FeeForm with boundary amount values."""
        # Test minimum valid amount
        data = {
            'student': self.scenario['student'].id,
            'amount': '0.01',
            'due_date': (timezone.now().date() + timezone.timedelta(days=30)).isoformat()
        }
        form = FeeForm(data=data)
        self.assertTrue(form.is_valid())

        # Test maximum valid amount
        data['amount'] = '1000000.00'  # 10 lakhs
        form = FeeForm(data=data)
        self.assertTrue(form.is_valid())

    def test_payment_form_boundary_amount_values(self):
        """Test PaymentForm with boundary amount values."""
        # Test minimum valid amount
        data = {
            'amount': '0.01',
            'payment_method': 'cash'
        }
        form = PaymentForm(data=data, fee=self.fee)
        self.assertTrue(form.is_valid())

        # Test maximum valid amount
        data['amount'] = '1000000.00'  # 10 lakhs
        form = PaymentForm(data=data, fee=self.fee)
        self.assertTrue(form.is_valid())

    def test_discount_form_boundary_values(self):
        """Test DiscountForm with boundary values."""
        # Test minimum valid percentage
        data = {
            'discount_type': 'percentage',
            'value': '0.01',
            'reason': 'Test discount'
        }
        form = DiscountForm(data=data, fee=self.fee)
        self.assertTrue(form.is_valid())

        # Test maximum valid percentage
        data['value'] = '100.00'
        form = DiscountForm(data=data, fee=self.fee)
        self.assertTrue(form.is_valid())

        # Test minimum valid amount
        data = {
            'discount_type': 'amount',
            'value': '0.01',
            'reason': 'Test discount'
        }
        form = DiscountForm(data=data, fee=self.fee)
        self.assertTrue(form.is_valid())

    def test_refund_form_boundary_values(self):
        """Test RefundForm with boundary values."""
        # Test minimum valid amount
        data = {
            'amount': '0.01',
            'reason': 'Test refund'
        }
        form = RefundForm(data=data, payment=self.scenario['payment'])
        self.assertTrue(form.is_valid())

        # Test maximum valid amount (equal to payment amount)
        data['amount'] = str(self.scenario['payment'].amount)
        form = RefundForm(data=data, payment=self.scenario['payment'])
        self.assertTrue(form.is_valid())

    def test_form_field_length_limits(self):
        """Test form field length limits."""
        # Test transaction ID length
        long_txn_id = 'A' * 100  # Very long transaction ID
        data = {
            'amount': '100.00',
            'payment_method': 'upi',
            'transaction_id': long_txn_id
        }
        form = PaymentForm(data=data, fee=self.fee)
        self.assertTrue(form.is_valid())  # Should accept long transaction IDs

        # Test notes length limit
        max_notes = 'A' * 1000  # Maximum allowed length
        data = {
            'amount': '100.00',
            'payment_method': 'cash',
            'notes': max_notes
        }
        form = PaymentForm(data=data, fee=self.fee)
        self.assertTrue(form.is_valid())

    def test_form_special_characters(self):
        """Test form handling of special characters."""
        # Test transaction ID with allowed special characters
        data = {
            'amount': '100.00',
            'payment_method': 'upi',
            'transaction_id': 'TXN-123_456.789'
        }
        form = PaymentForm(data=data, fee=self.fee)
        self.assertTrue(form.is_valid())

        # Test notes with special characters
        data = {
            'amount': '100.00',
            'payment_method': 'cash',
            'notes': 'Payment for: @student#123 (ref: $100.00)'
        }
        form = PaymentForm(data=data, fee=self.fee)
        self.assertTrue(form.is_valid())