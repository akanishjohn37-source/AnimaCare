from django.db import models
from apps.users.models import User

class Shelter(models.Model):
    name = models.CharField(max_length=255)
    tax_id = models.CharField(max_length=50, unique=True)
    address = models.TextField()
    location = models.CharField(max_length=255) # Replaced PointField with CharField for local dev without GDAL
    admin = models.OneToOneField(User, on_delete=models.CASCADE, related_name='authorized_shelter', limit_choices_to={'role': 'shelter_admin'})
    is_verified = models.BooleanField(default=False)
    
    def __str__(self):
        return self.name

class AnimalInventory(models.Model):
    shelter = models.ForeignKey(Shelter, on_delete=models.CASCADE, related_name='animals')
    name = models.CharField(max_length=100)
    species = models.CharField(max_length=50) # Dog, Cat, etc.
    breed = models.CharField(max_length=100, blank=True, null=True)
    behavioral_traits = models.TextField(blank=True)
    medical_triage_status = models.CharField(max_length=50) # e.g., Healthy, Needs Surgery, Quarantine
    intake_date = models.DateField(auto_now_add=True)
    found_location = models.CharField(max_length=255, blank=True)
    kennel_zone_id = models.CharField(max_length=50)
    is_adopted = models.BooleanField(default=False)
    is_available = models.BooleanField(default=True)
    is_suspended = models.BooleanField(default=False) # For Super-Admin Moderation
    media_url = models.URLField(blank=True, null=True) # S3 URL
    
    def __str__(self):
        return f"{self.name} ({self.species})"

class AdoptionApplication(models.Model):
    STATUS_CHOICES = (
        ('Pending', 'Pending'),
        ('Under Review', 'Under Review'),
        ('Interview Scheduled', 'Interview Scheduled'),
        ('Approved', 'Approved'),
        ('Rejected', 'Rejected'),
    )
    applicant = models.ForeignKey(User, on_delete=models.CASCADE, related_name='adoption_applications', limit_choices_to={'role': 'citizen'})
    animal = models.ForeignKey(AnimalInventory, on_delete=models.CASCADE, related_name='applications')
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='Pending')
    timestamp = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Application by {self.applicant.username} for {self.animal.name}"
