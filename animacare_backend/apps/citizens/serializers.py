from rest_framework import serializers
from .models import SOSAlert, Pet

class SOSAlertSerializer(serializers.ModelSerializer):
    reporter_name = serializers.CharField(source='reporter.username', read_only=True)
    assigned_shelter_name = serializers.CharField(source='assigned_shelter.name', read_only=True)
    
    class Meta:
        model = SOSAlert
        fields = ['id', 'reporter', 'reporter_name', 'animal_description', 'location', 'timestamp', 'status', 'assigned_shelter', 'assigned_shelter_name', 'is_resolved']

class PetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pet
        fields = '__all__'
        read_only_fields = ('owner',)
