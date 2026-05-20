import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.users.models import User
from apps.citizens.models import Pet
from rest_framework_simplejwt.tokens import RefreshToken
import requests

vet = User.objects.filter(role='veterinarian').first()
pet = Pet.objects.first()

refresh = RefreshToken.for_user(vet)
token = str(refresh.access_token)

response = requests.post('http://127.0.0.1:8000/api/clinical/consultations/', json={
    'pet': pet.id,
    'vital_signs': {'weight': '12', 'temp': '38', 'heartRate': ''},
    'consultation_notes': 'test',
    'zoonotic_disease_flag': None,
}, headers={'Authorization': f'Bearer {token}'})

print("Status:", response.status_code)
print("Response:", response.text)
