"""
=============================================================================
SECTION 5: Clinical Module Tests (Appointments, Consultations, Vaccination)
=============================================================================
Tests for: Appointments, Consultation logs, Self-reports, Vaccination scheduler
Run after: Section 1+2+3+4
=============================================================================
"""
from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from apps.users.views import generate_tokens
from apps.citizens.models import Pet
from apps.clinical.models import Appointment, ConsultationLog
from datetime import date, timedelta

User = get_user_model()


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class Section5_ClinicalTests(TestCase):
    """Test Suite: Veterinary appointments, consultations, vaccination schedules."""

    def setUp(self):
        """Set up citizen, vet, and pet for clinical operations."""
        self.client = APIClient()

        # Citizen with a pet
        self.citizen = User.objects.create_user(
            username='petowner', email='petowner@test.com',
            password='OwnerPass123!', role='citizen', account_status='active',
        )
        self.citizen_token = generate_tokens(self.citizen)['access']
        self.pet = Pet.objects.create(
            owner=self.citizen, name='Buddy', species='Dog',
            breed='Golden Retriever', gender='Male',
            dob=date.today() - timedelta(days=120),
        )

        # Veterinarian
        self.vet = User.objects.create_user(
            username='drvet', email='drvet@test.com',
            password='VetPass123!', role='veterinarian', account_status='active',
        )
        self.vet_token = generate_tokens(self.vet)['access']

        # Second citizen for isolation tests
        self.citizen2 = User.objects.create_user(
            username='other_citizen', email='other@test.com',
            password='OtherPass123!', role='citizen', account_status='active',
        )
        self.citizen2_token = generate_tokens(self.citizen2)['access']

    # ── Appointments ─────────────────────────────────────────────────────

    def test_01_citizen_book_appointment(self):
        """Citizen can book an appointment with a vet."""
        response = self.client.post('/api/clinical/appointments/', {
            'pet': self.pet.id,
            'vet': self.vet.id,
            'date': (date.today() + timedelta(days=3)).isoformat() + 'T10:00:00Z',
            'reason': 'Annual checkup',
        }, format='json', HTTP_AUTHORIZATION=f'Bearer {self.citizen_token}')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()
        self.assertEqual(data['status'], 'Scheduled')
        self.assertEqual(data['owner_name'], self.citizen.username)

    def test_02_vet_sees_own_appointments(self):
        """Vet should see appointments assigned to them."""
        Appointment.objects.create(
            pet=self.pet, vet=self.vet,
            date=(date.today() + timedelta(days=3)).isoformat() + 'T10:00:00Z',
            reason='Checkup',
        )
        response = self.client.get('/api/clinical/appointments/',
                                   HTTP_AUTHORIZATION=f'Bearer {self.vet_token}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.json()['results']
        self.assertGreaterEqual(len(results), 1)

    def test_03_citizen_sees_own_appointments(self):
        """Citizen should see appointments they've booked."""
        Appointment.objects.create(
            pet=self.pet, vet=self.vet,
            date=(date.today() + timedelta(days=3)).isoformat() + 'T10:00:00Z',
            reason='Checkup',
        )
        response = self.client.get('/api/clinical/appointments/',
                                   HTTP_AUTHORIZATION=f'Bearer {self.citizen_token}')
        results = response.json()['results']
        self.assertGreaterEqual(len(results), 1)

        # Citizen2 should see none
        response2 = self.client.get('/api/clinical/appointments/',
                                    HTTP_AUTHORIZATION=f'Bearer {self.citizen2_token}')
        results2 = response2.json()['results']
        self.assertEqual(len(results2), 0)

    def test_04_vet_complete_appointment(self):
        """Vet can mark an appointment as completed."""
        appt = Appointment.objects.create(
            pet=self.pet, vet=self.vet,
            date=(date.today() + timedelta(days=3)).isoformat() + 'T10:00:00Z',
            reason='Checkup',
        )
        response = self.client.post(
            f'/api/clinical/appointments/{appt.id}/complete/',
            format='json', HTTP_AUTHORIZATION=f'Bearer {self.vet_token}'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        appt.refresh_from_db()
        self.assertEqual(appt.status, 'Completed')

    def test_05_non_assigned_vet_cannot_complete(self):
        """Only the assigned vet can complete the appointment (queryset filtered)."""
        other_vet = User.objects.create_user(
            username='othervet', email='othervet@test.com',
            password='VetPass123!', role='veterinarian', account_status='active',
        )
        other_token = generate_tokens(other_vet)['access']

        appt = Appointment.objects.create(
            pet=self.pet, vet=self.vet,
            date=(date.today() + timedelta(days=3)).isoformat() + 'T10:00:00Z',
            reason='Checkup',
        )
        response = self.client.post(
            f'/api/clinical/appointments/{appt.id}/complete/',
            format='json', HTTP_AUTHORIZATION=f'Bearer {other_token}'
        )
        # Queryset filters by vet=user, so other_vet gets 404 (can't find it)
        self.assertIn(response.status_code, [403, 404])

    # ── Consultations ────────────────────────────────────────────────────

    def test_06_vet_create_consultation(self):
        """Vet can create a consultation log for a pet."""
        response = self.client.post('/api/clinical/consultations/', {
            'pet': self.pet.id,
            'vital_signs': {'weight': '12', 'temp': '38.5', 'heartRate': '80'},
            'consultation_notes': 'Pet is healthy. Annual checkup complete.',
        }, format='json', HTTP_AUTHORIZATION=f'Bearer {self.vet_token}')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()
        self.assertEqual(data['attending_vet'], self.vet.id)

    def test_07_consultation_creates_notification(self):
        """Creating a consultation should notify the pet owner."""
        self.client.post('/api/clinical/consultations/', {
            'pet': self.pet.id,
            'consultation_notes': 'Routine checkup',
        }, format='json', HTTP_AUTHORIZATION=f'Bearer {self.vet_token}')

        from apps.users.models import Notification
        notifs = Notification.objects.filter(recipient=self.citizen)
        self.assertTrue(notifs.exists())
        self.assertIn('consultation', notifs.first().message.lower())

    def test_08_consultation_with_zoonotic_flag_creates_sos(self):
        """Flagging a zoonotic disease should auto-create an SOS alert."""
        self.client.post('/api/clinical/consultations/', {
            'pet': self.pet.id,
            'consultation_notes': 'Suspected rabies case',
            'zoonotic_disease_flag': 'Rabies',
        }, format='json', HTTP_AUTHORIZATION=f'Bearer {self.vet_token}')

        from apps.citizens.models import SOSAlert
        sos = SOSAlert.objects.filter(alert_type='disease_report')
        self.assertTrue(sos.exists())
        self.assertIn('Rabies', sos.first().animal_description)

    # ── Self-Reported Records ────────────────────────────────────────────

    def test_09_citizen_create_self_report(self):
        """Citizen can create a self-reported record for their pet."""
        response = self.client.post('/api/clinical/self-reports/', {
            'pet': self.pet.id,
            'title': 'Noticed limping',
            'date': date.today().isoformat(),
            'description': 'Buddy has been limping on his left front leg since morning.',
        }, format='json', HTTP_AUTHORIZATION=f'Bearer {self.citizen_token}')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_10_citizen_only_sees_own_self_reports(self):
        """Citizens should only see self-reports for their own pets."""
        from apps.clinical.models import SelfReportedRecord
        SelfReportedRecord.objects.create(
            pet=self.pet, title='Test', date=date.today(),
        )
        response = self.client.get('/api/clinical/self-reports/',
                                   HTTP_AUTHORIZATION=f'Bearer {self.citizen2_token}')
        results = response.json()['results']
        self.assertEqual(len(results), 0)

    # ── Vaccination Scheduler ────────────────────────────────────────────

    def test_11_vet_create_puppy_vaccination_schedule(self):
        """Vet can create a vaccination schedule for a puppy."""
        response = self.client.post('/api/clinical/vaccination-schedules/', {
            'animal_name': 'Buddy',
            'animal_type': 'dog',
            'date_of_birth': self.pet.dob.isoformat(),
            'gender': 'Male',
            'pet_id': self.pet.id,
        }, format='json', HTTP_AUTHORIZATION=f'Bearer {self.vet_token}')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()
        self.assertEqual(data['track'], 'puppy')
        self.assertGreater(len(data['items']), 0)

    def test_12_vet_create_kitten_vaccination_schedule(self):
        """Kitten track schedule generates correct items."""
        cat = Pet.objects.create(
            owner=self.citizen, name='Whiskers', species='Cat',
            breed='Persian', dob=date.today() - timedelta(days=60),
        )
        response = self.client.post('/api/clinical/vaccination-schedules/', {
            'animal_name': 'Whiskers',
            'animal_type': 'cat',
            'date_of_birth': cat.dob.isoformat(),
            'pet_id': cat.id,
        }, format='json', HTTP_AUTHORIZATION=f'Bearer {self.vet_token}')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.json()['track'], 'kitten')

    def test_13_vet_create_cattle_vaccination_schedule(self):
        """Cattle track schedule with seasonal alerts."""
        cow = Pet.objects.create(
            owner=self.citizen, name='Daisy', species='Cow',
            dob=date.today() - timedelta(days=180),
        )
        response = self.client.post('/api/clinical/vaccination-schedules/', {
            'animal_name': 'Daisy',
            'animal_type': 'cow',
            'date_of_birth': cow.dob.isoformat(),
            'gender': 'Female',
            'pet_id': cow.id,
        }, format='json', HTTP_AUTHORIZATION=f'Bearer {self.vet_token}')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.json()['track'], 'cattle')

    def test_14_mark_schedule_item_complete(self):
        """Owner can toggle a vaccination schedule item as complete."""
        from apps.clinical.models import VaccinationSchedule, VaccinationScheduleItem
        schedule = VaccinationSchedule.objects.create(
            pet=self.pet, owner=self.citizen,
            animal_name='Buddy', animal_type='dog',
            date_of_birth=self.pet.dob, track='puppy',
        )
        item = VaccinationScheduleItem.objects.create(
            schedule=schedule, item_type='vaccine',
            title='Test Vaccine', scheduled_date=date.today(),
        )
        # Use citizen_token since queryset filters by owner=request.user
        response = self.client.post(
            f'/api/clinical/vaccination-schedules/{schedule.id}/mark-item/',
            {'item_id': item.id},
            format='json', HTTP_AUTHORIZATION=f'Bearer {self.citizen_token}'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        item.refresh_from_db()
        self.assertTrue(item.is_completed)

    def test_15_missing_required_fields_fails(self):
        """Vaccination schedule without required fields should fail."""
        response = self.client.post('/api/clinical/vaccination-schedules/', {
            'animal_name': 'TestAnimal',
        }, format='json', HTTP_AUTHORIZATION=f'Bearer {self.vet_token}')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
