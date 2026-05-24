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

class Livestock(Pet):
    livestock_type = models.CharField(max_length=100) # e.g. Poultry, Cattle, Sheep
    herd_size = models.PositiveIntegerField(default=1)
    farm_location = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"Livestock: {self.name} ({self.livestock_type}) - Herd size: {self.herd_size}"

class SOSAlert(models.Model):
    STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('Accepted', 'Accepted'),
        ('Resolved', 'Resolved'),
    ]
    
    ALERT_TYPE_CHOICES = [
        ('rescue', 'Rescue Needed'),
        ('disease_report', 'Disease Sighted'),
    ]
    
    reporter = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sos_alerts')
    alert_type = models.CharField(max_length=20, choices=ALERT_TYPE_CHOICES, default='rescue')
    animal_description = models.TextField()
    location = models.CharField(max_length=255) 
    timestamp = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')
    assigned_shelter = models.ForeignKey('shelter.Shelter', on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_missions')
    is_resolved = models.BooleanField(default=False)
    
    def __str__(self):
        return f"SOS by {self.reporter.username} ({self.status}) at {self.timestamp}"
