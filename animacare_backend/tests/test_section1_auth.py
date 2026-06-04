"""
=============================================================================
SECTION 1: Authentication & User Management Tests
=============================================================================
Tests for: Registration, Login, Token Refresh, Logout, Profile, Password Reset
Run after: (First section — no dependencies)
=============================================================================
"""
import json
from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

User = get_user_model()


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class Section1_AuthenticationTests(TestCase):
    """Test Suite: User Registration, Login, JWT Tokens, and Profile."""

    def setUp(self):
        """Set up test fixtures shared across all auth tests."""
        self.client = APIClient()
        self.register_url = '/api/auth/register/'
        self.login_url = '/api/auth/login/'
        self.logout_url = '/api/auth/logout/'
        self.me_url = '/api/auth/me/'
        self.refresh_url = '/api/auth/refresh/'
        self.change_pw_url = '/api/auth/change-password/'

        # Base citizen registration payload
        self.citizen_data = {
            'username': 'testcitizen',
            'email': 'citizen@test.com',
            'first_name': 'Test',
            'last_name': 'Citizen',
            'password': 'StrongPass123!',
            'confirm_password': 'StrongPass123!',
            'role': 'citizen',
            'phone_number': '9876543210',
            'address': '123 Test St',
        }

    # ── Registration Tests ───────────────────────────────────────────────

    def test_01_citizen_registration_success(self):
        """Citizens should register and get immediate token (auto-approved)."""
        response = self.client.post(self.register_url, self.citizen_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()
        self.assertIn('token', data)
        self.assertIn('refresh', data)
        self.assertFalse(data['requires_approval'])
        # Verify user was created with active status
        user = User.objects.get(username='testcitizen')
        self.assertEqual(user.account_status, 'active')
        self.assertEqual(user.role, 'citizen')

    def test_02_vet_registration_requires_approval(self):
        """Veterinarians should be pending after registration (no token issued)."""
        vet_data = {
            'username': 'testvet',
            'email': 'vet@test.com',
            'first_name': 'Dr',
            'last_name': 'Vet',
            'password': 'StrongPass123!',
            'confirm_password': 'StrongPass123!',
            'role': 'veterinarian',
            'phone_number': '9876543211',
            'veterinarian_profile': {
                'clinic_hospital_name': 'Test Clinic',
                'medical_license_number': 'KSVC.Reg.1234',
                'clinic_address': '456 Vet Rd',
                'professional_contact_number': '9876543211',
                'specialization': 'General',
                'years_of_experience': 5,
            }
        }
        response = self.client.post(self.register_url, vet_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()
        self.assertTrue(data['requires_approval'])
        self.assertNotIn('token', data)
        user = User.objects.get(username='testvet')
        self.assertEqual(user.account_status, 'pending')

    def test_03_shelter_admin_registration_requires_approval(self):
        """Shelter admins should be pending after registration."""
        shelter_data = {
            'username': 'testshelter',
            'email': 'shelter@test.com',
            'first_name': 'Shelter',
            'last_name': 'Admin',
            'password': 'StrongPass123!',
            'confirm_password': 'StrongPass123!',
            'role': 'shelter_admin',
            'phone_number': '9876543212',
            'shelter_profile': {
                'shelter_name': 'Test Animal Shelter',
                'shelter_registration_number': 'KL/2026/0001234',
                'shelter_address': '789 Shelter Ave',
                'shelter_contact_number': '9876543212',
                'capacity': 50,
            }
        }
        response = self.client.post(self.register_url, shelter_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()
        self.assertTrue(data['requires_approval'])
        user = User.objects.get(username='testshelter')
        self.assertEqual(user.account_status, 'pending')

    def test_04_duplicate_username_fails(self):
        """Duplicate username should fail registration."""
        self.client.post(self.register_url, self.citizen_data, format='json')
        response = self.client.post(self.register_url, self.citizen_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_05_password_mismatch_fails(self):
        """Mismatched passwords should fail."""
        data = self.citizen_data.copy()
        data['confirm_password'] = 'WrongPassword!'
        response = self.client.post(self.register_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_06_admin_self_registration_blocked(self):
        """Admin role cannot self-register through public API."""
        data = self.citizen_data.copy()
        data['username'] = 'admin_attempt'
        data['role'] = 'admin'
        response = self.client.post(self.register_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # ── Login Tests ──────────────────────────────────────────────────────

    def test_07_citizen_login_success(self):
        """Active citizen should login and receive JWT tokens."""
        self.client.post(self.register_url, self.citizen_data, format='json')
        response = self.client.post(self.login_url, {
            'username': 'testcitizen',
            'password': 'StrongPass123!'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIn('token', data)
        self.assertIn('refresh', data)
        self.assertIn('user', data)

    def test_08_login_with_email(self):
        """Login should work with email as well as username."""
        self.client.post(self.register_url, self.citizen_data, format='json')
        response = self.client.post(self.login_url, {
            'username': 'citizen@test.com',
            'password': 'StrongPass123!'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_09_invalid_credentials_fails(self):
        """Wrong password should return error."""
        self.client.post(self.register_url, self.citizen_data, format='json')
        response = self.client.post(self.login_url, {
            'username': 'testcitizen',
            'password': 'WrongPassword!'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_10_pending_user_login_blocked(self):
        """Pending users should not be able to login."""
        vet_data = {
            'username': 'pendingvet',
            'email': 'pendingvet@test.com',
            'password': 'StrongPass123!',
            'confirm_password': 'StrongPass123!',
            'role': 'veterinarian',
            'phone_number': '9876543299',
            'veterinarian_profile': {
                'clinic_hospital_name': 'Pending Clinic',
                'medical_license_number': 'KSVC.Reg.9999',
                'clinic_address': '99 Pending Rd',
                'professional_contact_number': '9876543299',
            }
        }
        self.client.post(self.register_url, vet_data, format='json')
        response = self.client.post(self.login_url, {
            'username': 'pendingvet',
            'password': 'StrongPass123!'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # ── Token & Profile Tests ────────────────────────────────────────────

    def test_11_me_endpoint_with_valid_token(self):
        """Authenticated user should retrieve their profile via /me/."""
        reg = self.client.post(self.register_url, self.citizen_data, format='json')
        token = reg.json()['token']
        response = self.client.get(self.me_url, HTTP_AUTHORIZATION=f'Bearer {token}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data['username'], 'testcitizen')

    def test_12_me_endpoint_without_token_fails(self):
        """No token should return 401 from /me/."""
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, 401)

    def test_13_token_refresh(self):
        """Valid refresh token should return new access + refresh tokens."""
        reg = self.client.post(self.register_url, self.citizen_data, format='json')
        refresh = reg.json()['refresh']
        response = self.client.post(self.refresh_url, {'refresh': refresh}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIn('token', data)
        self.assertIn('refresh', data)

    def test_14_token_refresh_without_token_fails(self):
        """Missing refresh token should return 400."""
        response = self.client.post(self.refresh_url, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_15_logout(self):
        """Logout should always succeed (stateless JWT)."""
        response = self.client.post(self.logout_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    # ── Password Management ──────────────────────────────────────────────

    def test_16_change_password_direct(self):
        """Change password should work with valid username and new password."""
        self.client.post(self.register_url, self.citizen_data, format='json')
        response = self.client.post(self.change_pw_url, {
            'username': 'testcitizen',
            'new_password': 'NewStrongPass456!'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Verify new password works
        login_resp = self.client.post(self.login_url, {
            'username': 'testcitizen',
            'password': 'NewStrongPass456!'
        }, format='json')
        self.assertEqual(login_resp.status_code, status.HTTP_200_OK)

    def test_17_change_password_nonexistent_user_fails(self):
        """Change password for non-existent user should return 404."""
        response = self.client.post(self.change_pw_url, {
            'username': 'ghost_user',
            'new_password': 'NewPassword!'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_18_civic_authority_registration_with_zone(self):
        """Civic authority registration requires a zone and blocks duplicates."""
        civic_data = {
            'username': 'civicuser',
            'email': 'civic@test.com',
            'first_name': 'Civic',
            'last_name': 'Officer',
            'password': 'StrongPass123!',
            'confirm_password': 'StrongPass123!',
            'role': 'civic_authority',
            'phone_number': '9876543213',
            'zone': 'Cochin Corporation',
            'civic_profile': {
                'department_name': 'Animal Control',
                'employee_id': 'EMP001',
                'jurisdiction_area': 'Cochin',
                'designation': 'Officer',
                'official_contact': '9876543213',
            }
        }
        response = self.client.post(self.register_url, civic_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Second registration with same zone should fail
        civic_data2 = civic_data.copy()
        civic_data2['username'] = 'civicuser2'
        civic_data2['email'] = 'civic2@test.com'
        civic_data2['civic_profile'] = {
            'department_name': 'Animal Control 2',
            'employee_id': 'EMP002',
            'jurisdiction_area': 'Cochin',
            'designation': 'Officer 2',
            'official_contact': '9876543214',
        }
        response2 = self.client.post(self.register_url, civic_data2, format='json')
        self.assertEqual(response2.status_code, status.HTTP_400_BAD_REQUEST)
