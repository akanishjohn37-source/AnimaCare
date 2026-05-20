import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.users.models import User
from apps.citizens.models import Pet
from rest_framework.authtoken.models import Token
import requests

vet = User.objects.filter(role='veterinarian').first()
pet = Pet.objects.first()

token, _ = Token.objects.get_or_create(user=vet)
token_key = token.key

response = requests.post('http://127.0.0.1:8000/api/clinical/consultations/', json={
    'pet': pet.id,
    'vital_signs': {'weight': '12', 'temp': '38', 'heartRate': ''},
    'consultation_notes': 'test',
    'zoonotic_disease_flag': None,
}, headers={'Authorization': f'Bearer {token_key}'})

print("Status:", response.status_code)
print("Response:", response.text)
