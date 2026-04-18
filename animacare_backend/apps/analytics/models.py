from django.db import models
from django.conf import settings
import uuid

# Dummy models to simulate the existence of Modules 1, 2, and 3
class AnimalInventory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    breed = models.CharField(max_length=100)
    energy_level = models.IntegerField(default=5) # 1-10
    sociability = models.CharField(max_length=50, choices=[('Low', 'Low'), ('Moderate', 'Moderate'), ('High', 'High')])
    required_maintenance = models.CharField(max_length=50, choices=[('Low', 'Low'), ('Moderate', 'Moderate'), ('High', 'High')])
    good_for_apartments = models.BooleanField(default=False)
    good_with_children = models.BooleanField(default=False)
    good_with_other_pets = models.BooleanField(default=False)
    image_url = models.URLField(blank=True, null=True)

    def __str__(self):
        return f"{self.name} ({self.breed})"

class Pet(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True)
    name = models.CharField(max_length=100)
    breed = models.CharField(max_length=100)
    age_months = models.IntegerField()
    current_weight_kg = models.FloatField()

    def __str__(self):
        return self.name

class MedicalRecord(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    pet = models.ForeignKey(Pet, on_delete=models.CASCADE, related_name='medical_records')
    date = models.DateField(auto_now_add=True)
    weight_kg = models.FloatField()
    notes = models.TextField(blank=True)

# Module 4 Specific Models
class LifestyleAssessment(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='lifestyle_assessment')
    housing_type = models.CharField(max_length=100, choices=[('Apartment', 'Apartment'), ('House with Yard', 'House with Yard')])
    activity_level = models.IntegerField(default=5) # 1-10
    has_children = models.BooleanField(default=False)
    has_other_pets = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

class AICompatibilityScore(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    animal = models.ForeignKey(AnimalInventory, on_delete=models.CASCADE)
    score_percentage = models.FloatField()
    match_reasons = models.JSONField() # E.g., ["High Energy Match", "Good for Apartments"]
    calculated_at = models.DateTimeField(auto_now_add=True)

class HealthRiskFlag(models.Model):
    pet = models.ForeignKey(Pet, on_delete=models.CASCADE)
    risk_type = models.CharField(max_length=100) # e.g., 'Overweight', 'Underweight'
    severity = models.CharField(max_length=50, choices=[('Low', 'Low'), ('Medium', 'Medium'), ('High', 'High')])
    description = models.TextField()
    is_active = models.BooleanField(default=True)
    flagged_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.pet.name} - {self.risk_type}"
