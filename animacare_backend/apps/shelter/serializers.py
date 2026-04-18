from rest_framework import serializers
from .models import AnimalInventory, Shelter, AdoptionApplication

class ShelterSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shelter
        fields = '__all__'

class AnimalInventorySerializer(serializers.ModelSerializer):
    class Meta:
        model = AnimalInventory
        fields = '__all__'

class AdoptionApplicationSerializer(serializers.ModelSerializer):
    animal_detail = AnimalInventorySerializer(source='animal', read_only=True)
    applicant_name = serializers.CharField(source='applicant.username', read_only=True)

    class Meta:
        model = AdoptionApplication
        fields = '__all__'
