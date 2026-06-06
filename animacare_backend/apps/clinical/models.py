from django.db import models
from apps.citizens.models import Pet, Livestock
from django.conf import settings
import hashlib

class ConsultationLog(models.Model):
    pet = models.ForeignKey(Pet, on_delete=models.CASCADE, related_name='consultations', null=True, blank=True)
    livestock = models.ForeignKey(Livestock, on_delete=models.CASCADE, related_name='consultations', null=True, blank=True)
    attending_vet = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='vet_consultations')
    date = models.DateTimeField(auto_now_add=True)
    vital_signs = models.JSONField(blank=True, null=True) # e.g. weight, temperature, heart rate
    consultation_notes = models.TextField(blank=True, null=True)
    zoonotic_disease_flag = models.CharField(max_length=100, blank=True, null=True, help_text="Flags this record for Civic Authority Heatmaps")
    health_status = models.CharField(max_length=100, blank=True, null=True, help_text="Updates the pet/livestock's health status")

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.health_status:
            if self.pet:
                self.pet.health_status = self.health_status
                self.pet.save(update_fields=['health_status'])
            elif self.livestock:
                self.livestock.health_status = self.health_status
                self.livestock.save(update_fields=['health_status'])

    def __str__(self):
        name = self.pet.name if self.pet else (self.livestock.name if self.livestock else "Unknown")
        return f"Consultation for {name} on {self.date}"

class VaccinationLog(models.Model):
    consultation = models.ForeignKey(ConsultationLog, on_delete=models.CASCADE, related_name='vaccinations')
    injection_name = models.CharField(max_length=100)
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
            data_string = f"{self.injection_name}-{self.batch_number}-{self.date_administered}"
            self.record_hash = hashlib.sha256(data_string.encode('utf-8')).hexdigest()
        super().save(*args, **kwargs)

    def __str__(self):
        name = self.consultation.pet.name if self.consultation.pet else (self.consultation.livestock.name if self.consultation.livestock else "Unknown")
        return f"{self.injection_name} for {name}"

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
        name = self.consultation.pet.name if self.consultation.pet else (self.consultation.livestock.name if self.consultation.livestock else "Unknown")
        return f"Prescription for {name}"

class DiagnosticMedia(models.Model):
    consultation = models.ForeignKey(ConsultationLog, on_delete=models.CASCADE, related_name='media', null=True, blank=True)
    media_url = models.TextField() # Supports direct URLs or Base64 Data URLs for prototype
    media_type = models.CharField(max_length=50) # image/jpeg, application/pdf
    diagnostic_tags = models.JSONField(blank=True, null=True) # e.g. ["Thoracic X-ray"]
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        pet_name = "Unknown"
        if self.consultation:
            if self.consultation.pet:
                pet_name = self.consultation.pet.name
            elif self.consultation.livestock:
                pet_name = self.consultation.livestock.name
        return f"Media for {pet_name}"

class AppointmentSlot(models.Model):
    vet = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='slots', limit_choices_to={'role': 'veterinarian'})
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    max_appointments = models.PositiveIntegerField(default=5)
    booked_count = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"Dr. {self.vet.username} - {self.date} ({self.start_time} - {self.end_time})"

class VetScheduleDay(models.Model):
    vet = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='schedule_days', limit_choices_to={'role': 'veterinarian'})
    date = models.DateField()
    status = models.CharField(max_length=10, choices=[('present', 'Present'), ('absent', 'Absent')], default='present')

    class Meta:
        unique_together = ('vet', 'date')

    def __str__(self):
        return f"Dr. {self.vet.username} - {self.date} is {self.status}"

class Appointment(models.Model):
    STATUS_CHOICES = (
        ('Scheduled', 'Scheduled'),
        ('Completed', 'Completed'),
        ('Cancelled', 'Cancelled'),
    )
    pet = models.ForeignKey(Pet, on_delete=models.CASCADE, related_name='appointments', null=True, blank=True)
    livestock = models.ForeignKey(Livestock, on_delete=models.CASCADE, related_name='appointments', null=True, blank=True)
    vet = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='vet_appointments', limit_choices_to={'role': 'veterinarian'})
    slot = models.ForeignKey(AppointmentSlot, on_delete=models.SET_NULL, null=True, blank=True, related_name='appointments')
    date = models.DateTimeField()
    reason = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Scheduled')
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def owner(self):
        """Derive owner from pet or livestock FK."""
        if self.pet:
            return self.pet.owner
        elif self.livestock:
            return self.livestock.owner
        return None

    def __str__(self):
        name = self.pet.name if self.pet else (self.livestock.name if self.livestock else "Unknown")
        return f"Appointment: {name} with Dr. {self.vet.username} on {self.date}"

class SelfReportedRecord(models.Model):
    pet = models.ForeignKey(Pet, on_delete=models.CASCADE, related_name='self_reports', null=True, blank=True)
    livestock = models.ForeignKey(Livestock, on_delete=models.CASCADE, related_name='self_reports', null=True, blank=True)
    title = models.CharField(max_length=255)
    date = models.DateField()
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        name = self.pet.name if self.pet else (self.livestock.name if self.livestock else "Unknown")
        return f"Self-Report: {self.title} for {name}"

class VaccinationSchedule(models.Model):
    TRACK_CHOICES = (
        ('puppy', 'Puppy Track'),
        ('kitten', 'Kitten Track'),
        ('cattle', 'Cattle Track'),
        ('small_ruminant', 'Small Ruminant Track'),
        ('poultry', 'Poultry Track'),
        ('equine', 'Equine Track'),
        ('custom', 'Custom Track'),
    )
    pet = models.ForeignKey(Pet, on_delete=models.CASCADE, related_name='vaccination_schedules', null=True, blank=True)
    livestock = models.ForeignKey(Livestock, on_delete=models.CASCADE, related_name='vaccination_schedules', null=True, blank=True)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='vaccination_schedules')
    animal_name = models.CharField(max_length=100)
    animal_type = models.CharField(max_length=50)
    gender = models.CharField(max_length=20, blank=True, null=True)
    date_of_birth = models.DateField()
    track = models.CharField(max_length=20, choices=TRACK_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Schedule for {self.animal_name} ({self.track})"

class VaccinationScheduleItem(models.Model):
    ITEM_TYPE_CHOICES = (
        ('injection', 'Injection'),
        ('deworming', 'Deworming'),
        ('annual', 'Annual Booster'),
        ('seasonal', 'Seasonal Alert'),
    )
    schedule = models.ForeignKey(VaccinationSchedule, on_delete=models.CASCADE, related_name='items')
    item_type = models.CharField(max_length=20, choices=ITEM_TYPE_CHOICES, default='injection')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    scheduled_date = models.DateField()
    is_completed = models.BooleanField(default=False)
    notification_sent = models.BooleanField(default=False)

    class Meta:
        ordering = ['scheduled_date']

    def __str__(self):
        return f"{self.title} on {self.scheduled_date}"
