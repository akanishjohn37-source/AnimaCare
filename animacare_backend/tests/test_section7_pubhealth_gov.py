"""
=============================================================================
SECTION 7: Public Health, Governance & Notifications Tests
=============================================================================
Tests for: Zoonotic heatmap, Broadcast, ML predictions, Audit trail, Notifications
Run after: Section 1-6
=============================================================================
"""
from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from apps.users.views import generate_tokens
from apps.users.models import Notification

User = get_user_model()


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class Section7_PublicHealthGovernanceTests(TestCase):
    """Test Suite: Public health endpoints, governance, and notifications."""

    def setUp(self):
        self.client = APIClient()

        # Admin (superuser for governance endpoints)
        self.admin = User.objects.create_superuser(
            username='superadmin', email='admin@animacare.com',
            password='AdminPass123!', role='admin',
        )
        self.admin.account_status = 'active'
        self.admin.save()
        self.admin_token = generate_tokens(self.admin)['access']

        # Civic authority
        self.civic = User.objects.create_user(
            username='civicuser', email='civic@test.com',
            password='CivicPass123!', role='civic_authority', account_status='active',
            zone='Cochin Corporation',
        )
        self.civic_token = generate_tokens(self.civic)['access']

        # Regular citizen
        self.citizen = User.objects.create_user(
            username='citizen', email='citizen@test.com',
            password='CitizenPass123!', role='citizen', account_status='active',
        )
        self.citizen_token = generate_tokens(self.citizen)['access']

    # ── Zoonotic Heatmap ─────────────────────────────────────────────────

    def test_01_civic_access_heatmap(self):
        """Civic authority can access the zoonotic heatmap."""
        response = self.client.get('/api/public-health/heatmap/',
                                   HTTP_AUTHORIZATION=f'Bearer {self.civic_token}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('heatmap_data', response.json())

    def test_02_citizen_denied_heatmap(self):
        """Citizens should be denied access to heatmap."""
        response = self.client.get('/api/public-health/heatmap/',
                                   HTTP_AUTHORIZATION=f'Bearer {self.citizen_token}')
        self.assertEqual(response.status_code, 403)

    def test_03_admin_access_heatmap(self):
        """Admin should have access to heatmap."""
        response = self.client.get('/api/public-health/heatmap/',
                                   HTTP_AUTHORIZATION=f'Bearer {self.admin_token}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_04_heatmap_filter_by_disease(self):
        """Heatmap should accept disease query parameter."""
        response = self.client.get('/api/public-health/heatmap/?disease=Parvovirus',
                                   HTTP_AUTHORIZATION=f'Bearer {self.civic_token}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    # ── Broadcast Alerts ─────────────────────────────────────────────────

    def test_05_civic_broadcast_alert(self):
        """Civic authority can broadcast emergency alert."""
        response = self.client.post('/api/public-health/broadcast/', {
            'polygon': [[10.85, 76.27], [10.86, 76.28], [10.87, 76.27]],
            'message': 'Rabies outbreak in zone. Please vaccinate all dogs.',
            'target_group': 'all_citizens',
        }, format='json', HTTP_AUTHORIZATION=f'Bearer {self.civic_token}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('message', response.json())

    def test_06_broadcast_missing_data_fails(self):
        """Broadcast without polygon or message should fail."""
        response = self.client.post('/api/public-health/broadcast/', {
            'polygon': [],
            'message': '',
        }, format='json', HTTP_AUTHORIZATION=f'Bearer {self.civic_token}')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_07_citizen_cannot_broadcast(self):
        """Citizens should not be able to broadcast."""
        response = self.client.post('/api/public-health/broadcast/', {
            'polygon': [[10.85, 76.27]],
            'message': 'Test',
        }, format='json', HTTP_AUTHORIZATION=f'Bearer {self.citizen_token}')
        self.assertEqual(response.status_code, 403)

    # ── Public Health Analytics ───────────────────────────────────────────

    def test_08_civic_access_analytics(self):
        """Civic authority can access public health analytics."""
        response = self.client.get('/api/public-health/analytics/',
                                   HTTP_AUTHORIZATION=f'Bearer {self.civic_token}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIn('metrics', data)
        self.assertIn('total_adoptions', data['metrics'])
        self.assertIn('vaccination_compliance', data['metrics'])

    def test_09_citizen_denied_analytics(self):
        """Citizens should be denied access to analytics."""
        response = self.client.get('/api/public-health/analytics/',
                                   HTTP_AUTHORIZATION=f'Bearer {self.citizen_token}')
        self.assertEqual(response.status_code, 403)

    # ── ML Predictions ───────────────────────────────────────────────────

    def test_10_civic_access_ml_predictions(self):
        """Civic authority can access ML predictions."""
        response = self.client.get('/api/public-health/ml-predictions/',
                                   HTTP_AUTHORIZATION=f'Bearer {self.civic_token}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIn('states', data)
        self.assertIn('timeline', data)

    def test_11_citizen_denied_ml_predictions(self):
        """Citizens should be denied ML predictions."""
        response = self.client.get('/api/public-health/ml-predictions/',
                                   HTTP_AUTHORIZATION=f'Bearer {self.citizen_token}')
        self.assertEqual(response.status_code, 403)

    # ── Governance: Audit Trail ──────────────────────────────────────────

    def test_12_superadmin_access_audit_logs(self):
        """Superadmin can access audit logs."""
        response = self.client.get('/api/superadmin/audit-logs/',
                                   HTTP_AUTHORIZATION=f'Bearer {self.admin_token}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_13_citizen_denied_audit_logs(self):
        """Non-superuser should be denied audit logs."""
        response = self.client.get('/api/superadmin/audit-logs/',
                                   HTTP_AUTHORIZATION=f'Bearer {self.citizen_token}')
        self.assertEqual(response.status_code, 403)

    # ── Governance: System Health ────────────────────────────────────────

    def test_14_superadmin_system_health(self):
        """Superadmin can access system health metrics."""
        response = self.client.get('/api/superadmin/system-health/',
                                   HTTP_AUTHORIZATION=f'Bearer {self.admin_token}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIn('metrics', data)
        self.assertIn('cpu_usage_percent', data['metrics'])
        self.assertIn('memory_usage_percent', data['metrics'])

    def test_15_citizen_denied_system_health(self):
        """Non-superuser should be denied system health."""
        response = self.client.get('/api/superadmin/system-health/',
                                   HTTP_AUTHORIZATION=f'Bearer {self.citizen_token}')
        self.assertEqual(response.status_code, 403)

    # ── Notifications ────────────────────────────────────────────────────

    def test_16_user_list_notifications(self):
        """User can list their notifications."""
        Notification.objects.create(
            recipient=self.citizen,
            title='Welcome!',
            message='Welcome to AnimaCare platform.'
        )
        response = self.client.get('/api/auth/notifications/',
                                   HTTP_AUTHORIZATION=f'Bearer {self.citizen_token}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.json()['results']
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['title'], 'Welcome!')

    def test_17_mark_notification_as_read(self):
        """User can mark a notification as read."""
        notif = Notification.objects.create(
            recipient=self.citizen,
            title='Test', message='Test notification'
        )
        response = self.client.post(
            f'/api/auth/notifications/{notif.id}/mark_as_read/',
            HTTP_AUTHORIZATION=f'Bearer {self.citizen_token}'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        notif.refresh_from_db()
        self.assertTrue(notif.is_read)

    def test_18_clear_all_notifications(self):
        """User can clear all their notifications."""
        Notification.objects.create(
            recipient=self.citizen, title='N1', message='M1'
        )
        Notification.objects.create(
            recipient=self.citizen, title='N2', message='M2'
        )
        response = self.client.post('/api/auth/notifications/clear_all/',
                                    HTTP_AUTHORIZATION=f'Bearer {self.citizen_token}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Notification.objects.filter(recipient=self.citizen).count(), 0)

    # ── API Status Endpoint ───────────────────────────────────────────────

    def test_19_api_status_endpoint(self):
        """Root API status should return online."""
        response = self.client.get('/api/status/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data['status'], 'online')
        self.assertIn('AnimaCare', data['project'])

    def test_20_vets_list_endpoint(self):
        """Vets list endpoint should return active veterinarians."""
        vet = User.objects.create_user(
            username='activevet', email='vet@test.com',
            password='VetPass123!', role='veterinarian', account_status='active',
        )
        response = self.client.get('/api/auth/vets/',
                                   HTTP_AUTHORIZATION=f'Bearer {self.citizen_token}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

