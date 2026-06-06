from rest_framework import serializers
from .models import (
    ConsultationLog, VaccinationLog, DigitalPrescription, DiagnosticMedia,
    Appointment, SelfReportedRecord, VaccinationSchedule, VaccinationScheduleItem,
    AppointmentSlot, VetScheduleDay
)
from apps.citizens.serializers import PetSerializer, LivestockSerializer

class AppointmentSlotSerializer(serializers.ModelSerializer):
    vet_name = serializers.CharField(source='vet.username', read_only=True)
    available_slots = serializers.SerializerMethodField()

    class Meta:
        model = AppointmentSlot
        fields = '__all__'
        read_only_fields = ['vet', 'booked_count']

    def get_available_slots(self, obj):
        return max(0, obj.max_appointments - obj.booked_count)

class VetScheduleDaySerializer(serializers.ModelSerializer):
    vet_name = serializers.CharField(source='vet.username', read_only=True)

    class Meta:
        model = VetScheduleDay
        fields = '__all__'
        read_only_fields = ['vet']

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
    livestock_detail = LivestockSerializer(source='livestock', read_only=True)
    vet_name = serializers.CharField(source='vet.username', read_only=True)
    owner_name = serializers.SerializerMethodField()
    slot_detail = AppointmentSlotSerializer(source='slot', read_only=True)

    class Meta:
        model = Appointment
        fields = '__all__'
        read_only_fields = []

    def get_owner_name(self, obj):
        owner = obj.owner
        return owner.username if owner else None

    def validate(self, attrs):
        slot = attrs.get('slot')
        if slot:
            if attrs.get('vet') and attrs.get('vet') != slot.vet:
                raise serializers.ValidationError("Selected veterinarian does not match the slot's veterinarian.")
            if slot.booked_count >= slot.max_appointments:
                raise serializers.ValidationError("This appointment slot is already fully booked.")
            if not slot.is_active:
                raise serializers.ValidationError("This slot is inactive.")

            from django.utils import timezone
            from datetime import datetime
            slot_datetime = timezone.make_aware(datetime.combine(slot.date, slot.start_time))
            if slot_datetime < timezone.localtime(timezone.now()):
                raise serializers.ValidationError("This slot has already expired.")

            if VetScheduleDay.objects.filter(vet=slot.vet, date=slot.date, status='absent').exists():
                raise serializers.ValidationError("The veterinarian is absent on this day.")

            attrs['vet'] = slot.vet
            attrs['date'] = slot_datetime

        return attrs

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
