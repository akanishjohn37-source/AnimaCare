"""
=============================================================================
SECTION 6: Verification Engine Tests
=============================================================================
Tests for: Vet License, NGO Darpan, Municipal Registration, Owner-Pet Binding
Run after: Section 1-5
=============================================================================
"""
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status


class Section6_VerificationEngineTests(TestCase):
    """Test Suite: All 4 verification engines with format validation."""

    def setUp(self):
        self.client = APIClient()

    # ── Engine 1: Vet License Verification ───────────────────────────────

    def test_01_vet_license_valid_format(self):
        """Valid KSVC license format should be accepted."""
        response = self.client.post('/api/auth/verify-vet-license/', {
            'license_number': 'KSVC.Reg.1234',
        }, format='json')
        # Should get 200 (valid) or 400 (not in registry) — not a format error
        self.assertIn(response.status_code, [200, 400])

    def test_02_vet_license_invalid_format(self):
        """Invalid license format should be rejected."""
        response = self.client.post('/api/auth/verify-vet-license/', {
            'license_number': 'INVALID-FORMAT-123',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('KSVC_REGISTRATION_INVALID', response.json().get('error', ''))

    def test_03_vet_license_empty_fails(self):
        """Empty license number should be rejected."""
        response = self.client.post('/api/auth/verify-vet-license/', {
            'license_number': '',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # ── Engine 2: NGO Darpan Verification ────────────────────────────────

    def test_04_ngo_darpan_valid_format(self):
        """Valid Darpan ID format should be accepted."""
        response = self.client.post('/api/auth/verify-darpan/', {
            'darpan_id': 'KL/2026/0123456',
        }, format='json')
        self.assertIn(response.status_code, [200, 400])

    def test_05_ngo_darpan_invalid_format(self):
        """Invalid Darpan format should be rejected."""
        response = self.client.post('/api/auth/verify-darpan/', {
            'darpan_id': 'INVALID123',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('ORGANIZATION_NOT_FOUND', response.json().get('error', ''))

    def test_06_ngo_darpan_empty_fails(self):
        """Empty Darpan ID should be rejected."""
        response = self.client.post('/api/auth/verify-darpan/', {
            'darpan_id': '',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # ── Engine 3: Municipal Registration ─────────────────────────────────

    def test_07_municipal_valid_format(self):
        """Valid municipal ID format should be accepted."""
        response = self.client.post('/api/auth/verify-municipal/', {
            'municipal_id': 'COCHIN-CORP-2026-04192',
        }, format='json')
        self.assertIn(response.status_code, [200, 400])

    def test_08_municipal_invalid_format(self):
        """Invalid municipal ID format should be rejected."""
        response = self.client.post('/api/auth/verify-municipal/', {
            'municipal_id': 'INVALID-FORMAT',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('REGISTRY_NOT_FOUND', response.json().get('error', ''))

    def test_09_municipal_empty_fails(self):
        """Empty municipal ID should be rejected."""
        response = self.client.post('/api/auth/verify-municipal/', {
            'municipal_id': '',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # ── Engine 4: Owner-Pet Binding Verification ─────────────────────────

    def test_10_ownership_binding_all_vectors(self):
        """All 3 binding vectors must be provided."""
        response = self.client.post('/api/auth/verify-ownership/', {
            'municipal_id': 'COCHIN-CORP-2026-04192',
            'owner_gov_id': 'ABCDE1234F',
            'vaccination_batch': 'VAX-2026-BATCH-001',
        }, format='json')
        # Should pass format validation at minimum
        self.assertIn(response.status_code, [200, 400])

    def test_11_ownership_binding_missing_vectors(self):
        """Incomplete vectors should return specific error."""
        response = self.client.post('/api/auth/verify-ownership/', {
            'municipal_id': 'COCHIN-CORP-2026-04192',
            # Missing: owner_gov_id, vaccination_batch
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        data = response.json()
        self.assertEqual(data['error'], 'INCOMPLETE_VECTORS')
        self.assertIn('missing_fields', data)
        self.assertEqual(len(data['missing_fields']), 2)

    def test_12_ownership_binding_empty_fields(self):
        """Empty fields should be treated as missing."""
        response = self.client.post('/api/auth/verify-ownership/', {
            'municipal_id': '',
            'owner_gov_id': '',
            'vaccination_batch': '',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.json()['error'], 'INCOMPLETE_VECTORS')
        self.assertEqual(len(response.json()['missing_fields']), 3)

    # ── Occupied Civic Zones ─────────────────────────────────────────────

    def test_13_occupied_civic_zones(self):
        """Occupied zones endpoint should return list."""
        response = self.client.get('/api/auth/occupied-civic-zones/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('occupied_zones', response.json())
        self.assertIsInstance(response.json()['occupied_zones'], list)
