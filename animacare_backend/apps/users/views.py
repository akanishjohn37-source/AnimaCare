import jwt
import datetime
from django.conf import settings
from rest_framework import viewsets
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


def generate_token(user):
    payload = {
        'user_id': user.id,
        'username': user.username,
        'role': user.role,
        'account_status': user.account_status,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=JWT_EXP_HOURS),
        'iat': datetime.datetime.utcnow(),
    }
    return jwt.encode(payload, SECRET, algorithm='HS256')


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
                token = generate_token(user)
                return Response({
                    "message": "Registration successful! Welcome to AnimaCare.",
                    "token": token,
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
            token = generate_token(user)
            return Response({
                "message": f"Welcome back, {user.get_full_name() or user.username}!",
                "token": token,
                "user": UserProfileSerializer(user).data,
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


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

class PendingUsersView(APIView):
    """List users awaiting approval — admin only."""

    def get(self, request):
        if not self._is_admin(request):
            return Response({"error": "Unauthorized."}, status=403)
        from .serializers import UserAdminSerializer
        pending = User.objects.filter(account_status='pending').order_by('-date_joined')
        return Response(UserAdminSerializer(pending, many=True).data)

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
        else:
            return Response({"error": "Invalid action. Use 'approve', 'reject', or 'suspend'."}, status=400)

    def _is_admin(self, request):
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return False
        try:
            payload = decode_token(auth_header.split(' ', 1)[1])
            return payload.get('role') == 'admin'
        except Exception:
            return False


class AllUsersView(APIView):
    """All users list for admin panel."""

    def get(self, request):
        if not self._is_admin(request):
            return Response({"error": "Unauthorized."}, status=403)
        from .serializers import UserAdminSerializer
        role_filter = request.query_params.get('role', None)
        status_filter = request.query_params.get('status', None)
        qs = User.objects.all().order_by('-date_joined')
        if role_filter:
            qs = qs.filter(role=role_filter)
        if status_filter:
            qs = qs.filter(account_status=status_filter)
        return Response(UserAdminSerializer(qs, many=True).data)

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

class VetsView(APIView):
    """List all active veterinarians."""
    def get(self, request):
        vets = User.objects.filter(role='veterinarian', account_status='active')
        return Response(UserProfileSerializer(vets, many=True).data)


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

    @action(detail=True, methods=['post'])
    def mark_as_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response({'status': 'marked as read'})
