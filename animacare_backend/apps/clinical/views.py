from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from .models import ConsultationLog, VaccinationLog, DigitalPrescription, DiagnosticMedia, Appointment, SelfReportedRecord
from .serializers import (
    ConsultationLogSerializer, VaccinationLogSerializer, 
    DigitalPrescriptionSerializer, DiagnosticMediaSerializer, 
    AppointmentSerializer, SelfReportedRecordSerializer
)
from apps.users.models import Notification

class AppointmentViewSet(viewsets.ModelViewSet):
    queryset = Appointment.objects.all()
    serializer_class = AppointmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'veterinarian':
            return self.queryset.filter(vet=user)
        elif user.role == 'citizen':
            return self.queryset.filter(owner=user)
        return self.queryset.all()

    def perform_create(self, serializer):
        appointment = serializer.save(owner=self.request.user)
        # Notify the Veterinarian
        Notification.objects.create(
            recipient=appointment.vet,
            title="New Appointment Booked",
            message=f"Citizen {self.request.user.username} has booked an appointment for {appointment.pet.name} ({appointment.pet.species}) on {appointment.date}."
        )

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        appointment = self.get_object()
        if appointment.vet != request.user:
            return Response({"error": "Only the assigned vet can complete this appointment."}, status=403)
        
        appointment.status = 'Completed'
        appointment.save()
        return Response({"status": "Appointment marked as completed."})

class ConsultationLogViewSet(viewsets.ModelViewSet):
    queryset = ConsultationLog.objects.all()
    serializer_class = ConsultationLogSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        # Verify the vet has an appointment with this pet
        pet = serializer.validated_data['pet']
        has_appt = Appointment.objects.filter(pet=pet, vet=self.request.user, status__in=['Scheduled', 'Completed']).exists()
        
        if not has_appt and self.request.user.role != 'admin':
            # We still allow creation but maybe warn or log it. 
            # In a strict system, we might block this.
            pass
            
        consultation = serializer.save(attending_vet=self.request.user)
        
        # Handle media if provided
        media_url = self.request.data.get('media_url')
        if media_url:
            DiagnosticMedia.objects.create(
                consultation=consultation,
                media_url=media_url,
                media_type='image/jpeg',  # Default for now
                diagnostic_tags=["Clinical Upload"]
            )
        
        # Notify the Owner
        Notification.objects.create(
            recipient=pet.owner,
            title="Medical Record Updated",
            message=f"Dr. {self.request.user.username} has added a new consultation log for {pet.name}."
        )

class SelfReportedRecordViewSet(viewsets.ModelViewSet):
    queryset = SelfReportedRecord.objects.all()
    serializer_class = SelfReportedRecordSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(pet__owner=self.request.user)

