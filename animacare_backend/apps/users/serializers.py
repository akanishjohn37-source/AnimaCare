from rest_framework import serializers
from django.contrib.auth import authenticate
from django.utils import timezone
from .models import User, VeterinarianProfile, ShelterAdminProfile, CivicAuthorityProfile, Notification


# ── Sub-profile serializers ──────────────────────────────────────────────────

class VeterinarianProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = VeterinarianProfile
        exclude = ['user']


class ShelterAdminProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShelterAdminProfile
        exclude = ['user']


class CivicAuthorityProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = CivicAuthorityProfile
        exclude = ['user']



# ── Registration ─────────────────────────────────────────────────────────────

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)

    # Role-specific optional fields
    veterinarian_profile = VeterinarianProfileSerializer(required=False)
    shelter_profile = ShelterAdminProfileSerializer(required=False)
    civic_profile = CivicAuthorityProfileSerializer(required=False)
    farm_locations = serializers.ListField(
        child=serializers.CharField(max_length=255),
        required=False,
        write_only=True
    )

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'password', 'confirm_password', 'role', 'phone_number', 'address', 'zone',
            'veterinarian_profile', 'shelter_profile', 'civic_profile', 'farm_locations',
        ]

    def validate(self, data):
        if data['password'] != data.pop('confirm_password'):
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})

        role = data.get('role', 'citizen')
        if role not in dict(User.ROLE_CHOICES):
            raise serializers.ValidationError({"role": "Invalid role selected."})

        # Admins cannot self-register through public API
        if role == 'admin':
            raise serializers.ValidationError({"role": "Admin accounts must be created by a super-administrator."})

        if role == 'civic_authority':
            zone = data.get('zone')
            if not zone:
                raise serializers.ValidationError({"zone": "Jurisdiction zone is required for civic authority accounts."})
            already_exists = User.objects.filter(
                role='civic_authority',
                account_status__in=['active', 'pending'],
                zone=zone
            ).exists()
            if already_exists:
                raise serializers.ValidationError({"zone": f"An active or pending Civic Authority already exists for {zone}."})

        return data

    def create(self, validated_data):
        vet_data = validated_data.pop('veterinarian_profile', None)
        shelter_data = validated_data.pop('shelter_profile', None)
        civic_data = validated_data.pop('civic_profile', None)
        farm_locations_data = validated_data.pop('farm_locations', [])

        role = validated_data.get('role', 'citizen')
        # Citizens are auto-approved; all others require admin approval
        account_status = 'active' if role == 'citizen' else 'pending'

        user = User.objects.create_user(
            **validated_data,
            account_status=account_status,
            requires_approval=(role != 'citizen'),
        )

        if role == 'veterinarian' and vet_data:
            VeterinarianProfile.objects.create(user=user, **vet_data)
        elif role == 'shelter_admin' and shelter_data:
            ShelterAdminProfile.objects.create(user=user, **shelter_data)
            # Create corresponding Shelter object
            from apps.shelter.models import Shelter
            Shelter.objects.create(
                name=shelter_data.get('shelter_name', ''),
                tax_id=shelter_data.get('shelter_registration_number', ''),
                address=shelter_data.get('shelter_address', ''),
                location="Pending",
                admin=user,
                is_verified=False
            )
        elif role == 'civic_authority' and civic_data:
            CivicAuthorityProfile.objects.create(user=user, **civic_data)

        if role == 'citizen' and farm_locations_data:
            from apps.citizens.models import FarmLocation
            for name in farm_locations_data:
                if name.strip():
                    FarmLocation.objects.create(owner=user, name=name.strip())

        return user


# ── Login ─────────────────────────────────────────────────────────────────────

class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        from django.db.models import Q
        username_or_email = data['username']
        password = data['password']
        
        user = None
        # Try finding the user by either username or email
        try:
            user_obj = User.objects.get(Q(username__iexact=username_or_email) | Q(email__iexact=username_or_email))
            # Now authenticate using the exact username found
            user = authenticate(username=user_obj.username, password=password)
        except User.DoesNotExist:
            pass
        except User.MultipleObjectsReturned:
            pass

        if not user:
            raise serializers.ValidationError("Invalid credentials. Please try again.")
        if not user.is_active:
            raise serializers.ValidationError("Your account has been deactivated.")
        if user.account_status == 'pending':
            raise serializers.ValidationError(
                "Your account is pending approval by an administrator. "
                "You will receive a notification once approved."
            )
        if user.account_status == 'rejected':
            raise serializers.ValidationError(
                "Your registration was rejected. Please contact support."
            )
        if user.account_status == 'suspended':
            raise serializers.ValidationError(
                "Your account has been suspended. Please contact support."
            )
        data['user'] = user
        return data


# ── User Profile (read) ───────────────────────────────────────────────────────

class UserProfileSerializer(serializers.ModelSerializer):
    veterinarian_profile = VeterinarianProfileSerializer(read_only=True)
    shelter_profile = ShelterAdminProfileSerializer(read_only=True)
    civic_profile = CivicAuthorityProfileSerializer(read_only=True)
    full_name = serializers.SerializerMethodField()
    role_display = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()
    farm_locations = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'full_name',
            'role', 'role_display', 'account_status', 'status_display',
            'phone_number', 'address', 'zone', 'profile_picture',
            'date_joined', 'approved_at',
            'veterinarian_profile', 'shelter_profile', 'civic_profile',
            'farm_locations',
        ]

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username

    def get_role_display(self, obj):
        return obj.get_role_display()

    def get_status_display(self, obj):
        return obj.get_account_status_display()

    def get_farm_locations(self, obj):
        locations = [{"id": loc.id, "name": loc.name} for loc in obj.farm_locations.all()]
        names = {loc["name"] for loc in locations}
        if "Heven Root" not in names:
            locations.append({"id": "default-heven-root", "name": "Heven Root"})
        if "Golden Vally" not in names:
            locations.append({"id": "default-golden-vally", "name": "Golden Vally"})
        return locations


# ── Admin: User list for approval panel ──────────────────────────────────────

class UserAdminSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    role_display = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()
    veterinarian_profile = VeterinarianProfileSerializer(read_only=True)
    shelter_profile = ShelterAdminProfileSerializer(read_only=True)
    civic_profile = CivicAuthorityProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'full_name', 'role', 'role_display',
            'account_status', 'status_display', 'phone_number', 'zone',
            'date_joined', 'approval_note', 'approved_at',
            'veterinarian_profile', 'shelter_profile', 'civic_profile',
        ]

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username

    def get_role_display(self, obj):
        return obj.get_role_display()

    def get_status_display(self, obj):
        return obj.get_account_status_display()

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'
