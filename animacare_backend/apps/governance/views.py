from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import get_user_model
from apps.users.models import User
from apps.shelter.models import AnimalInventory
from apps.governance.models import AuditTrail
from apps.governance.serializers import UserAdminSerializer, AuditTrailSerializer

class PendingUsersView(APIView):
    def get(self, request):
        if not request.user.is_superuser:
            return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
        users = User.objects.filter(account_status='Pending')
        serializer = UserAdminSerializer(users, many=True)
        return Response(serializer.data)

class ApproveUserView(APIView):
    def post(self, request, user_id):
        if not request.user.is_superuser:
            return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
        try:
            user = User.objects.get(id=user_id)
            user.account_status = 'Active'
            user.save()
            AuditTrail.objects.create(
                admin_user=request.user,
                action_type="USER_APPROVAL",
                description=f"Admin ID {request.user.id} approved user ID {user.id} ({user.role})"
            )
            return Response({"message": "User approved successfully"})
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

class SuspendListingView(APIView):
    def post(self, request, animal_id):
        if not request.user.is_superuser:
            return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
        try:
            animal = AnimalInventory.objects.get(id=animal_id)
            animal.is_suspended = True
            animal.save()
            AuditTrail.objects.create(
                admin_user=request.user,
                action_type="LISTING_SUSPENSION",
                description=f"Admin ID {request.user.id} suspended animal ID {animal.id}"
            )
            return Response({"message": "Listing suspended successfully"})
        except AnimalInventory.DoesNotExist:
            return Response({"error": "Animal not found"}, status=status.HTTP_404_NOT_FOUND)

class AuditLogsView(APIView):
    def get(self, request):
        if not request.user.is_superuser:
            return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
        logs = AuditTrail.objects.order_by('-timestamp')
        serializer = AuditTrailSerializer(logs, many=True)
        return Response(serializer.data)

class SystemHealthView(APIView):
    def get(self, request):
        if not request.user.is_superuser:
            return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
        
        # Mock metrics for dashboard
        return Response({
            "metrics": {
                "active_users": User.objects.filter(is_active=True).count(),
                "pending_approvals": User.objects.filter(account_status='Pending').count(),
                "suspended_listings": AnimalInventory.objects.filter(is_suspended=True).count(),
                "api_latency_ms": 42,
                "s3_storage_gb": 12.5,
                "db_health": "Optimal"
            }
        })
