from django.db import models
from apps.users.models import User

class Pet(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='pets')
    name = models.CharField(max_length=100)
    species = models.CharField(max_length=50) # Dog, Cat, etc.
    breed = models.CharField(max_length=100, blank=True, null=True)
    health_status = models.CharField(max_length=100, default='Healthy')
    gender = models.CharField(max_length=50, blank=True, null=True)
    dob = models.DateField(blank=True, null=True)
    rfid_tag = models.CharField(max_length=100, unique=True, blank=True, null=True)
    media_url = models.TextField(blank=True, null=True) # Allows Base64 string fallback
    
    def __str__(self):
        return f"{self.name} ({self.species})"

class SOSAlert(models.Model):
    reporter = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sos_alerts')
    animal_description = models.TextField()
    location = models.CharField(max_length=255) # Replaced PointField with CharField for local dev
    timestamp = models.DateTimeField(auto_now_add=True)
    is_resolved = models.BooleanField(default=False)
    
    def __str__(self):
        return f"SOS by {self.reporter.username} at {self.timestamp}"
