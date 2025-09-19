import pytest
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from decimal import Decimal
from rest_framework.test import APITestCase, APIClient
from rest_framework import status

from ..models import *
from .test_utils import *


class FeeViewSetTest(APITestCase):
    """Test cases for FeeViewSet API endpoints."""

    def setUp(self):
        """Set up test data and client."""
        self.client = APIClient()
        self.scenario = create_complete_fee_scenario()
        self.fee = self.scenario['fee']
        self.student = self.scenario['student']
        self.principal = self.scenario['principal_user']
        self.teacher = self.scenario['teacher_user']

        # Authenticate as principal
        self.client.force_authenticate(user=self.principal)

    def test_list_fees(self):
        """Test GET /api/fees/ - list all fees."""
        response = self.client.get('/api/fees/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertGreater(len(response.data['results']), 0)

    def test_list_fees_filtered_by_student(self):
        """Test GET /api/fees/ with student filter."""
        response = self.client.get(f'/api/fees/?student_id={self.student.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for fee in response.data['results']:
            self.assertEqual(fee['student']['id'], self.student.id)

    def test_list_fees_filtered_by_status(self):
        """Test GET /api/fees/ with status filter."""
        response = self.client.get('/api/fees/?status=unpaid')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for fee in response.data['results']:
            self.assertEqual(fee['status'], 'unpaid')

    def test_list_fees_overdue_filter(self):
        """Test GET /api/fees/ with overdue filter."""
        # Make fee overdue
        self.fee.due_date = timezone.now().date() - timezone.timedelta(days=1)
        self.fee.save()

        response = self.client.get('/api/fees/?overdue=true')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreater(len(response.data['results']), 0)

    def test_retrieve_fee(self):
        """Test GET /api/fees/{id}/ - retrieve single fee."""
        response = self.client.get(f'/api/fees/{self.fee.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], self.fee.id)
        self.assertIn('total_paid', response.data)
        self.assertIn('outstanding_balance', response.data)

    def test_retrieve_fee_not_found(self):
        """Test GET /api/fees/{id}/ with invalid ID."""
        response = self.client.get('/api/fees/99999/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_create_fee(self):
        """Test POST /api/fees/ - create new fee."""
        data = {
            'student': self.student.id,
            'amount': '1500.00',
            'due_date': (timezone.now().date() + timezone.timedelta(days=45)).isoformat()
        }
        response = self.client.post('/api/fees/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Decimal(response.data['amount']), Decimal('1500.00'))

    def test_create_fee_invalid_data(self):
        """Test POST /api/fees/ with invalid data."""
        data = {
            'student': self.student.id,
            'amount': '0.00',  # Invalid amount
            'due_date': (timezone.now().date() + timezone.timedelta(days=30)).isoformat()
        }
        response = self.client.post('/api/fees/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('amount', response.data)

    def test_update_fee(self):
        """Test PUT /api/fees/{id}/ - update fee."""
        data = {
            'student': self.student.id,
            'amount': '4000.00',
            'due_date': self.fee.due_date.isoformat(),
            'waived_amount': '0.00'
        }
        response = self.client.put(f'/api/fees/{self.fee.id}/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(response.data['amount']), Decimal('4000.00'))

    def test_partial_update_fee(self):
        """Test PATCH /api/fees/{id}/ - partial update fee."""
        data = {'amount': '3500.00'}
        response = self.client.patch(f'/api/fees/{self.fee.id}/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(response.data['amount']), Decimal('3500.00'))

    def test_delete_fee(self):
        """Test DELETE /api/fees/{id}/ - delete fee."""
        response = self.client.delete(f'/api/fees/{self.fee.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        # Verify fee is deleted
        response = self.client.get(f'/api/fees/{self.fee.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_apply_discount(self):
        """Test POST /api/fees/{id}/apply_discount/ - apply discount to fee."""
        data = {
            'discount_type': 'percentage',
            'value': '10.00',
            'reason': 'Academic excellence'
        }
        response = self.client.post(f'/api/fees/{self.fee.id}/apply_discount/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Decimal(response.data['value']), Decimal('10.00'))

    def test_apply_discount_insufficient_permissions(self):
        """Test apply discount with insufficient permissions."""
        # Authenticate as student
        student_user = User.objects.create_user(
            username='test_student_perm',
            email='student@test.com',
            role=User.Role.STUDENT
        )
        self.client.force_authenticate(user=student_user)

        data = {
            'discount_type': 'amount',
            'value': '100.00',
            'reason': 'Test discount'
        }
        response = self.client.post(f'/api/fees/{self.fee.id}/apply_discount/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_waive_amount(self):
        """Test POST /api/fees/{id}/waive_amount/ - waive amount from fee."""
        data = {'amount': '500.00'}
        response = self.client.post(f'/api/fees/{self.fee.id}/waive_amount/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Check that waived amount was updated
        self.fee.refresh_from_db()
        self.assertEqual(self.fee.waived_amount, Decimal('500.00'))

    def test_waive_amount_exceeds_balance(self):
        """Test waive amount that exceeds outstanding balance."""
        data = {'amount': '3000.00'}  # More than outstanding balance
        response = self.client.post(f'/api/fees/{self.fee.id}/waive_amount/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)


class PaymentViewSetTest(APITestCase):
    """Test cases for PaymentViewSet API endpoints."""

    def setUp(self):
        """Set up test data and client."""
        self.client = APIClient()
        self.scenario = create_complete_fee_scenario()
        self.fee = self.scenario['fee']
        self.payment = self.scenario['payment']
        self.principal = self.scenario['principal_user']

        # Authenticate as principal
        self.client.force_authenticate(user=self.principal)

    def test_list_payments(self):
        """Test GET /api/payments/ - list all payments."""
        response = self.client.get('/api/payments/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertGreater(len(response.data['results']), 0)

    def test_list_payments_filtered_by_fee(self):
        """Test GET /api/payments/ with fee filter."""
        response = self.client.get(f'/api/payments/?fee_id={self.fee.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for payment in response.data['results']:
            self.assertEqual(payment['fee']['id'], self.fee.id)

    def test_list_payments_filtered_by_status(self):
        """Test GET /api/payments/ with status filter."""
        response = self.client.get('/api/payments/?status=completed')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for payment in response.data['results']:
            self.assertEqual(payment['status'], 'completed')

    def test_retrieve_payment(self):
        """Test GET /api/payments/{id}/ - retrieve single payment."""
        response = self.client.get(f'/api/payments/{self.payment.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], self.payment.id)
        self.assertIn('fee', response.data)
        self.assertIn('refunds', response.data)

    def test_create_payment(self):
        """Test POST /api/payments/ - create new payment."""
        data = {
            'fee': self.fee.id,
            'amount': '500.00',
            'payment_method': 'upi',
            'transaction_id': 'TESTCREATE456'
        }
        response = self.client.post('/api/payments/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Decimal(response.data['amount']), Decimal('500.00'))

    def test_create_payment_exceeds_balance(self):
        """Test POST /api/payments/ with amount exceeding outstanding balance."""
        data = {
            'fee': self.fee.id,
            'amount': '3000.00',  # More than outstanding balance
            'payment_method': 'cash'
        }
        response = self.client.post('/api/payments/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_payment_status(self):
        """Test POST /api/payments/{id}/update_status/ - update payment status."""
        data = {'status': 'completed'}
        response = self.client.post(f'/api/payments/{self.payment.id}/update_status/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'completed')

    def test_update_payment_status_invalid_status(self):
        """Test update payment status with invalid status."""
        data = {'status': 'invalid_status'}
        response = self.client.post(f'/api/payments/{self.payment.id}/update_status/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_process_refund(self):
        """Test POST /api/payments/{id}/process_refund/ - process refund."""
        data = {
            'amount': '1000.00',
            'reason': 'Duplicate payment'
        }
        response = self.client.post(f'/api/payments/{self.payment.id}/process_refund/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Decimal(response.data['amount']), Decimal('1000.00'))

    def test_process_refund_insufficient_permissions(self):
        """Test process refund with insufficient permissions."""
        # Authenticate as student
        student_user = User.objects.create_user(
            username='student_refund_test',
            email='studentrefund@test.com',
            role=User.Role.STUDENT
        )
        self.client.force_authenticate(user=student_user)

        data = {
            'amount': '500.00',
            'reason': 'Test refund'
        }
        response = self.client.post(f'/api/payments/{self.payment.id}/process_refund/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class AuthenticationTest(APITestCase):
    """Test authentication and permission requirements."""

    def setUp(self):
        """Set up test data."""
        self.client = APIClient()
        self.scenario = create_complete_fee_scenario()
        self.fee = self.scenario['fee']
        self.student_user = self.scenario['student_user']
        self.teacher_user = self.scenario['teacher_user']
        self.principal_user = self.scenario['principal_user']

    def test_unauthenticated_access_denied(self):
        """Test that unauthenticated requests are denied."""
        response = self.client.get('/api/fees/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_student_can_access_own_fees(self):
        """Test that students can access their own fees."""
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/fees/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_student_cannot_access_other_student_fees(self):
        """Test that students cannot access other students' fees."""
        # Create another student and fee
        other_student = StudentFactory()
        other_fee = FeeFactory(student=other_student)

        self.client.force_authenticate(user=self.student_user)
        response = self.client.get(f'/api/fees/{other_fee.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_teacher_can_access_all_fees(self):
        """Test that teachers can access all fees."""
        self.client.force_authenticate(user=self.teacher_user)
        response = self.client.get('/api/fees/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_principal_can_access_all_fees(self):
        """Test that principals can access all fees."""
        self.client.force_authenticate(user=self.principal_user)
        response = self.client.get('/api/fees/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class FeeAnalyticsViewSetTest(APITestCase):
    """Test cases for FeeAnalyticsViewSet."""

    def setUp(self):
        """Set up test data and client."""
        self.client = APIClient()
        self.scenario = create_complete_fee_scenario()
        self.principal = self.scenario['principal_user']

        # Authenticate as principal
        self.client.force_authenticate(user=self.principal)

    def test_student_fees_summary(self):
        """Test GET /api/fee-analytics/student_fees_summary/."""
        response = self.client.get('/api/fee-analytics/student_fees_summary/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)

    def test_outstanding_balances(self):
        """Test GET /api/fee-analytics/outstanding_balances/."""
        response = self.client.get('/api/fee-analytics/outstanding_balances/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)

    def test_payment_history(self):
        """Test GET /api/fee-analytics/payment_history/."""
        response = self.client.get('/api/fee-analytics/payment_history/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)

    def test_revenue_analytics(self):
        """Test GET /api/fee-analytics/revenue_analytics/."""
        response = self.client.get('/api/fee-analytics/revenue_analytics/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('revenue_by_type', response.data)
        self.assertIn('monthly_revenue', response.data)


class StudentFeesViewTest(APITestCase):
    """Test cases for StudentFeesView."""

    def setUp(self):
        """Set up test data and client."""
        self.client = APIClient()
        self.scenario = create_complete_fee_scenario()
        self.student = self.scenario['student']
        self.principal = self.scenario['principal_user']

        # Authenticate as principal
        self.client.force_authenticate(user=self.principal)

    def test_get_student_fees(self):
        """Test GET /api/students/{id}/fees/."""
        response = self.client.get(f'/api/students/{self.student.id}/fees/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)

    def test_get_student_fees_invalid_student(self):
        """Test GET /api/students/{id}/fees/ with invalid student ID."""
        response = self.client.get('/api/students/99999/fees/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class PaymentProcessingViewTest(APITestCase):
    """Test cases for PaymentProcessingView."""

    def setUp(self):
        """Set up test data and client."""
        self.client = APIClient()
        self.scenario = create_complete_fee_scenario()
        self.fee = self.scenario['fee']
        self.principal = self.scenario['principal_user']

        # Authenticate as principal
        self.client.force_authenticate(user=self.principal)

    def test_process_payment_success(self):
        """Test POST /api/process-payment/ - successful payment processing."""
        data = {
            'fee_id': self.fee.id,
            'amount': '500.00',
            'payment_method': 'upi',
            'transaction_id': 'PROCESSTEST123'
        }
        response = self.client.post('/api/process-payment/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('payment', response.data)

    def test_process_payment_missing_fee_id(self):
        """Test POST /api/process-payment/ with missing fee_id."""
        data = {
            'amount': '500.00',
            'payment_method': 'cash'
        }
        response = self.client.post('/api/process-payment/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_process_payment_invalid_fee(self):
        """Test POST /api/process-payment/ with invalid fee ID."""
        data = {
            'fee_id': 99999,
            'amount': '500.00',
            'payment_method': 'cash'
        }
        response = self.client.post('/api/process-payment/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class ErrorHandlingTest(APITestCase):
    """Test error handling in API views."""

    def setUp(self):
        """Set up test data and client."""
        self.client = APIClient()
        self.scenario = create_complete_fee_scenario()
        self.principal = self.scenario['principal_user']

        # Authenticate as principal
        self.client.force_authenticate(user=self.principal)

    def test_invalid_json_payload(self):
        """Test handling of invalid JSON payload."""
        response = self.client.post(
            '/api/fees/',
            'invalid json',
            content_type='application/json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_method_not_allowed(self):
        """Test handling of unsupported HTTP methods."""
        response = self.client.patch('/api/fees/')  # PATCH not allowed on list
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_validation_error_formatting(self):
        """Test that validation errors are properly formatted."""
        data = {
            'student': self.scenario['student'].id,
            'amount': '0.00',  # Invalid amount
            'due_date': (timezone.now().date() + timezone.timedelta(days=30)).isoformat()
        }
        response = self.client.post('/api/fees/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('amount', response.data)


class PaginationTest(APITestCase):
    """Test pagination in API views."""

    def setUp(self):
        """Set up test data and client."""
        self.client = APIClient()
        self.principal = UserFactory(role=User.Role.PRINCIPAL)

        # Create multiple fees for pagination testing
        for i in range(25):  # More than default page size
            student = StudentFactory()
            FeeFactory(student=student)

        # Authenticate as principal
        self.client.force_authenticate(user=self.principal)

    def test_pagination_in_fee_list(self):
        """Test pagination in fee list view."""
        response = self.client.get('/api/fees/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertIn('count', response.data)
        self.assertIn('next', response.data)
        self.assertIn('previous', response.data)

    def test_pagination_page_size(self):
        """Test custom page size."""
        response = self.client.get('/api/fees/?page_size=10')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 10)

    def test_pagination_page_navigation(self):
        """Test pagination page navigation."""
        response = self.client.get('/api/fees/?page=2')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(response.data.get('previous'))


class FilteringTest(APITestCase):
    """Test filtering functionality in API views."""

    def setUp(self):
        """Set up test data and client."""
        self.client = APIClient()
        self.principal = UserFactory(role=User.Role.PRINCIPAL)

        # Create test data with different statuses
        student = StudentFactory()
        self.paid_fee = FeeFactory(student=student, status=Fee.Status.PAID)
        self.unpaid_fee = FeeFactory(student=student, status=Fee.Status.UNPAID)
        self.partial_fee = FeeFactory(student=student, status=Fee.Status.PARTIAL)

        # Authenticate as principal
        self.client.force_authenticate(user=self.principal)

    def test_status_filtering(self):
        """Test filtering fees by status."""
        response = self.client.get('/api/fees/?status=paid')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for fee in response.data['results']:
            self.assertEqual(fee['status'], 'paid')

        response = self.client.get('/api/fees/?status=unpaid')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for fee in response.data['results']:
            self.assertEqual(fee['status'], 'unpaid')

    def test_combined_filters(self):
        """Test combining multiple filters."""
        # This would depend on the specific filtering implementation
        # For now, just test that multiple parameters are accepted
        response = self.client.get('/api/fees/?status=unpaid&student_id=1')
        self.assertEqual(response.status_code, status.HTTP_200_OK)