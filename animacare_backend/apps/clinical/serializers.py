from rest_framework import serializers
from .models import ConsultationLog, VaccinationLog, DigitalPrescription, DiagnosticMedia, Appointment, SelfReportedRecord, VaccinationSchedule, VaccinationScheduleItem
from apps.citizens.serializers import PetSerializer

class VaccinationLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = VaccinationLog
        fields = '__all__'

class DigitalPrescriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = DigitalPrescription
        fields = '__all__'

class DiagnosticMediaSerializer(serializers.ModelSerializer):
    class Meta:
        model = DiagnosticMedia
        fields = '__all__'

class ConsultationLogSerializer(serializers.ModelSerializer):
    vaccinations = VaccinationLogSerializer(many=True, read_only=True)
    prescriptions = DigitalPrescriptionSerializer(many=True, read_only=True)
    media = DiagnosticMediaSerializer(many=True, read_only=True)
    vet_name = serializers.CharField(source='attending_vet.username', read_only=True)

    class Meta:
        model = ConsultationLog
        fields = '__all__'
        read_only_fields = ['attending_vet']


class AppointmentSerializer(serializers.ModelSerializer):
    pet_detail = PetSerializer(source='pet', read_only=True)
    vet_name = serializers.CharField(source='vet.username', read_only=True)
    owner_name = serializers.CharField(source='owner.username', read_only=True)

    class Meta:
        model = Appointment
        fields = '__all__'
        read_only_fields = ['owner']

class SelfReportedRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = SelfReportedRecord
        fields = '__all__'


class VaccinationScheduleItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = VaccinationScheduleItem
        fields = '__all__'


class VaccinationScheduleSerializer(serializers.ModelSerializer):
    items = VaccinationScheduleItemSerializer(many=True, read_only=True)

    class Meta:
        model = VaccinationSchedule
        fields = '__all__'
        read_only_fields = ['owner', 'track']
