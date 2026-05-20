import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'animacare_backend.settings')
django.setup()

from django.test import Client
from apps.users.models import User
from apps.citizens.models import Pet
from apps.clinical.models import Appointment

vet = User.objects.filter(role='veterinarian').first()
pet = Pet.objects.first()

client = Client()
client.force_login(vet)

response = client.post('/api/clinical/consultations/', {
    'pet': pet.id,
    'vital_signs': {'weight': '12', 'temp': '38', 'heartRate': ''},
    'consultation_notes': 'test',
    'zoonotic_disease_flag': None,
}, content_type='application/json')

print("Status:", response.status_code)
print("Response:", response.json())
