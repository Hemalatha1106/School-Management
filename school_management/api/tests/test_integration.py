import pytest
from django.test import TestCase, TransactionTestCase
from django.utils import timezone
from django.db import transaction
from decimal import Decimal
from rest_framework.test import APITestCase, APIClient
from rest_framework import status

from ..models import *
from .test_utils import *


class FeePaymentWorkflowIntegrationTest(APITestCase):
    """Integration tests for complete fee payment workflow."""

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

    def test_complete_fee_payment_workflow(self):
        """Test complete fee payment workflow from creation to completion."""
        # Step 1: Create a new fee
        fee_data = {
            'student': self.student.id,
            'amount': '5000.00',
            'due_date': (timezone.now().date() + timezone.timedelta(days=30)).isoformat()
        }
        response = self.client.post('/api/fees/', fee_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        fee_id = response.data['id']

        # Step 2: Retrieve the created fee
        response = self.client.get(f'/api/fees/{fee_id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(response.data['amount']), Decimal('5000.00'))
        self.assertEqual(response.data['status'], 'unpaid')

        # Step 3: Make a partial payment
        payment_data = {
            'fee': fee_id,
            'amount': '3000.00',
            'payment_method': 'upi',
            'transaction_id': 'WORKFLOW123'
        }
        response = self.client.post('/api/payments/', payment_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Step 4: Check fee status updated to partial
        response = self.client.get(f'/api/fees/{fee_id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'partial')
        self.assertEqual(Decimal(response.data['outstanding_balance']), Decimal('2000.00'))

        # Step 5: Make final payment
        payment_data = {
            'fee': fee_id,
            'amount': '2000.00',
            'payment_method': 'cash',
            'transaction_id': 'WORKFLOW456'
        }
        response = self.client.post('/api/payments/', payment_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Step 6: Verify fee is now fully paid
        response = self.client.get(f'/api/fees/{fee_id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'paid')
        self.assertEqual(Decimal(response.data['outstanding_balance']), Decimal('0.00'))

    def test_fee_discount_and_payment_workflow(self):
        """Test workflow with discount application and payment."""
        # Create a new fee
        fee_data = {
            'student': self.student.id,
            'amount': '4000.00',
            'due_date': (timezone.now().date() + timezone.timedelta(days=30)).isoformat()
        }
        response = self.client.post('/api/fees/', fee_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        fee_id = response.data['id']

        # Apply discount
        discount_data = {
            'discount_type': 'percentage',
            'value': '10.00',  # 10% discount = ₹400
            'reason': 'Academic excellence'
        }
        response = self.client.post(f'/api/fees/{fee_id}/apply_discount/', discount_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Check fee updated with discount
        response = self.client.get(f'/api/fees/{fee_id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(response.data['waived_amount']), Decimal('400.00'))
        self.assertEqual(Decimal(response.data['outstanding_balance']), Decimal('3600.00'))

        # Make payment for discounted amount
        payment_data = {
            'fee': fee_id,
            'amount': '3600.00',
            'payment_method': 'bank_transfer',
            'transaction_id': 'DISCOUNT123'
        }
        response = self.client.post('/api/payments/', payment_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Verify fee is paid
        response = self.client.get(f'/api/fees/{fee_id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'paid')

    def test_overdue_fee_workflow(self):
        """Test workflow for overdue fees."""
        # Create an overdue fee
        past_date = timezone.now().date() - timezone.timedelta(days=30)
        fee_data = {
            'student': self.student.id,
            'amount': '2000.00',
            'due_date': past_date.isoformat()
        }
        response = self.client.post('/api/fees/', fee_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        fee_id = response.data['id']

        # Check that fee is marked as overdue
        response = self.client.get(f'/api/fees/{fee_id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['is_overdue'])

        # Apply waiver for overdue fee
        waiver_data = {'amount': '200.00'}
        response = self.client.post(f'/api/fees/{fee_id}/waive_amount/', waiver_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Make payment for remaining amount
        payment_data = {
            'fee': fee_id,
            'amount': '1800.00',
            'payment_method': 'cash',
            'transaction_id': 'OVERDUE123'
        }
        response = self.client.post('/api/payments/', payment_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Verify overdue fee is resolved
        response = self.client.get(f'/api/fees/{fee_id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'paid')
        self.assertFalse(response.data['is_overdue'])


class UserRolePermissionIntegrationTest(APITestCase):
    """Integration tests for user role permissions."""

    def setUp(self):
        """Set up test data."""
        self.client = APIClient()
        self.scenario = create_complete_fee_scenario()
        self.fee = self.scenario['fee']
        self.student = self.scenario['student']
        self.student_user = self.scenario['student_user']
        self.teacher_user = self.scenario['teacher_user']
        self.principal_user = self.scenario['principal_user']

    def test_student_permissions(self):
        """Test student user permissions."""
        self.client.force_authenticate(user=self.student_user)

        # Student can view their own fees
        response = self.client.get('/api/fees/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Student can view their own payments
        response = self.client.get('/api/payments/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Student cannot create fees
        fee_data = {
            'student': self.student.id,
            'amount': '1000.00',
            'due_date': (timezone.now().date() + timezone.timedelta(days=30)).isoformat()
        }
        response = self.client.post('/api/fees/', fee_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Student cannot access other student's fees
        other_student = StudentFactory()
        other_fee = FeeFactory(student=other_student)
        response = self.client.get(f'/api/fees/{other_fee.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_teacher_permissions(self):
        """Test teacher user permissions."""
        self.client.force_authenticate(user=self.teacher_user)

        # Teacher can view all fees
        response = self.client.get('/api/fees/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Teacher can create fees
        fee_data = {
            'student': self.student.id,
            'amount': '1500.00',
            'due_date': (timezone.now().date() + timezone.timedelta(days=30)).isoformat()
        }
        response = self.client.post('/api/fees/', fee_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Teacher can process payments
        payment_data = {
            'fee': self.fee.id,
            'amount': '500.00',
            'payment_method': 'cash',
            'transaction_id': 'TEACHER123'
        }
        response = self.client.post('/api/payments/', payment_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Teacher can apply discounts
        discount_data = {
            'discount_type': 'amount',
            'value': '100.00',
            'reason': 'Teacher approved discount'
        }
        response = self.client.post(f'/api/fees/{self.fee.id}/apply_discount/', discount_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_principal_permissions(self):
        """Test principal user permissions."""
        self.client.force_authenticate(user=self.principal_user)

        # Principal can access all endpoints
        response = self.client.get('/api/fees/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Principal can create fees
        fee_data = {
            'student': self.student.id,
            'amount': '2000.00',
            'due_date': (timezone.now().date() + timezone.timedelta(days=30)).isoformat()
        }
        response = self.client.post('/api/fees/', fee_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Principal can process refunds
        payment = self.scenario['payment']
        refund_data = {
            'amount': '500.00',
            'reason': 'Principal approved refund'
        }
        response = self.client.post(f'/api/payments/{payment.id}/process_refund/', refund_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Principal can waive amounts
        waiver_data = {'amount': '200.00'}
        response = self.client.post(f'/api/fees/{self.fee.id}/waive_amount/', waiver_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_unauthenticated_access(self):
        """Test that unauthenticated users cannot access protected endpoints."""
        # Clear authentication
        self.client.force_authenticate(user=None)

        # Try to access protected endpoints
        response = self.client.get('/api/fees/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        response = self.client.post('/api/fees/', {})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        response = self.client.get('/api/payments/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class DatabaseTransactionIntegrationTest(TransactionTestCase):
    """Integration tests for database transactions and rollbacks."""

    def setUp(self):
        """Set up test data."""
        self.scenario = create_complete_fee_scenario()
        self.fee = self.scenario['fee']
        self.principal = self.scenario['principal_user']

    def test_payment_creation_transaction_rollback(self):
        """Test that payment creation failure rolls back transaction."""
        initial_payment_count = Payment.objects.count()
        initial_fee_status = self.fee.status

        # Attempt to create payment with invalid data that should fail
        with transaction.atomic():
            try:
                Payment.objects.create(
                    fee=self.fee,
                    amount=Decimal('0.00'),  # Invalid amount
                    payment_method=Payment.PaymentMethod.CASH,
                    processed_by=self.principal
                )
            except Exception:
                # Transaction should be rolled back
                pass

        # Verify no payment was created
        self.assertEqual(Payment.objects.count(), initial_payment_count)
        # Verify fee status unchanged
        self.fee.refresh_from_db()
        self.assertEqual(self.fee.status, initial_fee_status)

    def test_fee_update_transaction_rollback(self):
        """Test that fee update failure rolls back transaction."""
        original_amount = self.fee.amount

        with transaction.atomic():
            # Update fee amount
            self.fee.amount = Decimal('6000.00')
            self.fee.save()

            # Simulate an error that should cause rollback
            try:
                Fee.objects.create(
                    student=self.scenario['student'],
                    amount=Decimal('0.00'),  # Invalid amount
                    due_date=timezone.now().date() + timezone.timedelta(days=30)
                )
            except Exception:
                # This should cause the transaction to roll back
                raise

        # Verify fee amount was rolled back
        self.fee.refresh_from_db()
        self.assertEqual(self.fee.amount, original_amount)

    def test_bulk_operation_transaction(self):
        """Test bulk operations within transactions."""
        students = [StudentFactory() for _ in range(3)]
        initial_fee_count = Fee.objects.count()

        with transaction.atomic():
            fees_created = []
            try:
                for student in students:
                    fee = Fee.objects.create(
                        student=student,
                        amount=Decimal('1000.00'),
                        due_date=timezone.now().date() + timezone.timedelta(days=30)
                    )
                    fees_created.append(fee)

                # Simulate error in bulk operation
                if len(fees_created) == 2:
                    raise ValidationError("Simulated bulk operation error")

            except ValidationError:
                # Transaction should be rolled back
                pass

        # Verify no fees were created due to rollback
        self.assertEqual(Fee.objects.count(), initial_fee_count)

    def test_nested_transaction_behavior(self):
        """Test nested transaction behavior."""
        original_amount = self.fee.amount

        with transaction.atomic():
            # Outer transaction
            self.fee.amount = Decimal('7000.00')
            self.fee.save()

            try:
                with transaction.atomic():
                    # Inner transaction
                    self.fee.amount = Decimal('8000.00')
                    self.fee.save()

                    # Cause inner transaction to fail
                    raise ValidationError("Inner transaction error")

            except ValidationError:
                # Inner transaction failed, but outer should continue
                pass

            # This should still be saved since outer transaction continues
            self.fee.amount = Decimal('7500.00')
            self.fee.save()

        # Verify final amount
        self.fee.refresh_from_db()
        self.assertEqual(self.fee.amount, Decimal('7500.00'))


class APIWebInterfaceIntegrationTest(APITestCase):
    """Integration tests for API-to-web interface integration."""

    def setUp(self):
        """Set up test data and client."""
        self.client = APIClient()
        self.scenario = create_complete_fee_scenario()
        self.fee = self.scenario['fee']
        self.student = self.scenario['student']
        self.principal = self.scenario['principal_user']

        # Authenticate as principal
        self.client.force_authenticate(user=self.principal)

    def test_fee_list_api_integration(self):
        """Test fee list API integration with web interface expectations."""
        # Create multiple fees for testing
        for i in range(5):
            FeeFactory(student=self.student)

        response = self.client.get('/api/fees/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify response structure matches web interface expectations
        self.assertIn('results', response.data)
        self.assertIn('count', response.data)

        for fee in response.data['results']:
            self.assertIn('id', fee)
            self.assertIn('student', fee)
            self.assertIn('amount', fee)
            self.assertIn('status', fee)
            self.assertIn('due_date', fee)
            self.assertIn('outstanding_balance', fee)

    def test_payment_processing_api_integration(self):
        """Test payment processing API integration."""
        # Process payment via API
        payment_data = {
            'fee_id': self.fee.id,
            'amount': '500.00',
            'payment_method': 'upi',
            'transaction_id': 'API_INTEGRATION_123'
        }
        response = self.client.post('/api/process-payment/', payment_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Verify payment was created
        self.assertIn('payment', response.data)
        payment_id = response.data['payment']['id']

        # Verify payment exists in database
        payment = Payment.objects.get(id=payment_id)
        self.assertEqual(payment.amount, Decimal('500.00'))
        self.assertEqual(payment.transaction_id, 'API_INTEGRATION_123')

        # Verify notification was created
        notification_exists = Notification.objects.filter(
            user=self.student.user,
            title='Payment Confirmed'
        ).exists()
        self.assertTrue(notification_exists)

    def test_analytics_api_integration(self):
        """Test analytics API integration with dashboard expectations."""
        # Create additional test data
        for i in range(3):
            student = StudentFactory()
            fee = FeeFactory(student=student)
            PaymentFactory(fee=fee)

        # Test student fees summary
        response = self.client.get('/api/fee-analytics/student_fees_summary/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)

        # Test outstanding balances
        response = self.client.get('/api/fee-analytics/outstanding_balances/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)

        # Test payment history
        response = self.client.get('/api/fee-analytics/payment_history/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)

    def test_error_handling_integration(self):
        """Test error handling integration between API and web interface."""
        # Test invalid fee creation
        invalid_data = {
            'student': self.student.id,
            'amount': '0.00',  # Invalid amount
            'due_date': (timezone.now().date() + timezone.timedelta(days=30)).isoformat()
        }
        response = self.client.post('/api/fees/', invalid_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # Verify error structure is suitable for web interface
        self.assertIn('amount', response.data)

        # Test invalid payment processing
        invalid_payment = {
            'fee_id': 99999,  # Non-existent fee
            'amount': '100.00',
            'payment_method': 'cash'
        }
        response = self.client.post('/api/process-payment/', invalid_payment, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_pagination_integration(self):
        """Test pagination integration with web interface."""
        # Create many fees for pagination
        for i in range(25):
            FeeFactory(student=self.student)

        # Test first page
        response = self.client.get('/api/fees/?page=1')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertIn('next', response.data)
        self.assertIn('previous', response.data)

        # Test second page
        response = self.client.get('/api/fees/?page=2')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(response.data.get('previous'))

    def test_filtering_integration(self):
        """Test filtering integration with web interface."""
        # Create fees with different statuses
        paid_fee = FeeFactory(student=self.student, status=Fee.Status.PAID)
        unpaid_fee = FeeFactory(student=self.student, status=Fee.Status.UNPAID)
        partial_fee = FeeFactory(student=self.student, status=Fee.Status.PARTIAL)

        # Test status filtering
        response = self.client.get('/api/fees/?status=paid')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for fee in response.data['results']:
            self.assertEqual(fee['status'], 'paid')

        response = self.client.get('/api/fees/?status=unpaid')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for fee in response.data['results']:
            self.assertEqual(fee['status'], 'unpaid')


class ConcurrentAccessIntegrationTest(TransactionTestCase):
    """Integration tests for concurrent access scenarios."""

    def setUp(self):
        """Set up test data."""
        self.scenario = create_complete_fee_scenario()
        self.fee = self.scenario['fee']
        self.principal = self.scenario['principal_user']

    def test_concurrent_payment_processing(self):
        """Test concurrent payment processing on the same fee."""
        import threading
        import time

        results = []
        errors = []

        def process_payment(amount, txn_id):
            try:
                from django.test.utils import override_settings
                from django.db import connection

                # Each thread needs its own database connection
                connection.close()
                connection.connect()

                payment = Payment.objects.create(
                    fee=self.fee,
                    amount=Decimal(str(amount)),
                    payment_method=Payment.PaymentMethod.UPI,
                    transaction_id=txn_id,
                    processed_by=self.principal
                )
                results.append(payment.id)
            except Exception as e:
                errors.append(str(e))

        # Create threads for concurrent payment processing
        thread1 = threading.Thread(target=process_payment, args=(500, 'CONCURRENT1'))
        thread2 = threading.Thread(target=process_payment, args=(700, 'CONCURRENT2'))

        # Start threads
        thread1.start()
        thread2.start()

        # Wait for threads to complete
        thread1.join()
        thread2.join()

        # Verify results
        self.assertEqual(len(results), 2)  # Both payments should succeed
        self.assertEqual(len(errors), 0)   # No errors should occur

        # Verify fee status
        self.fee.refresh_from_db()
        self.assertEqual(self.fee.status, Fee.Status.PAID)  # Fee should be fully paid

    def test_concurrent_fee_updates(self):
        """Test concurrent fee updates."""
        import threading

        results = []
        errors = []

        def update_fee_amount(new_amount):
            try:
                from django.db import connection
                connection.close()
                connection.connect()

                self.fee.amount = Decimal(str(new_amount))
                self.fee.save()
                results.append(new_amount)
            except Exception as e:
                errors.append(str(e))

        # Create threads for concurrent updates
        thread1 = threading.Thread(target=update_fee_amount, args=(6000,))
        thread2 = threading.Thread(target=update_fee_amount, args=(7000,))

        thread1.start()
        thread2.start()

        thread1.join()
        thread2.join()

        # One of the updates should succeed
        self.assertTrue(len(results) >= 1)
        # The final amount should be one of the attempted values
        self.fee.refresh_from_db()
        self.assertIn(self.fee.amount, [Decimal('6000.00'), Decimal('7000.00')])


class DataConsistencyIntegrationTest(TestCase):
    """Integration tests for data consistency across the system."""

    def setUp(self):
        """Set up test data."""
        self.scenario = create_complete_fee_scenario()
        self.fee = self.scenario['fee']
        self.student = self.scenario['student']
        self.principal = self.scenario['principal_user']

    def test_payment_fee_consistency(self):
        """Test data consistency between payments and fees."""
        # Create multiple payments
        payments = []
        for i in range(3):
            payment = Payment.objects.create(
                fee=self.fee,
                amount=Decimal('500.00'),
                payment_method=Payment.PaymentMethod.UPI,
                transaction_id=f'CONSISTENCY{i}',
                processed_by=self.principal
            )
            payments.append(payment)

        # Calculate expected total paid
        expected_total = sum(p.amount for p in payments)
        expected_outstanding = self.fee.amount - self.fee.waived_amount - expected_total

        # Refresh fee and verify consistency
        self.fee.refresh_from_db()
        self.assertEqual(self.fee.get_outstanding_amount(), expected_outstanding)

        # Verify payment records exist
        for payment in payments:
            self.assertTrue(Payment.objects.filter(id=payment.id).exists())

    def test_discount_fee_consistency(self):
        """Test data consistency between discounts and fees."""
        # Apply multiple discounts
        discounts = []
        for i in range(2):
            discount = Discount.objects.create(
                student=self.student,
                fee=self.fee,
                discount_type='amount',
                value=Decimal('200.00'),
                reason=f'Test discount {i}',
                applied_by=self.principal
            )
            discounts.append(discount)

        # Calculate expected waived amount
        expected_waived = sum(d.value for d in discounts)

        # Refresh fee and verify consistency
        self.fee.refresh_from_db()
        self.assertEqual(self.fee.waived_amount, expected_waived)

        # Verify discount records exist
        for discount in discounts:
            self.assertTrue(Discount.objects.filter(id=discount.id).exists())

    def test_refund_payment_consistency(self):
        """Test data consistency between refunds and payments."""
        # Create a payment
        payment = Payment.objects.create(
            fee=self.fee,
            amount=Decimal('1000.00'),
            payment_method=Payment.PaymentMethod.UPI,
            transaction_id='REFUND_TEST',
            processed_by=self.principal
        )

        # Process a refund
        refund = Refund.objects.create(
            payment=payment,
            amount=Decimal('500.00'),
            reason='Test refund',
            processed_by=self.principal
        )

        # Verify refund record exists
        self.assertTrue(Refund.objects.filter(id=refund.id).exists())

        # Verify payment status
        payment.refresh_from_db()
        self.assertEqual(payment.status, Payment.Status.REFUNDED)

    def test_audit_trail_consistency(self):
        """Test audit trail consistency."""
        # Perform various operations that should create audit entries
        initial_audit_count = AuditLog.objects.count()

        # Create a fee
        fee = Fee.objects.create(
            student=self.student,
            amount=Decimal('1000.00'),
            due_date=timezone.now().date() + timezone.timedelta(days=30)
        )

        # Update the fee
        fee.amount = Decimal('1200.00')
        fee.save()

        # Create a payment
        payment = Payment.objects.create(
            fee=fee,
            amount=Decimal('600.00'),
            payment_method=Payment.PaymentMethod.CASH,
            processed_by=self.principal
        )

        # Check that audit entries were created
        final_audit_count = AuditLog.objects.count()
        self.assertGreater(final_audit_count, initial_audit_count)