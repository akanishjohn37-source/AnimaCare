import jwt
import datetime
from django.conf import settings
from rest_framework import viewsets, generics, filters
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.decorators import action
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from .serializers import RegisterSerializer, LoginSerializer, UserProfileSerializer, NotificationSerializer
from .models import VeterinarianProfile, ShelterAdminProfile, CivicAuthorityProfile, Notification

User = get_user_model()

SECRET = settings.SECRET_KEY
JWT_EXP_HOURS = 24

REFRESH_EXP_DAYS = 7

def generate_tokens(user):
    access_payload = {
        'token_type': 'access',
        'user_id': user.id,
        'username': user.username,
        'role': user.role,
        'account_status': user.account_status,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=JWT_EXP_HOURS),
        'iat': datetime.datetime.utcnow(),
    }
    refresh_payload = {
        'token_type': 'refresh',
        'user_id': user.id,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(days=REFRESH_EXP_DAYS),
        'iat': datetime.datetime.utcnow(),
    }
    return {
        'access': jwt.encode(access_payload, SECRET, algorithm='HS256'),
        'refresh': jwt.encode(refresh_payload, SECRET, algorithm='HS256')
    }


def decode_token(token):
    return jwt.decode(token, SECRET, algorithms=['HS256'])


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            role = user.role
            # Citizens get immediate access; others wait for approval
            if role == 'citizen':
                tokens = generate_tokens(user)
                return Response({
                    "message": "Registration successful! Welcome to AnimaCare.",
                    "token": tokens['access'],
                    "refresh": tokens['refresh'],
                    "user": UserProfileSerializer(user).data,
                    "requires_approval": False,
                }, status=status.HTTP_201_CREATED)
            else:
                return Response({
                    "message": (
                        f"Registration submitted! Your {user.get_role_display()} account "
                        f"is pending administrator approval. You'll be notified once approved."
                    ),
                    "requires_approval": True,
                    "account_status": user.account_status,
                }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            tokens = generate_tokens(user)
            return Response({
                "message": f"Welcome back, {user.get_full_name() or user.username}!",
                "token": tokens['access'],
                "refresh": tokens['refresh'],
                "user": UserProfileSerializer(user).data,
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class TokenRefreshView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response({"error": "Refresh token is required."}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            payload = decode_token(refresh_token)
            if payload.get('token_type') != 'refresh':
                return Response({"error": "Invalid token type."}, status=status.HTTP_401_UNAUTHORIZED)
            
            user = User.objects.get(id=payload['user_id'])
            if user.account_status not in ['active', 'pending']: # pending citizens are active, other pendings shouldn't have tokens anyway
                return Response({"error": "Account is not active."}, status=status.HTTP_401_UNAUTHORIZED)
                
            tokens = generate_tokens(user)
            return Response({
                "token": tokens['access'],
                "refresh": tokens['refresh']
            })
        except jwt.ExpiredSignatureError:
            return Response({"error": "Refresh token has expired. Please log in again."}, status=status.HTTP_401_UNAUTHORIZED)
        except (jwt.DecodeError, User.DoesNotExist):
            return Response({"error": "Invalid refresh token."}, status=status.HTTP_401_UNAUTHORIZED)


class MeView(APIView):
    """Return current user profile from JWT token."""

    def get(self, request):
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return Response({"error": "No token provided."}, status=401)
        token = auth_header.split(' ', 1)[1]
        try:
            payload = decode_token(token)
            user = User.objects.get(id=payload['user_id'])
            return Response(UserProfileSerializer(user).data)
        except (jwt.ExpiredSignatureError, jwt.DecodeError, User.DoesNotExist) as e:
            return Response({"error": str(e)}, status=401)


class LogoutView(APIView):
    """Stateless JWT logout — client discards the token."""

    def post(self, request):
        return Response({"message": "Logged out successfully."})


# ── Admin: Approval management endpoints ─────────────────────────────────────

class PendingUsersView(generics.ListAPIView):
    """List users awaiting approval — admin only."""
    from .serializers import UserAdminSerializer
    serializer_class = UserAdminSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['username', 'email']
    ordering_fields = ['date_joined']

    def get_queryset(self):
        return User.objects.filter(account_status='pending').order_by('-date_joined')

    def list(self, request, *args, **kwargs):
        if not self._is_admin(request):
            return Response({"error": "Unauthorized."}, status=403)
        return super().list(request, *args, **kwargs)

    def _is_admin(self, request):
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return False
        try:
            payload = decode_token(auth_header.split(' ', 1)[1])
            return payload.get('role') == 'admin'
        except Exception:
            return False


class ApproveUserView(APIView):
    """Approve or reject a pending user — admin only."""

    def post(self, request, user_id):
        if not self._is_admin(request):
            return Response({"error": "Unauthorized."}, status=403)

        action = request.data.get('action', 'approve')  # 'approve' | 'reject'
        note = request.data.get('note', '')

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"error": "User not found."}, status=404)

        if action == 'approve':
            user.account_status = 'active'
            user.approval_note = note
            user.approved_at = timezone.now()
            user.save()
            return Response({"message": f"User {user.username} approved successfully."})
        elif action == 'reject':
            user.account_status = 'rejected'
            user.approval_note = note
            user.save()
            return Response({"message": f"User {user.username} registration rejected."})
        elif action == 'suspend':
            user.account_status = 'suspended'
            user.approval_note = note
            user.save()
            return Response({"message": f"User {user.username} suspended."})
        elif action == 'delete':
            user.delete()
            return Response({"message": f"User {user.username} deleted permanently."})
        else:
            return Response({"error": "Invalid action. Use 'approve', 'reject', 'suspend', or 'delete'."}, status=400)

    def _is_admin(self, request):
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return False
        try:
            payload = decode_token(auth_header.split(' ', 1)[1])
            return payload.get('role') == 'admin'
        except Exception:
            return False


class AllUsersView(generics.ListAPIView):
    """All users list for admin panel."""
    from .serializers import UserAdminSerializer
    serializer_class = UserAdminSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['role', 'account_status']
    search_fields = ['username', 'email', 'first_name', 'last_name']
    ordering_fields = ['date_joined']

    def get_queryset(self):
        return User.objects.all().order_by('-date_joined')

    def list(self, request, *args, **kwargs):
        if not self._is_admin(request):
            return Response({"error": "Unauthorized."}, status=403)
        return super().list(request, *args, **kwargs)

    def _is_admin(self, request):
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return False
        try:
            payload = decode_token(auth_header.split(' ', 1)[1])
            return payload.get('role') == 'admin'
        except Exception:
            return False


class UserStatsView(APIView):
    """Dashboard stats for admin — counts by role and status."""

    def get(self, request):
        if not self._is_admin(request):
            return Response({"error": "Unauthorized."}, status=403)
        stats = {
            "total": User.objects.count(),
            "pending": User.objects.filter(account_status='pending').count(),
            "active": User.objects.filter(account_status='active').count(),
            "suspended": User.objects.filter(account_status='suspended').count(),
            "rejected": User.objects.filter(account_status='rejected').count(),
            "by_role": {
                "citizen": User.objects.filter(role='citizen').count(),
                "veterinarian": User.objects.filter(role='veterinarian').count(),
                "shelter_admin": User.objects.filter(role='shelter_admin').count(),
                "civic_authority": User.objects.filter(role='civic_authority').count(),
                "admin": User.objects.filter(role='admin').count(),
            }
        }
        return Response(stats)

    def _is_admin(self, request):
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return False
        try:
            payload = decode_token(auth_header.split(' ', 1)[1])
            return payload.get('role') == 'admin'
        except Exception:
            return False

class VetsView(generics.ListAPIView):
    """List all active veterinarians."""
    serializer_class = UserProfileSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['username', 'email', 'veterinarian_profile__clinic_name']

    def get_queryset(self):
        return User.objects.filter(role='veterinarian', account_status='active')


class ChangePasswordDirectView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        from django.db.models import Q
        username_or_email = request.data.get('username')
        new_password = request.data.get('new_password')
        if not username_or_email or not new_password:
            return Response({"error": "Username and new password are required."}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(Q(username__iexact=username_or_email) | Q(email__iexact=username_or_email))
            user.set_password(new_password)
            user.save()
            return Response({"message": "Password changed successfully!"})
        except User.DoesNotExist:
            return Response({"error": "User does not exist."}, status=status.HTTP_404_NOT_FOUND)
        except User.MultipleObjectsReturned:
            return Response({"error": "Multiple users found with this email. Use username instead."}, status=status.HTTP_400_BAD_REQUEST)

class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    
    def get_queryset(self):
        user_id = self.request.user.id
        if not user_id:
             # Fallback for manual token decoding if default auth fails
             auth_header = self.request.headers.get('Authorization', '')
             if auth_header.startswith('Bearer '):
                 token = auth_header.split(' ', 1)[1]
                 try:
                     payload = decode_token(token)
                     user_id = payload['user_id']
                 except: pass
        
        return Notification.objects.filter(recipient_id=user_id).order_by('-created_at')

    @action(detail=False, methods=['post'])
    def clear_all(self, request):
        user_id = self.request.user.id
        if not user_id:
             auth_header = self.request.headers.get('Authorization', '')
             if auth_header.startswith('Bearer '):
                 token = auth_header.split(' ', 1)[1]
                 try:
                     payload = decode_token(token)
                     user_id = payload['user_id']
                 except: pass
        
        if user_id:
            Notification.objects.filter(recipient_id=user_id).delete()
            return Response({'status': 'all notifications cleared'})
        return Response({'error': 'Unauthorized'}, status=401)

    @action(detail=True, methods=['post'])
    def mark_as_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response({'status': 'marked as read'})


# ── Verification Engine API Views ─────────────────────────────────────────────

import re
import hashlib
from .verification_registry import (
    verify_vet_license,
    verify_ngo_darpan,
    verify_municipal_registration,
    verify_owner_pet_binding,
)


class VerifyVetLicenseView(APIView):
    """
    Verification Engine 1: Veterinarian License Verification.
    
    Accepts a license number string, validates its format against
    state veterinary council patterns, and queries the Professional
    Registry lookup index.
    
    Returns AUTHENTICATED (200) or CREDENTIAL_INVALID (400).
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        license_number = request.data.get('license_number', '').strip()

        if not license_number:
            return Response(
                {"error": "KSVC_REGISTRATION_INVALID", "message": "License number is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Format validation: KSVC.Reg.[3-5 Digits]
        pattern = r'^KSVC\.REG\.\d{3,5}$'
        if not re.match(pattern, license_number.upper()):
            return Response(
                {"error": "KSVC_REGISTRATION_INVALID", "message": "Invalid license format. Expected pattern: KSVC.Reg.XXXX (e.g., KSVC.Reg.1234)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        is_valid, details = verify_vet_license(license_number)

        if is_valid:
            return Response(details, status=status.HTTP_200_OK)
        else:
            return Response(details, status=status.HTTP_400_BAD_REQUEST)


class VerifyNGODarpanView(APIView):
    """
    Verification Engine 2: Shelter NGO Darpan ID Verification.
    
    Validates the corporate registration identifier against the
    NGO Darpan regulatory registry. Checks both presence and
    active compliance standing.
    
    Returns VERIFIED (200) or ORGANIZATION_NOT_FOUND/NON_COMPLIANT (400).
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        darpan_id = request.data.get('darpan_id', '').strip()

        if not darpan_id:
            return Response(
                {"error": "ORGANIZATION_NOT_FOUND", "message": "NGO Darpan ID is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Format validation: KL/YYYY/XXXXXXX
        pattern = r'^KL\/\d{4}\/\d{7}$'
        if not re.match(pattern, darpan_id.upper()):
            return Response(
                {"error": "ORGANIZATION_NOT_FOUND", "message": "Invalid Darpan ID format. Expected: KL/YYYY/NNNNNNN (e.g., KL/2026/0123456)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        is_valid, details = verify_ngo_darpan(darpan_id)

        if is_valid:
            return Response(details, status=status.HTTP_200_OK)
        else:
            return Response(details, status=status.HTTP_400_BAD_REQUEST)


class VerifyMunicipalRegistrationView(APIView):
    """
    Verification Engine 3: Municipality Registration Verification.
    
    Confirms that an animal has been officially registered with
    the local municipal corporation. Checks token format, prefix
    for municipality identification, and current validity status.
    
    Returns VERIFIED (200) or REGISTRY_NOT_FOUND/LAPSED (400).
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        municipal_id = request.data.get('municipal_id', '').strip()

        if not municipal_id:
            return Response(
                {"error": "REGISTRY_NOT_FOUND", "message": "Municipal registration ID is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Format validation: MUNICIPALITY-CORP|MUNI|GP-YYYY-NNN
        pattern = r'^[A-Z]+-(CORP|MUNI|GP)-\d{4}-\d+$'
        if not re.match(pattern, municipal_id.upper()):
            return Response(
                {"error": "REGISTRY_NOT_FOUND", "message": "Invalid LSGD municipal ID format. Expected: XXX-CORP-YYYY-NNN (e.g., COCHIN-CORP-2026-04192)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        is_valid, details = verify_municipal_registration(municipal_id)

        if is_valid:
            return Response(details, status=status.HTTP_200_OK)
        else:
            return Response(details, status=status.HTTP_400_BAD_REQUEST)


class VerifyOwnerPetBindingView(APIView):
    """
    Verification Engine 4: Owner-Pet Binding Verification.
    
    The most intricate verification pipeline — cross-validates
    4 distinct credential vectors to prove legal ownership:
    
    Vector 1: Municipal License ID String
    Vector 2: Owner's Government ID (SHA-256 hashed on server)
    Vector 3: Animal's Microchip Serial ID
    Vector 4: Vaccination Batch Serial String
    
    Sequential validation: any single vector failure halts the entire chain.
    
    Returns BINDING_VERIFIED (200) or specific mismatch error (400).
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        municipal_id = request.data.get('municipal_id', '').strip()
        owner_gov_id = request.data.get('owner_gov_id', '').strip()
        microchip_id = request.data.get('microchip_id', '').strip()
        vaccination_batch = request.data.get('vaccination_batch', '').strip()

        # Validate all 4 vectors are present
        missing = []
        if not municipal_id:
            missing.append('Municipal License ID')
        if not owner_gov_id:
            missing.append('Owner Government ID')
        if not microchip_id:
            missing.append('Microchip Serial ID')
        if not vaccination_batch:
            missing.append('Vaccination Batch ID')

        if missing:
            return Response(
                {
                    "error": "INCOMPLETE_VECTORS",
                    "message": f"Missing verification vectors: {', '.join(missing)}",
                    "missing_fields": missing,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Regex sanitization: remove whitespace, hyphens from gov ID, force uppercase
        owner_gov_id_clean = re.sub(r'[\s-]', '', owner_gov_id).upper()
        microchip_id_clean = re.sub(r'[\s-]', '', microchip_id)
        vaccination_batch_clean = re.sub(r'\s', '', vaccination_batch).upper()

        is_valid, details = verify_owner_pet_binding(
            municipal_id, owner_gov_id_clean, microchip_id_clean, vaccination_batch_clean
        )

        if is_valid:
            return Response(details, status=status.HTTP_200_OK)
        else:
            return Response(details, status=status.HTTP_400_BAD_REQUEST)


class OccupiedCivicZonesView(APIView):
    """
    Returns the list of zones/corporations that already have an active
    or pending Civic Authority account.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        occupied_zones = list(
            User.objects.filter(
                role='civic_authority',
                account_status__in=['active', 'pending']
            ).values_list('zone', flat=True).distinct()
        )
        # Filter out empty strings
        occupied_zones = [z for z in occupied_zones if z]
        return Response({"occupied_zones": occupied_zones}, status=status.HTTP_200_OK)

