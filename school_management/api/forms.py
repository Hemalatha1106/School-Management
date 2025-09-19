from django import forms
from django.contrib.auth.forms import UserCreationForm
from django.utils import timezone
from django.core.validators import validate_email, MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from django.utils.html import strip_tags
import re
import logging
from .models import *

logger = logging.getLogger('api.fee_operations')

class FeeForm(forms.ModelForm):
    """Form for creating and editing fees."""

    class Meta:
        model = Fee
        fields = ['student', 'amount', 'due_date', 'status', 'waived_amount', 'notes']
        widgets = {
            'due_date': forms.DateInput(attrs={'type': 'date'}),
            'notes': forms.Textarea(attrs={'rows': 3}),
            'amount': forms.NumberInput(attrs={'step': '0.01'}),
            'waived_amount': forms.NumberInput(attrs={'step': '0.01'}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Limit student choices to students only
        self.fields['student'].queryset = Student.objects.select_related('user').all()
        self.fields['student'].label_from_instance = lambda obj: f"{obj.user.get_full_name()} ({obj.school_class.name if obj.school_class else 'No Class'})"

        # Set default due date to today + 30 days if creating new fee
        if not self.instance.pk:
            self.fields['due_date'].initial = timezone.now().date() + timezone.timedelta(days=30)

    def clean_amount(self):
        amount = self.cleaned_data.get('amount')
        if amount <= 0:
            raise forms.ValidationError("Amount must be greater than zero.")
        if amount > 1000000:  # Max fee amount limit
            raise forms.ValidationError("Fee amount cannot exceed ₹10,00,000.")
        return amount

    def clean_due_date(self):
        due_date = self.cleaned_data.get('due_date')
        if due_date and due_date < timezone.now().date():
            raise forms.ValidationError("Due date cannot be in the past.")
        if due_date and due_date > timezone.now().date() + timezone.timedelta(days=365*2):
            raise forms.ValidationError("Due date cannot be more than 2 years in the future.")
        return due_date

    def clean_waived_amount(self):
        waived_amount = self.cleaned_data.get('waived_amount')
        if waived_amount < 0:
            raise forms.ValidationError("Waived amount cannot be negative.")
        return waived_amount

    def clean(self):
        cleaned_data = super().clean()
        amount = cleaned_data.get('amount')
        waived_amount = cleaned_data.get('waived_amount')

        if amount and waived_amount and waived_amount > amount:
            raise forms.ValidationError("Waived amount cannot exceed fee amount.")

        return cleaned_data

class PaymentForm(forms.ModelForm):
    """Form for processing payments."""

    # Additional field for Stripe payment method ID
    stripe_payment_method_id = forms.CharField(
        required=False,
        widget=forms.HiddenInput(),
        help_text="Stripe payment method ID for card payments"
    )

    class Meta:
        model = Payment
        fields = ['amount', 'payment_method', 'transaction_id', 'notes']
        widgets = {
            'notes': forms.Textarea(attrs={'rows': 3}),
            'amount': forms.NumberInput(attrs={'step': '0.01'}),
            'transaction_id': forms.TextInput(attrs={'placeholder': 'UPI ID or reference number'}),
        }

    def __init__(self, *args, **kwargs):
        self.fee = kwargs.pop('fee', None)
        super().__init__(*args, **kwargs)

        # Set max amount based on outstanding balance
        if self.fee:
            outstanding = self.fee.amount - self.fee.waived_amount
            for payment in self.fee.payments.filter(status='completed'):
                outstanding -= payment.amount
            self.fields['amount'].widget.attrs['max'] = str(max(0, outstanding))

    def clean_amount(self):
        amount = self.cleaned_data.get('amount')
        if amount <= 0:
            raise forms.ValidationError("Payment amount must be greater than zero.")
        if amount > 1000000:  # Max payment amount limit
            raise forms.ValidationError("Payment amount cannot exceed ₹10,00,000.")

        # Check against outstanding balance
        if self.fee:
            outstanding = self.fee.get_outstanding_amount()
            if amount > outstanding:
                raise forms.ValidationError(f"Payment amount cannot exceed outstanding balance of ₹{outstanding:.2f}")

        return amount

    def clean_transaction_id(self):
        transaction_id = self.cleaned_data.get('transaction_id')
        if transaction_id:
            # Sanitize transaction ID - allow only alphanumeric characters, hyphens, underscores
            if not re.match(r'^[a-zA-Z0-9\-_\.]+$', transaction_id):
                raise forms.ValidationError("Transaction ID contains invalid characters.")

            # Check for uniqueness
            if Payment.objects.filter(transaction_id=transaction_id).exclude(
                pk=self.instance.pk if self.instance else None
            ).exists():
                raise forms.ValidationError("Transaction ID must be unique.")

        return transaction_id

    def clean_notes(self):
        notes = self.cleaned_data.get('notes')
        if notes:
            # Strip HTML tags and limit length
            notes = strip_tags(notes)
            if len(notes) > 1000:
                raise forms.ValidationError("Notes cannot exceed 1000 characters.")
        return notes

class DiscountForm(forms.ModelForm):
    """Form for applying discounts to fees."""

    class Meta:
        model = Discount
        fields = ['discount_type', 'value', 'reason']
        widgets = {
            'reason': forms.Textarea(attrs={'rows': 3}),
            'value': forms.NumberInput(attrs={'step': '0.01'}),
        }

    def __init__(self, *args, **kwargs):
        self.fee = kwargs.pop('fee', None)
        super().__init__(*args, **kwargs)

    def clean_value(self):
        value = self.cleaned_data.get('value')
        discount_type = self.cleaned_data.get('discount_type')

        if value <= 0:
            raise forms.ValidationError("Discount value must be greater than zero.")
        if value > 1000000:  # Max discount amount limit
            raise forms.ValidationError("Discount value cannot exceed ₹10,00,000.")

        if discount_type == 'percentage' and value > 100:
            raise forms.ValidationError("Percentage discount cannot exceed 100%.")

        if discount_type == 'amount' and self.fee:
            max_discount = self.fee.get_outstanding_amount()
            if value > max_discount:
                raise forms.ValidationError(f"Discount amount cannot exceed outstanding balance of ₹{max_discount:.2f}")

        return value

    def clean_reason(self):
        reason = self.cleaned_data.get('reason')
        if reason:
            # Strip HTML tags and limit length
            reason = strip_tags(reason)
            if len(reason) > 500:
                raise forms.ValidationError("Reason cannot exceed 500 characters.")
        return reason

class RefundForm(forms.ModelForm):
    """Form for processing refunds."""

    class Meta:
        model = Refund
        fields = ['amount', 'reason']
        widgets = {
            'reason': forms.Textarea(attrs={'rows': 3}),
            'amount': forms.NumberInput(attrs={'step': '0.01'}),
        }

    def __init__(self, *args, **kwargs):
        self.payment = kwargs.pop('payment', None)
        super().__init__(*args, **kwargs)

        # Set max refund amount
        if self.payment:
            self.fields['amount'].widget.attrs['max'] = str(self.payment.amount)

    def clean_amount(self):
        amount = self.cleaned_data.get('amount')

        if amount <= 0:
            raise forms.ValidationError("Refund amount must be greater than zero.")
        if amount > 1000000:  # Max refund amount limit
            raise forms.ValidationError("Refund amount cannot exceed ₹10,00,000.")

        if self.payment and amount > self.payment.amount:
            raise forms.ValidationError(f"Refund amount cannot exceed payment amount of ₹{self.payment.amount:.2f}")

        return amount

    def clean_reason(self):
        reason = self.cleaned_data.get('reason')
        if not reason or not reason.strip():
            raise forms.ValidationError("Reason is required for refund.")

        # Strip HTML tags and limit length
        reason = strip_tags(reason)
        if len(reason) > 500:
            raise forms.ValidationError("Reason cannot exceed 500 characters.")

        return reason

class FeeTypeForm(forms.ModelForm):
    """Form for managing fee types."""

    class Meta:
        model = FeeType
        fields = ['name', 'description', 'amount', 'category']
        widgets = {
            'description': forms.Textarea(attrs={'rows': 3}),
            'amount': forms.NumberInput(attrs={'step': '0.01'}),
        }

    def clean_amount(self):
        amount = self.cleaned_data.get('amount')
        if amount <= 0:
            raise forms.ValidationError("Amount must be greater than zero.")
        return amount

class FeeStructureForm(forms.ModelForm):
    """Form for managing fee structures."""

    class Meta:
        model = FeeStructure
        fields = ['fee_type', 'school_class', 'amount', 'is_active']
        widgets = {
            'amount': forms.NumberInput(attrs={'step': '0.01'}),
        }

    def clean_amount(self):
        amount = self.cleaned_data.get('amount')
        if amount <= 0:
            raise forms.ValidationError("Amount must be greater than zero.")
        return amount