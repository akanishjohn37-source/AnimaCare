"""
=============================================================================
SECTION 4: Shelter Management Tests (Inventory, Adoption)
=============================================================================
Tests for: Shelter CRUD, Animal Inventory, Adoption applications lifecycle
Run after: Section 1+2+3
=============================================================================
"""
from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from apps.users.views import generate_tokens
from apps.shelter.models import Shelter, AnimalInventory, AdoptionApplication

User = get_user_model()


@override_settings(
    EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
    CELERY_TASK_ALWAYS_EAGER=True,
    CELERY_TASK_EAGER_PROPAGATES=True,
)
class Section4_ShelterTests(TestCase):
    """Test Suite: Shelter inventory, adoption application workflows."""

    def setUp(self):
        """Create shelter admin, citizen, and initial shelter data."""
        self.client = APIClient()

        # Shelter admin
        self.shelter_admin = User.objects.create_user(
            username='shelteradmin', email='shelter@test.com',
            password='ShelterPass123!', role='shelter_admin', account_status='active',
        )
        self.shelter = Shelter.objects.create(
            name='Safe Paws Shelter', tax_id='TAX-SHELTER-001',
            address='456 Shelter Blvd', location='10.0,76.0',
            admin=self.shelter_admin, is_verified=True,
        )
        self.shelter_token = generate_tokens(self.shelter_admin)['access']

        # Citizen applicant
        self.citizen = User.objects.create_user(
            username='adopter', email='adopter@test.com',
            password='AdoptPass123!', role='citizen', account_status='active',
        )
        self.citizen_token = generate_tokens(self.citizen)['access']

        # Second citizen
        self.citizen2 = User.objects.create_user(
            username='adopter2', email='adopter2@test.com',
            password='AdoptPass123!', role='citizen', account_status='active',
        )
        self.citizen2_token = generate_tokens(self.citizen2)['access']

        # Pre-create an animal in inventory
        self.animal = AnimalInventory.objects.create(
            shelter=self.shelter, name='Charlie', species='Dog',
            breed='Beagle', age='2 years',
            behavioral_traits='Friendly and playful',
            medical_triage_status='Healthy', kennel_zone_id='A-01',
        )

    # ── Shelter CRUD ─────────────────────────────────────────────────────

    def test_01_list_shelters(self):
        """Anyone can list shelters."""
        response = self.client.get('/api/shelter/shelters/',
                                   HTTP_AUTHORIZATION=f'Bearer {self.citizen_token}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.json()['results']
        self.assertGreaterEqual(len(results), 1)

    def test_02_shelter_detail(self):
        """Can retrieve a specific shelter."""
        response = self.client.get(f'/api/shelter/shelters/{self.shelter.id}/',
                                   HTTP_AUTHORIZATION=f'Bearer {self.citizen_token}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()['name'], 'Safe Paws Shelter')

    # ── Animal Inventory ─────────────────────────────────────────────────

    def test_03_shelter_admin_add_animal(self):
        """Shelter admin can add animals to their inventory."""
        response = self.client.post('/api/shelter/inventory/', {
            'name': 'Luna',
            'species': 'Cat',
            'breed': 'Siamese',
            'age': '1 year',
            'behavioral_traits': 'Calm and affectionate',
            'medical_triage_status': 'Healthy',
            'kennel_zone_id': 'B-02',
        }, format='json', HTTP_AUTHORIZATION=f'Bearer {self.shelter_token}')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.json()['name'], 'Luna')
        self.assertEqual(response.json()['shelter'], self.shelter.id)

    def test_04_shelter_admin_sees_own_inventory(self):
        """Shelter admin sees only their shelter's animals."""
        response = self.client.get('/api/shelter/inventory/',
                                   HTTP_AUTHORIZATION=f'Bearer {self.shelter_token}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.json()['results']
        for animal in results:
            self.assertEqual(animal['shelter'], self.shelter.id)

    def test_05_citizen_view_available_animals(self):
        """Citizens can view available animals (citizen_view=true)."""
        response = self.client.get('/api/shelter/inventory/?citizen_view=true',
                                   HTTP_AUTHORIZATION=f'Bearer {self.citizen_token}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.json()['results']
        for animal in results:
            self.assertTrue(animal['is_available'])
            self.assertFalse(animal['is_adopted'])

    def test_06_update_animal_inventory(self):
        """Shelter admin can update animal details."""
        response = self.client.patch(f'/api/shelter/inventory/{self.animal.id}/', {
            'medical_triage_status': 'Needs Surgery',
        }, format='json', HTTP_AUTHORIZATION=f'Bearer {self.shelter_token}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()['medical_triage_status'], 'Needs Surgery')

    # ── Adoption Applications ────────────────────────────────────────────

    def test_07_citizen_submit_adoption_application(self):
        """Citizen can submit an adoption application."""
        response = self.client.post('/api/shelter/applications/', {
            'animal': self.animal.id,
        }, format='json', HTTP_AUTHORIZATION=f'Bearer {self.citizen_token}')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()
        self.assertEqual(data['status'], 'Pending')
        self.assertEqual(data['applicant'], self.citizen.id)

    def test_08_shelter_admin_sees_applications(self):
        """Shelter admin sees applications for their animals."""
        AdoptionApplication.objects.create(
            applicant=self.citizen, animal=self.animal,
        )
        response = self.client.get('/api/shelter/applications/',
                                   HTTP_AUTHORIZATION=f'Bearer {self.shelter_token}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.json()['results']
        self.assertGreaterEqual(len(results), 1)

    def test_09_citizen_sees_own_applications(self):
        """Citizens see only their own applications."""
        AdoptionApplication.objects.create(
            applicant=self.citizen, animal=self.animal,
        )
        response = self.client.get('/api/shelter/applications/',
                                   HTTP_AUTHORIZATION=f'Bearer {self.citizen2_token}')
        results = response.json()['results']
        self.assertEqual(len(results), 0)  # citizen2 has none

    def test_10_shelter_admin_approve_adoption(self):
        """Approving adoption marks animal as adopted and creates pet record."""
        app = AdoptionApplication.objects.create(
            applicant=self.citizen, animal=self.animal,
        )
        response = self.client.post(
            f'/api/shelter/applications/{app.id}/update_status/', {
                'status': 'Approved',
                'feedback': 'Great match!'
            }, format='json', HTTP_AUTHORIZATION=f'Bearer {self.shelter_token}'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Animal should be marked adopted
        self.animal.refresh_from_db()
        self.assertTrue(self.animal.is_adopted)
        self.assertFalse(self.animal.is_available)
        # Pet record should be created for citizen
        from apps.citizens.models import Pet
        pet = Pet.objects.filter(owner=self.citizen, name='Charlie')
        self.assertTrue(pet.exists())

    def test_11_shelter_admin_reject_adoption(self):
        """Rejection should update status and send notification."""
        app = AdoptionApplication.objects.create(
            applicant=self.citizen, animal=self.animal,
        )
        response = self.client.post(
            f'/api/shelter/applications/{app.id}/update_status/', {
                'status': 'Rejected',
                'feedback': 'Insufficient experience with dogs'
            }, format='json', HTTP_AUTHORIZATION=f'Bearer {self.shelter_token}'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        app.refresh_from_db()
        self.assertEqual(app.status, 'Rejected')
        # Notification should exist for the applicant
        from apps.users.models import Notification
        notifications = Notification.objects.filter(recipient=self.citizen)
        self.assertTrue(notifications.exists())

    def test_12_shelter_admin_schedule_interview(self):
        """Shelter can schedule an interview for an application."""
        app = AdoptionApplication.objects.create(
            applicant=self.citizen, animal=self.animal,
        )
        response = self.client.post(
            f'/api/shelter/applications/{app.id}/update_status/', {
                'status': 'Interview Scheduled',
                'feedback': 'Please visit us on Monday 10 AM'
            }, format='json', HTTP_AUTHORIZATION=f'Bearer {self.shelter_token}'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        app.refresh_from_db()
        self.assertEqual(app.status, 'Interview Scheduled')

    def test_13_citizen_cancel_own_application(self):
        """Citizens can cancel their own application."""
        app = AdoptionApplication.objects.create(
            applicant=self.citizen, animal=self.animal,
        )
        response = self.client.post(
            f'/api/shelter/applications/{app.id}/cancel/',
            format='json', HTTP_AUTHORIZATION=f'Bearer {self.citizen_token}'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        app.refresh_from_db()
        self.assertEqual(app.status, 'Cancelled')

    def test_14_citizen_cannot_cancel_others_application(self):
        """Citizens cannot cancel another citizen's application (filtered by queryset)."""
        app = AdoptionApplication.objects.create(
            applicant=self.citizen, animal=self.animal,
        )
        response = self.client.post(
            f'/api/shelter/applications/{app.id}/cancel/',
            format='json', HTTP_AUTHORIZATION=f'Bearer {self.citizen2_token}'
        )
        # citizen2's queryset doesn't include citizen1's applications → 404
        self.assertIn(response.status_code, [403, 404])

    def test_15_invalid_adoption_status_fails(self):
        """Invalid status update should return 400."""
        app = AdoptionApplication.objects.create(
            applicant=self.citizen, animal=self.animal,
        )
        response = self.client.post(
            f'/api/shelter/applications/{app.id}/update_status/', {
                'status': 'InvalidStatus',
            }, format='json', HTTP_AUTHORIZATION=f'Bearer {self.shelter_token}'
        )
        self.assertEqual(response.status_code, 400)

    def test_16_citizen_reply_interview_accept(self):
        """Citizen accepting scheduled interview confirms attendance, and shelter admin completes adoption."""
        app = AdoptionApplication.objects.create(
            applicant=self.citizen, animal=self.animal, status='Interview Scheduled'
        )
        response = self.client.post(
            f'/api/shelter/applications/{app.id}/reply_interview/', {
                'response': 'accept'
            }, format='json', HTTP_AUTHORIZATION=f'Bearer {self.citizen_token}'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        app.refresh_from_db()
        self.assertEqual(app.status, 'Interview Scheduled')
        self.assertTrue(app.applicant_confirmed)
        self.animal.refresh_from_db()
        self.assertFalse(self.animal.is_adopted)
        self.assertTrue(self.animal.is_available)

        # Now shelter admin completes the adoption
        response_approve = self.client.post(
            f'/api/shelter/applications/{app.id}/update_status/', {
                'status': 'Approved',
                'feedback': 'Interview went great! Adoption finalized.'
            }, format='json', HTTP_AUTHORIZATION=f'Bearer {self.shelter_token}'
        )
        self.assertEqual(response_approve.status_code, status.HTTP_200_OK)
        app.refresh_from_db()
        self.assertEqual(app.status, 'Approved')
        self.animal.refresh_from_db()
        self.assertTrue(self.animal.is_adopted)
        self.assertFalse(self.animal.is_available)
        from apps.citizens.models import Pet
        self.assertTrue(Pet.objects.filter(owner=self.citizen, name='Charlie').exists())

    def test_17_citizen_reply_interview_reject(self):
        """Citizen rejecting scheduled interview cancels application."""
        app = AdoptionApplication.objects.create(
            applicant=self.citizen, animal=self.animal, status='Interview Scheduled'
        )
        response = self.client.post(
            f'/api/shelter/applications/{app.id}/reply_interview/', {
                'response': 'reject'
            }, format='json', HTTP_AUTHORIZATION=f'Bearer {self.citizen_token}'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        app.refresh_from_db()
        self.assertEqual(app.status, 'Rejected')
        self.animal.refresh_from_db()
        self.assertFalse(self.animal.is_adopted)
