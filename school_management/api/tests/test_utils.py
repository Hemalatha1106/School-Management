import factory
from django.contrib.auth import get_user_model
from django.utils import timezone
from ..models import *

User = get_user_model()


class UserFactory(factory.django.DjangoModelFactory):
    """Factory for creating test users."""
    class Meta:
        model = User

    username = factory.Sequence(lambda n: f'testuser{n}')
    email = factory.LazyAttribute(lambda obj: f'{obj.username}@example.com')
    first_name = factory.Faker('first_name')
    last_name = factory.Faker('last_name')
    role = User.Role.STUDENT


class StudentFactory(factory.django.DjangoModelFactory):
    """Factory for creating test students."""
    class Meta:
        model = Student

    user = factory.SubFactory(UserFactory)


class TeacherFactory(factory.django.DjangoModelFactory):
    """Factory for creating test teachers."""
    class Meta:
        model = Teacher

    user = factory.SubFactory(UserFactory, role=User.Role.TEACHER)
    salary = factory.Faker('pydecimal', left_digits=5, right_digits=2, positive=True)


class PrincipalFactory(factory.django.DjangoModelFactory):
    """Factory for creating test principals."""
    class Meta:
        model = User

    username = factory.Sequence(lambda n: f'principal{n}')
    email = factory.LazyAttribute(lambda obj: f'{obj.username}@example.com')
    first_name = factory.Faker('first_name')
    last_name = factory.Faker('last_name')
    role = User.Role.PRINCIPAL


class SchoolClassFactory(factory.django.DjangoModelFactory):
    """Factory for creating test school classes."""
    class Meta:
        model = SchoolClass

    name = factory.Sequence(lambda n: f'Class {n}')


class FeeTypeFactory(factory.django.DjangoModelFactory):
    """Factory for creating test fee types."""
    class Meta:
        model = FeeType

    name = factory.Sequence(lambda n: f'Fee Type {n}')
    description = factory.Faker('sentence')
    amount = factory.Faker('pydecimal', left_digits=4, right_digits=2, positive=True)
    category = factory.Iterator(FeeType.Category.choices, getter=lambda c: c[0])


class FeeFactory(factory.django.DjangoModelFactory):
    """Factory for creating test fees."""
    class Meta:
        model = Fee

    student = factory.SubFactory(StudentFactory)
    amount = factory.Faker('pydecimal', left_digits=4, right_digits=2, positive=True, min_value=100, max_value=50000)
    due_date = factory.Faker('date_between', start_date='+1d', end_date='+365d')
    status = Fee.Status.UNPAID
    waived_amount = 0.00


class PaymentFactory(factory.django.DjangoModelFactory):
    """Factory for creating test payments."""
    class Meta:
        model = Payment

    fee = factory.SubFactory(FeeFactory)
    amount = factory.LazyAttribute(lambda obj: obj.fee.amount)
    payment_method = factory.Iterator(Payment.PaymentMethod.choices, getter=lambda c: c[0])
    transaction_id = factory.Sequence(lambda n: f'TXN{n:06d}')
    status = Payment.Status.COMPLETED
    processed_by = factory.SubFactory(PrincipalFactory)


class DiscountFactory(factory.django.DjangoModelFactory):
    """Factory for creating test discounts."""
    class Meta:
        model = Discount

    student = factory.SubFactory(StudentFactory)
    fee = factory.SubFactory(FeeFactory)
    discount_type = factory.Iterator(Discount._meta.get_field('discount_type').choices, getter=lambda c: c[0])
    value = factory.Faker('pydecimal', left_digits=3, right_digits=2, positive=True, max_value=50)
    reason = factory.Faker('sentence')
    applied_by = factory.SubFactory(PrincipalFactory)


class RefundFactory(factory.django.DjangoModelFactory):
    """Factory for creating test refunds."""
    class Meta:
        model = Refund

    payment = factory.SubFactory(PaymentFactory)
    amount = factory.LazyAttribute(lambda obj: obj.payment.amount / 2)
    reason = factory.Faker('sentence')
    status = Refund.Status.PROCESSED
    processed_by = factory.SubFactory(PrincipalFactory)


class FeeStructureFactory(factory.django.DjangoModelFactory):
    """Factory for creating test fee structures."""
    class Meta:
        model = FeeStructure

    fee_type = factory.SubFactory(FeeTypeFactory)
    school_class = factory.SubFactory(SchoolClassFactory)
    amount = factory.Faker('pydecimal', left_digits=4, right_digits=2, positive=True)
    is_active = True


# Test Fixtures
def create_test_school():
    """Create a test school instance."""
    return School.objects.create(
        name="Test High School",
        address="123 Test Street, Test City",
        phone="+91-9876543210",
        email="test@school.com",
        academic_year="2024-2025",
        school_timings="8:00 AM - 3:00 PM"
    )


def create_complete_fee_scenario():
    """Create a complete fee payment scenario for testing."""
    # Create school
    school = create_test_school()

    # Create users
    student_user = UserFactory(role=User.Role.STUDENT)
    teacher_user = UserFactory(role=User.Role.TEACHER)
    principal_user = UserFactory(role=User.Role.PRINCIPAL)

    # Create profiles
    student = Student.objects.create(user=student_user)
    teacher = Teacher.objects.create(user=teacher_user, salary=50000.00)

    # Create class
    school_class = SchoolClass.objects.create(name="Test Class 10A")

    # Assign student to class
    student.school_class = school_class
    student.save()

    # Create fee type
    fee_type = FeeType.objects.create(
        name="Tuition Fee",
        description="Monthly tuition fee",
        amount=5000.00,
        category=FeeType.Category.TUITION
    )

    # Create fee
    fee = Fee.objects.create(
        student=student,
        amount=5000.00,
        due_date=timezone.now().date() + timezone.timedelta(days=30),
        status=Fee.Status.UNPAID
    )

    # Create partial payment
    payment = Payment.objects.create(
        fee=fee,
        amount=3000.00,
        payment_method=Payment.PaymentMethod.UPI,
        transaction_id="TEST123456",
        status=Payment.Status.COMPLETED,
        processed_by=principal_user
    )

    return {
        'school': school,
        'student_user': student_user,
        'teacher_user': teacher_user,
        'principal_user': principal_user,
        'student': student,
        'teacher': teacher,
        'school_class': school_class,
        'fee_type': fee_type,
        'fee': fee,
        'payment': payment
    }


def create_overdue_fee_scenario():
    """Create an overdue fee scenario for testing."""
    scenario = create_complete_fee_scenario()

    # Make fee overdue
    scenario['fee'].due_date = timezone.now().date() - timezone.timedelta(days=30)
    scenario['fee'].save()

    return scenario


def create_paid_fee_scenario():
    """Create a fully paid fee scenario for testing."""
    scenario = create_complete_fee_scenario()

    # Create full payment
    Payment.objects.create(
        fee=scenario['fee'],
        amount=2000.00,  # Remaining amount
        payment_method=Payment.PaymentMethod.CASH,
        transaction_id="TEST789012",
        status=Payment.Status.COMPLETED,
        processed_by=scenario['principal_user']
    )

    return scenario