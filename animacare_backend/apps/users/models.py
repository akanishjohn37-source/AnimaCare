from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    ROLE_CHOICES = (
        ('citizen', 'Citizen / Pet Owner'),
        ('veterinarian', 'Veterinary Doctor'),
        ('shelter_admin', 'Shelter Administrator'),
        ('civic_authority', 'Civic Authority'),
        ('admin', 'System Administrator'),
    )
    ACCOUNT_STATUS_CHOICES = (
        ('pending', 'Pending Approval'),
        ('active', 'Active'),
        ('suspended', 'Suspended'),
        ('rejected', 'Rejected'),
    )

    role = models.CharField(max_length=30, choices=ROLE_CHOICES, default='citizen')
    account_status = models.CharField(
        max_length=20, choices=ACCOUNT_STATUS_CHOICES, default='pending'
    )
    phone_number = models.CharField(max_length=20, blank=True)
    profile_picture = models.URLField(blank=True)
    address = models.TextField(blank=True)
    zone = models.CharField(max_length=255, blank=True, default='')
    # For admins: auto-active, never needs approval
    requires_approval = models.BooleanField(default=True)
    approval_note = models.TextField(blank=True)  # Admin can leave a note on rejection/approval
    approved_by = models.ForeignKey(
        'self', null=True, blank=True, on_delete=models.SET_NULL,
        related_name='approved_users'
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.username} [{self.get_role_display()}] — {self.get_account_status_display()}"

    def is_approved(self):
        return self.account_status == 'active'

    def save(self, *args, **kwargs):
        # Admin & civic_authority accounts are auto-approved only when created by superuser
        # (handled in the serializer / view, not here)
        super().save(*args, **kwargs)


class VeterinarianProfile(models.Model):
    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name='veterinarian_profile'
    )
    clinic_hospital_name = models.CharField(max_length=255)
    medical_license_number = models.CharField(max_length=100, unique=True)
    clinic_address = models.TextField()
    professional_contact_number = models.CharField(max_length=20)
    specialization = models.CharField(max_length=150, blank=True)
    years_of_experience = models.PositiveIntegerField(default=0)
    license_document_url = models.URLField(blank=True)  # S3 link to uploaded license

    def __str__(self):
        return f"Dr. {self.user.get_full_name()} — {self.medical_license_number}"


class ShelterAdminProfile(models.Model):
    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name='shelter_profile'
    )
    shelter_name = models.CharField(max_length=255)
    shelter_registration_number = models.CharField(max_length=100, unique=True)
    shelter_address = models.TextField()
    shelter_contact_number = models.CharField(max_length=20)
    capacity = models.PositiveIntegerField(default=0)
    shelter_type = models.CharField(max_length=50, default='mixed')  # 'mixed' or 'specific'
    specific_animal = models.CharField(max_length=100, blank=True, null=True)
    registration_document_url = models.URLField(blank=True)

    def __str__(self):
        return f"{self.shelter_name} — {self.user.get_full_name()}"


class CivicAuthorityProfile(models.Model):
    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name='civic_profile'
    )
    department_name = models.CharField(max_length=255)
    employee_id = models.CharField(max_length=100, unique=True)
    jurisdiction_area = models.CharField(max_length=255)
    designation = models.CharField(max_length=150)
    official_contact = models.CharField(max_length=20)
    id_document_url = models.URLField(blank=True)

    def __str__(self):
        return f"{self.user.get_full_name()} — {self.department_name}"



class Notification(models.Model):
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=255)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Notification for {self.recipient.username}: {self.title}"
