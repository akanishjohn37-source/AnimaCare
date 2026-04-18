from rest_framework import serializers
from .models import AnimalInventory, LifestyleAssessment, AICompatibilityScore, Pet, MedicalRecord, HealthRiskFlag

class LifestyleAssessmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = LifestyleAssessment
        fields = '__all__'

class AnimalInventorySerializer(serializers.ModelSerializer):
    class Meta:
        model = AnimalInventory
        fields = '__all__'

class AICompatibilityScoreSerializer(serializers.ModelSerializer):
    animal = AnimalInventorySerializer(read_only=True)

    class Meta:
        model = AICompatibilityScore
        fields = '__all__'

class HealthRiskFlagSerializer(serializers.ModelSerializer):
    class Meta:
        model = HealthRiskFlag
        fields = '__all__'

class MedicalRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = MedicalRecord
        fields = '__all__'

class PetSerializer(serializers.ModelSerializer):
    medical_records = MedicalRecordSerializer(many=True, read_only=True)
    health_flags = serializers.SerializerMethodField()

    class Meta:
        model = Pet
        fields = ['id', 'name', 'breed', 'age_months', 'current_weight_kg', 'medical_records', 'health_flags']

    def get_health_flags(self, obj):
        flags = HealthRiskFlag.objects.filter(pet=obj, is_active=True)
        return HealthRiskFlagSerializer(flags, many=True).data
