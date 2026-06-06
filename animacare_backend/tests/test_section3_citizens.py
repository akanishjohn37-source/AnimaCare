"""
=============================================================================
SECTION 3: Citizens Module Tests (Pets, Livestock, SOS Alerts)
=============================================================================
Tests for: Pet CRUD, Livestock CRUD, SOS alert creation/lifecycle
Run after: Section 1+2 (Auth & Admin must work)
=============================================================================
"""
from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from apps.users.views import generate_tokens
from apps.shelter.models import Shelter

User = get_user_model()


@override_settings(
    EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
    CHANNEL_LAYERS={'default': {'BACKEND': 'channels.layers.InMemoryChannelLayer'}}
)
class Section3_CitizensTests(TestCase):
    """Test Suite: Pet registration, Livestock, and SOS Alerts."""

    def setUp(self):
        """Create citizen, vet, and shelter admin with auth tokens."""
        self.client = APIClient()

        # Active citizen
        self.citizen = User.objects.create_user(
            username='petowner', email='petowner@test.com',
            password='OwnerPass123!', role='citizen', account_status='active',
        )
        self.citizen_token = generate_tokens(self.citizen)['access']

        # Second citizen (to test isolation)
        self.citizen2 = User.objects.create_user(
            username='petowner2', email='petowner2@test.com',
            password='OwnerPass123!', role='citizen', account_status='active',
        )
        self.citizen2_token = generate_tokens(self.citizen2)['access']

        # Veterinarian
        self.vet = User.objects.create_user(
            username='drvet', email='drvet@test.com',
            password='VetPass123!', role='veterinarian', account_status='active',
        )
        self.vet_token = generate_tokens(self.vet)['access']

        # Shelter admin + shelter
        self.shelter_admin = User.objects.create_user(
            username='shelteradmin', email='shelter@test.com',
            password='ShelterPass123!', role='shelter_admin', account_status='active',
        )
        self.shelter = Shelter.objects.create(
            name='Test Shelter', tax_id='TAX001',
            address='123 Shelter St', location='10.0,76.0',
            admin=self.shelter_admin, is_verified=True,
        )
        self.shelter_token = generate_tokens(self.shelter_admin)['access']

    # ── Pet CRUD ─────────────────────────────────────────────────────────

    def test_01_citizen_create_pet(self):
        """Citizen can register a new pet."""
        response = self.client.post('/api/citizens/pets/', {
            'name': 'Buddy',
            'species': 'Dog',
            'breed': 'Golden Retriever',
            'gender': 'Male',
            'health_status': 'Healthy',
        }, format='json', HTTP_AUTHORIZATION=f'Bearer {self.citizen_token}')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()
        self.assertEqual(data['name'], 'Buddy')
        self.assertEqual(data['owner'], self.citizen.id)

    def test_02_citizen_list_own_pets(self):
        """Citizen should only see their own pets."""
        # Create pet for citizen1
        self.client.post('/api/citizens/pets/', {
            'name': 'Buddy', 'species': 'Dog', 'breed': 'Lab',
        }, format='json', HTTP_AUTHORIZATION=f'Bearer {self.citizen_token}')
        # Create pet for citizen2
        self.client.post('/api/citizens/pets/', {
            'name': 'Whiskers', 'species': 'Cat', 'breed': 'Persian',
        }, format='json', HTTP_AUTHORIZATION=f'Bearer {self.citizen2_token}')

        # Citizen1 should only see Buddy
        response = self.client.get('/api/citizens/pets/',
                                   HTTP_AUTHORIZATION=f'Bearer {self.citizen_token}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.json()['results']
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['name'], 'Buddy')

    def test_03_vet_can_see_all_pets(self):
        """Vets should see all pets across all owners."""
        self.client.post('/api/citizens/pets/', {
            'name': 'Buddy', 'species': 'Dog',
        }, format='json', HTTP_AUTHORIZATION=f'Bearer {self.citizen_token}')
        self.client.post('/api/citizens/pets/', {
            'name': 'Whiskers', 'species': 'Cat',
        }, format='json', HTTP_AUTHORIZATION=f'Bearer {self.citizen2_token}')

        response = self.client.get('/api/citizens/pets/',
                                   HTTP_AUTHORIZATION=f'Bearer {self.vet_token}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.json()['results']
        self.assertEqual(len(results), 2)

    def test_04_citizen_update_pet(self):
        """Citizen can update their pet's info."""
        create_resp = self.client.post('/api/citizens/pets/', {
            'name': 'Buddy', 'species': 'Dog', 'breed': 'Lab',
        }, format='json', HTTP_AUTHORIZATION=f'Bearer {self.citizen_token}')
        pet_id = create_resp.json()['id']

        response = self.client.patch(f'/api/citizens/pets/{pet_id}/', {
            'breed': 'Labrador',
        }, format='json', HTTP_AUTHORIZATION=f'Bearer {self.citizen_token}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()['breed'], 'Labrador')

    def test_05_citizen_delete_pet(self):
        """Citizen can delete their pet record."""
        create_resp = self.client.post('/api/citizens/pets/', {
            'name': 'Buddy', 'species': 'Dog',
        }, format='json', HTTP_AUTHORIZATION=f'Bearer {self.citizen_token}')
        pet_id = create_resp.json()['id']

        response = self.client.delete(f'/api/citizens/pets/{pet_id}/',
                                      HTTP_AUTHORIZATION=f'Bearer {self.citizen_token}')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_06_pet_search_by_name(self):
        """Pet search should filter by name."""
        self.client.post('/api/citizens/pets/', {
            'name': 'Buddy', 'species': 'Dog',
        }, format='json', HTTP_AUTHORIZATION=f'Bearer {self.citizen_token}')
        self.client.post('/api/citizens/pets/', {
            'name': 'Max', 'species': 'Dog',
        }, format='json', HTTP_AUTHORIZATION=f'Bearer {self.citizen_token}')

        response = self.client.get('/api/citizens/pets/?search=Buddy',
                                   HTTP_AUTHORIZATION=f'Bearer {self.citizen_token}')
        results = response.json()['results']
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['name'], 'Buddy')

    # ── Livestock CRUD ───────────────────────────────────────────────────

    def test_07_citizen_create_livestock(self):
        """Citizen can register livestock."""
        response = self.client.post('/api/citizens/livestocks/', {
            'name': 'Daisy',
            'species': 'Cow',
            'livestock_type': 'Cattle',
            'farm_location': 'Green Valley Farm',
        }, format='json', HTTP_AUTHORIZATION=f'Bearer {self.citizen_token}')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.json()['livestock_type'], 'Cattle')
        self.assertEqual(response.json()['farm_location'], 'Green Valley Farm')

    def test_08_citizen_list_own_livestock(self):
        """Citizen sees only their own livestock."""
        self.client.post('/api/citizens/livestocks/', {
            'name': 'Daisy', 'species': 'Cow', 'livestock_type': 'Cattle',
            'farm_location': 'Farm A',
        }, format='json', HTTP_AUTHORIZATION=f'Bearer {self.citizen_token}')

        response = self.client.get('/api/citizens/livestocks/',
                                   HTTP_AUTHORIZATION=f'Bearer {self.citizen2_token}')
        results = response.json()['results']
        self.assertEqual(len(results), 0)  # citizen2 has none

    # ── SOS Alerts ───────────────────────────────────────────────────────

    def test_09_citizen_create_sos_alert(self):
        """Citizen can create an SOS alert with coordinates."""
        response = self.client.post('/api/citizens/sos/', {
            'reporter': self.citizen.id,
            'animal_description': 'Injured dog near highway',
            'lat': '10.8505',
            'lng': '76.2711',
            'alert_type': 'rescue',
        }, format='json', HTTP_AUTHORIZATION=f'Bearer {self.citizen_token}')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_10_sos_alert_missing_coordinates_fails(self):
        """SOS without coordinates should fail."""
        response = self.client.post('/api/citizens/sos/', {
            'reporter': self.citizen.id,
            'animal_description': 'Lost cat',
        }, format='json', HTTP_AUTHORIZATION=f'Bearer {self.citizen_token}')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_11_shelter_accept_sos_mission(self):
        """Shelter admin can accept an SOS mission."""
        from apps.citizens.models import SOSAlert
        sos = SOSAlert.objects.create(
            reporter=self.citizen,
            animal_description='Injured dog',
            location='10.85,76.27',
            alert_type='rescue',
        )
        response = self.client.post(
            f'/api/citizens/sos/{sos.id}/accept_mission/',
            format='json',
            HTTP_AUTHORIZATION=f'Bearer {self.shelter_token}'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        sos.refresh_from_db()
        self.assertEqual(sos.status, 'Accepted')
        self.assertEqual(sos.assigned_shelter, self.shelter)

    def test_12_shelter_complete_sos_mission(self):
        """Assigned shelter can complete an SOS mission."""
        from apps.citizens.models import SOSAlert
        sos = SOSAlert.objects.create(
            reporter=self.citizen,
            animal_description='Injured dog',
            location='10.85,76.27',
            status='Accepted',
            assigned_shelter=self.shelter,
        )
        response = self.client.post(
            f'/api/citizens/sos/{sos.id}/complete_mission/',
            format='json',
            HTTP_AUTHORIZATION=f'Bearer {self.shelter_token}'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        sos.refresh_from_db()
        self.assertEqual(sos.status, 'Resolved')
        self.assertTrue(sos.is_resolved)

    def test_13_shelter_cancel_sos_mission(self):
        """Assigned shelter can cancel/release a mission."""
        from apps.citizens.models import SOSAlert
        sos = SOSAlert.objects.create(
            reporter=self.citizen,
            animal_description='Stray cat',
            location='10.85,76.27',
            status='Accepted',
            assigned_shelter=self.shelter,
        )
        response = self.client.post(
            f'/api/citizens/sos/{sos.id}/cancel_mission/',
            format='json',
            HTTP_AUTHORIZATION=f'Bearer {self.shelter_token}'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        sos.refresh_from_db()
        self.assertEqual(sos.status, 'Pending')
        self.assertIsNone(sos.assigned_shelter)

    def test_14_nearby_sos_alerts(self):
        """Nearby endpoint should return unresolved rescue alerts."""
        from apps.citizens.models import SOSAlert
        SOSAlert.objects.create(
            reporter=self.citizen, animal_description='Dog 1',
            location='10.85,76.27', alert_type='rescue',
        )
        SOSAlert.objects.create(
            reporter=self.citizen, animal_description='Dog 2',
            location='10.86,76.28', alert_type='rescue', is_resolved=True,
        )
        response = self.client.get('/api/citizens/sos/nearby/',
                                   HTTP_AUTHORIZATION=f'Bearer {self.shelter_token}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Only 1 unresolved
        self.assertEqual(len(response.json()), 1)
