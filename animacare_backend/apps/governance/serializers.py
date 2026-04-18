from rest_framework import serializers
from apps.users.models import User
from apps.shelter.models import AnimalInventory, Shelter
from apps.governance.models import AuditTrail

class UserAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'account_status', 'medical_license_number', 'is_active']

class AuditTrailSerializer(serializers.ModelSerializer):
    admin_user_username = serializers.CharField(source='admin_user.username', read_only=True)
    class Meta:
        model = AuditTrail
        fields = '__all__'
