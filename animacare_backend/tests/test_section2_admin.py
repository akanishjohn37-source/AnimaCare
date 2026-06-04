"""
=============================================================================
SECTION 2: Admin Panel & User Management Tests
=============================================================================
Tests for: User approval/rejection/suspension, Admin stats, Pending users list
Run after: Section 1 (Authentication must work for admin tokens)
=============================================================================
"""
from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from apps.users.views import generate_tokens

User = get_user_model()


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class Section2_AdminManagementTests(TestCase):
    """Test Suite: Admin approval workflows, user management, and stats."""

    def setUp(self):
        """Create admin and test users for admin operations."""
        self.client = APIClient()

        # Create admin user directly (can't self-register)
        self.admin = User.objects.create_user(
            username='admin',
            email='admin@animacare.com',
            password='AdminPass123!',
            role='admin',
            account_status='active',
            requires_approval=False,
        )
        self.admin_tokens = generate_tokens(self.admin)
        self.admin_token = self.admin_tokens['access']

        # Create a pending vet
        self.pending_vet = User.objects.create_user(
            username='pendingvet',
            email='pendingvet@test.com',
            password='VetPass123!',
            role='veterinarian',
            account_status='pending',
        )

        # Create a pending shelter admin
        self.pending_shelter = User.objects.create_user(
            username='pendingshelter',
            email='pendingshelter@test.com',
            password='ShelterPass123!',
            role='shelter_admin',
            account_status='pending',
        )

        # Create an active citizen
        self.citizen = User.objects.create_user(
            username='activecitizen',
            email='citizen@test.com',
            password='CitizenPass123!',
            role='citizen',
            account_status='active',
        )
        self.citizen_tokens = generate_tokens(self.citizen)
        self.citizen_token = self.citizen_tokens['access']

    # ── Pending Users ────────────────────────────────────────────────────

    def test_01_admin_can_list_pending_users(self):
        """Admin can view list of pending users."""
        response = self.client.get(
            '/api/auth/admin/users/pending/',
            HTTP_AUTHORIZATION=f'Bearer {self.admin_token}'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        # Should have results (paginated)
        self.assertIn('results', data)
        usernames = [u['username'] for u in data['results']]
        self.assertIn('pendingvet', usernames)
        self.assertIn('pendingshelter', usernames)

    def test_02_citizen_cannot_list_pending_users(self):
        """Non-admin users should be denied access to pending users."""
        response = self.client.get(
            '/api/auth/admin/users/pending/',
            HTTP_AUTHORIZATION=f'Bearer {self.citizen_token}'
        )
        self.assertEqual(response.status_code, 403)

    def test_03_unauthenticated_cannot_list_pending_users(self):
        """Unauthenticated requests should be denied."""
        response = self.client.get('/api/auth/admin/users/pending/')
        self.assertEqual(response.status_code, 403)

    # ── Approve User ─────────────────────────────────────────────────────

    def test_04_admin_approve_user(self):
        """Admin can approve a pending user."""
        response = self.client.post(
            f'/api/auth/admin/users/{self.pending_vet.id}/action/',
            {'action': 'approve', 'note': 'License verified'},
            format='json',
            HTTP_AUTHORIZATION=f'Bearer {self.admin_token}'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.pending_vet.refresh_from_db()
        self.assertEqual(self.pending_vet.account_status, 'active')
        self.assertEqual(self.pending_vet.approval_note, 'License verified')

    def test_05_approved_user_can_login(self):
        """After approval, user should be able to login."""
        # Approve first
        self.client.post(
            f'/api/auth/admin/users/{self.pending_vet.id}/action/',
            {'action': 'approve'},
            format='json',
            HTTP_AUTHORIZATION=f'Bearer {self.admin_token}'
        )
        # Try login
        response = self.client.post('/api/auth/login/', {
            'username': 'pendingvet',
            'password': 'VetPass123!'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('token', response.json())

    # ── Reject User ──────────────────────────────────────────────────────

    def test_06_admin_reject_user(self):
        """Admin can reject a pending user."""
        response = self.client.post(
            f'/api/auth/admin/users/{self.pending_shelter.id}/action/',
            {'action': 'reject', 'note': 'Invalid registration docs'},
            format='json',
            HTTP_AUTHORIZATION=f'Bearer {self.admin_token}'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.pending_shelter.refresh_from_db()
        self.assertEqual(self.pending_shelter.account_status, 'rejected')

    def test_07_rejected_user_cannot_login(self):
        """Rejected users should not be able to login."""
        self.pending_shelter.account_status = 'rejected'
        self.pending_shelter.save()
        response = self.client.post('/api/auth/login/', {
            'username': 'pendingshelter',
            'password': 'ShelterPass123!'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # ── Suspend User ─────────────────────────────────────────────────────

    def test_08_admin_suspend_user(self):
        """Admin can suspend an active user."""
        response = self.client.post(
            f'/api/auth/admin/users/{self.citizen.id}/action/',
            {'action': 'suspend', 'note': 'Policy violation'},
            format='json',
            HTTP_AUTHORIZATION=f'Bearer {self.admin_token}'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.citizen.refresh_from_db()
        self.assertEqual(self.citizen.account_status, 'suspended')

    def test_09_suspended_user_cannot_login(self):
        """Suspended users should not be able to login."""
        self.citizen.account_status = 'suspended'
        self.citizen.save()
        response = self.client.post('/api/auth/login/', {
            'username': 'activecitizen',
            'password': 'CitizenPass123!'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # ── Delete User ──────────────────────────────────────────────────────

    def test_10_admin_delete_user(self):
        """Admin can permanently delete a user."""
        user_id = self.pending_vet.id
        response = self.client.post(
            f'/api/auth/admin/users/{user_id}/action/',
            {'action': 'delete'},
            format='json',
            HTTP_AUTHORIZATION=f'Bearer {self.admin_token}'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(User.objects.filter(id=user_id).exists())

    # ── All Users List ───────────────────────────────────────────────────

    def test_11_admin_all_users_list(self):
        """Admin can list all users."""
        response = self.client.get(
            '/api/auth/admin/users/',
            HTTP_AUTHORIZATION=f'Bearer {self.admin_token}'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIn('results', data)
        self.assertGreaterEqual(len(data['results']), 3)  # admin + 2 pending + citizen

    def test_12_citizen_cannot_access_all_users(self):
        """Non-admin should be denied."""
        response = self.client.get(
            '/api/auth/admin/users/',
            HTTP_AUTHORIZATION=f'Bearer {self.citizen_token}'
        )
        self.assertEqual(response.status_code, 403)

    # ── User Stats ───────────────────────────────────────────────────────

    def test_13_admin_stats(self):
        """Admin stats should show correct counts by status and role."""
        response = self.client.get(
            '/api/auth/admin/stats/',
            HTTP_AUTHORIZATION=f'Bearer {self.admin_token}'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIn('total', data)
        self.assertIn('pending', data)
        self.assertIn('active', data)
        self.assertIn('by_role', data)
        self.assertEqual(data['total'], 4)  # admin + vet + shelter + citizen
        self.assertEqual(data['pending'], 2)
        self.assertEqual(data['active'], 2)  # admin + citizen
        self.assertEqual(data['by_role']['citizen'], 1)
        self.assertEqual(data['by_role']['veterinarian'], 1)

    def test_14_citizen_cannot_access_stats(self):
        """Non-admin should be denied."""
        response = self.client.get(
            '/api/auth/admin/stats/',
            HTTP_AUTHORIZATION=f'Bearer {self.citizen_token}'
        )
        self.assertEqual(response.status_code, 403)

    # ── Non-existent User Action ─────────────────────────────────────────

    def test_15_action_on_nonexistent_user(self):
        """Action on a non-existent user should return 404."""
        response = self.client.post(
            '/api/auth/admin/users/99999/action/',
            {'action': 'approve'},
            format='json',
            HTTP_AUTHORIZATION=f'Bearer {self.admin_token}'
        )
        self.assertEqual(response.status_code, 404)

    def test_16_invalid_action(self):
        """Invalid action should return 400."""
        response = self.client.post(
            f'/api/auth/admin/users/{self.pending_vet.id}/action/',
            {'action': 'invalidaction'},
            format='json',
            HTTP_AUTHORIZATION=f'Bearer {self.admin_token}'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
