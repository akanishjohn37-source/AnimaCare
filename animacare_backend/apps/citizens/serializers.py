from rest_framework import serializers
from .models import SOSAlert, Pet

class SOSAlertSerializer(serializers.ModelSerializer):
    class Meta:
        model = SOSAlert
        fields = '__all__'

class PetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pet
        fields = '__all__'
        read_only_fields = ('owner',)
