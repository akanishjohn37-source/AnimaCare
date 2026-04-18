from django.db import models
from apps.citizens.models import Pet
from django.conf import settings

import hashlib
from django.db import models
from apps.citizens.models import Pet
from django.conf import settings

class ConsultationLog(models.Model):
    pet = models.ForeignKey(Pet, on_delete=models.CASCADE, related_name='consultations')
    attending_vet = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='vet_consultations')
    date = models.DateTimeField(auto_now_add=True)
    vital_signs = models.JSONField(blank=True, null=True) # e.g. weight, temperature, heart rate
    consultation_notes = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"Consultation for {self.pet.name} on {self.date}"

class VaccinationLog(models.Model):
    consultation = models.ForeignKey(ConsultationLog, on_delete=models.CASCADE, related_name='vaccinations')
    vaccine_name = models.CharField(max_length=100)
    manufacturer = models.CharField(max_length=100)
    batch_number = models.CharField(max_length=50)
    date_administered = models.DateField(auto_now_add=True)
    next_due_date = models.DateField(blank=True, null=True)
    
    is_frozen = models.BooleanField(default=False)
    record_hash = models.CharField(max_length=64, blank=True, null=True)
    is_amended = models.BooleanField(default=False)
    original_record = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='amendments')

    def save(self, *args, **kwargs):
        if self.is_frozen and not self.pk:
            # Generate hash before saving if it's considered frozen
            data_string = f"{self.vaccine_name}-{self.batch_number}-{self.date_administered}"
            self.record_hash = hashlib.sha256(data_string.encode('utf-8')).hexdigest()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.vaccine_name} for {self.consultation.pet.name}"

class DigitalPrescription(models.Model):
    consultation = models.ForeignKey(ConsultationLog, on_delete=models.CASCADE, related_name='prescriptions')
    medications = models.JSONField() # Text array of medications and dosages
    issued_date = models.DateTimeField(auto_now_add=True)

    is_frozen = models.BooleanField(default=False)
    record_hash = models.CharField(max_length=64, blank=True, null=True)

    def save(self, *args, **kwargs):
        if self.is_frozen and not self.pk:
            data_string = str(self.medications) + str(self.issued_date)
            self.record_hash = hashlib.sha256(data_string.encode('utf-8')).hexdigest()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Prescription for {self.consultation.pet.name}"

class DiagnosticMedia(models.Model):
    consultation = models.ForeignKey(ConsultationLog, on_delete=models.CASCADE, related_name='media', null=True, blank=True)
    media_url = models.URLField(max_length=500) # Lightweight AWS S3 URL
    media_type = models.CharField(max_length=50) # image/jpeg, application/pdf
    diagnostic_tags = models.JSONField(blank=True, null=True) # e.g. ["Thoracic X-ray"]
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        pet_name = self.consultation.pet.name if self.consultation else "Unknown"
        return f"Media for {pet_name}"
