from rest_framework import viewsets, status, filters
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from .models import SOSAlert, Pet, Livestock
from .serializers import SOSAlertSerializer, PetSerializer, LivestockSerializer
from apps.shelter.models import Shelter

class SOSAlertViewSet(viewsets.ModelViewSet):
    queryset = SOSAlert.objects.all()
    serializer_class = SOSAlertSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['status', 'is_resolved']
    ordering_fields = ['timestamp']

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def nearby(self, request):
        # Return all unresolved alerts OR alerts accepted by this specific shelter
        alerts = SOSAlert.objects.filter(is_resolved=False, alert_type='rescue').order_by('-timestamp')
        serializer = self.get_serializer(alerts, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def accept_mission(self, request, pk=None):
        sos = self.get_object()
        if sos.status != 'Pending':
            return Response({'error': 'Mission already accepted by another unit.'}, status=400)
        
        # Link to the admin's shelter
        try:
            shelter = Shelter.objects.get(admin=request.user)
            sos.status = 'Accepted'
            sos.assigned_shelter = shelter
            sos.save()
            return Response({'message': 'Mission Accepted. GPS Lock engaged.'})
        except Shelter.DoesNotExist:
            return Response({'error': 'Unauthorized: No shelter linked to this admin.'}, status=403)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def complete_mission(self, request, pk=None):
        sos = self.get_object()
        shelter = Shelter.objects.get(admin=request.user)
        
        if sos.assigned_shelter != shelter:
            return Response({'error': 'Only the assigned shelter can complete this mission.'}, status=403)
            
        sos.status = 'Resolved'
        sos.is_resolved = True
        sos.save()
        return Response({'message': 'Rescue Mission Complete. Record Archived.'})

    def destroy(self, request, *args, **kwargs):
        sos = self.get_object()
        
        # In DRF, request.data inside DELETE might not be populated in some versions if it's sent as body,
        # but let's try to grab it from request.data or request.GET.
        reason = request.data.get('reason', '') or request.GET.get('reason', '')
        details = request.data.get('details', '') or request.GET.get('details', '')
        
        from apps.users.models import Notification
        
        if sos.reporter:
            title = "Alert Removed"
            msg = "Your SOS alert was removed by the Civic Authority."
            
            if reason == 'false_news':
                title = "Alert Removed: False News"
                msg = "Your SOS alert was classified as a hoax or false news and removed."
            elif reason == 'inappropriate':
                title = "Alert Removed: Inappropriate"
                msg = "Your SOS alert was removed for containing inappropriate content."
            elif reason == 'wrong_location':
                title = "Alert Removed: Location Error"
                msg = "Your alert was removed due to an invalid or unverifiable location."
            elif reason == 'no_evidence':
                title = "Alert Removed: No Evidence"
                msg = "Authorities found no evidence at the location. The alert was removed."
            elif reason == 'resolved':
                title = "Alert Handled & Resolved"
                msg = "Your alert has been successfully handled and resolved by the Civic Authority."
            
            if details:
                msg += f" Additional details: {details}"
                
            Notification.objects.create(
                recipient=sos.reporter,
                title=title,
                message=msg
            )
            
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def cancel_mission(self, request, pk=None):
        sos = self.get_object()
        try:
            shelter = Shelter.objects.get(admin=request.user)
            if sos.assigned_shelter != shelter:
                return Response({'error': 'You can only cancel missions assigned to your shelter.'}, status=403)
            
            sos.status = 'Pending'
            sos.assigned_shelter = None
            sos.save()
            return Response({'message': 'Mission Canceled. Alert is now available to other responders.'})
        except Shelter.DoesNotExist:
            return Response({'error': 'Unauthorized: No shelter linked to this admin.'}, status=403)

    def create(self, request, *args, **kwargs):
        # Expecting lat, lng, animal_description, reporter
        data = request.data
        lat = data.get('lat')
        lng = data.get('lng')
        
        alert_type = data.get('alert_type', 'rescue')
        if lat and lng:
            location = f"{lat},{lng}"
            sos = SOSAlert.objects.create(
                reporter_id=data.get('reporter'),
                animal_description=data.get('animal_description'),
                location=location,
                alert_type=alert_type
            )
            # Find shelters nearby (dummy mock for non-GIS local dev)
            nearby_shelters = Shelter.objects.filter(is_verified=True)[:5]
            
            shelters_contacted = [s.id for s in nearby_shelters]
            
            # Send websocket signal to the shelters group
            from asgiref.sync import async_to_sync
            from channels.layers import get_channel_layer
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                'shelters_group',
                {
                    'type': 'sos_alert',
                    'alert_data': {
                        'id': sos.id,
                        'animal_description': sos.animal_description,
                        'location': sos.location,
                        'timestamp': str(sos.timestamp),
                        'status': sos.status,
                        'alert_type': sos.alert_type
                    }
                }
            )
            
            return Response({'message': 'SOS routed successfully.', 'contacted_shelters': shelters_contacted}, status=status.HTTP_201_CREATED)
        else:
            return Response({'error': 'Missing coordinates.'}, status=status.HTTP_400_BAD_REQUEST)

class PetViewSet(viewsets.ModelViewSet):
    queryset = Pet.objects.all()
    serializer_class = PetSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['species']
    search_fields = ['name', 'breed', 'species']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return self.queryset.none()
        # Vets can see all pets; citizens only see their own
        if self.request.user.role == 'veterinarian':
            return self.queryset.all()
        return self.queryset.filter(owner=self.request.user)

    def perform_create(self, serializer):
        # Automatically assign the logged-in user as the owner
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=['get'])
    def medical_report(self, request, pk=None):
        from django.shortcuts import get_object_or_404
        pet = get_object_or_404(Pet, pk=pk)
        user = request.user
        
        # Owners can always see their pets
        is_owner = pet.owner == user
        # Veterinarians can see if they have an appointment
        from apps.clinical.models import Appointment
        has_appointment = Appointment.objects.filter(
            pet=pet, 
            vet=user, 
            status__in=['Scheduled', 'Completed']
        ).exists()
        
        if not is_owner and not has_appointment and user.role != 'admin':
            return Response({"error": "Unauthorized access to medical records."}, status=403)
        
        # Fetch detailed history
        from apps.clinical.serializers import ConsultationLogSerializer, SelfReportedRecordSerializer, VaccinationScheduleSerializer
        from apps.clinical.models import VaccinationSchedule, VaccinationScheduleItem
        from datetime import date
        
        consultations = pet.consultations.all().order_by('-date')
        self_reports = pet.self_reports.all().order_by('-date')
        
        # Vaccination schedules for this pet
        vacc_schedules = VaccinationSchedule.objects.filter(pet=pet).order_by('-created_at')
        
        # Upcoming vaccine alerts (next 90 days, not completed)
        today = date.today()
        from datetime import timedelta
        upcoming_items = VaccinationScheduleItem.objects.filter(
            schedule__pet=pet,
            is_completed=False,
            scheduled_date__gte=today,
            scheduled_date__lte=today + timedelta(days=90)
        ).order_by('scheduled_date')[:10]
        
        upcoming_alerts = []
        for item in upcoming_items:
            days_until = (item.scheduled_date - today).days
            upcoming_alerts.append({
                'id': item.id,
                'schedule_id': item.schedule_id,
                'title': item.title,
                'description': item.description,
                'item_type': item.item_type,
                'scheduled_date': item.scheduled_date.isoformat(),
                'days_until': days_until,
                'is_urgent': days_until <= 7,
            })
        
        return Response({
            "pet": PetSerializer(pet).data,
            "medical_history": ConsultationLogSerializer(consultations, many=True).data,
            "self_reports": SelfReportedRecordSerializer(self_reports, many=True).data,
            "vaccination_schedules": VaccinationScheduleSerializer(vacc_schedules, many=True).data,
            "upcoming_vaccines": upcoming_alerts,
        })

class LivestockViewSet(viewsets.ModelViewSet):
    queryset = Livestock.objects.all()
    serializer_class = LivestockSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['livestock_type']
    search_fields = ['name', 'livestock_type']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return self.queryset.none()
        if self.request.user.role == 'veterinarian':
            return self.queryset.all()
        return self.queryset.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=['get'])
    def medical_report(self, request, pk=None):
        from django.shortcuts import get_object_or_404
        livestock = get_object_or_404(Livestock, pk=pk)
        user = request.user
        
        # Owners can always see their livestock
        is_owner = livestock.owner == user
        # Veterinarians can see if they have an appointment
        from apps.clinical.models import Appointment
        has_appointment = Appointment.objects.filter(
            livestock=livestock, 
            vet=user, 
            status__in=['Scheduled', 'Completed']
        ).exists()
        
        if not is_owner and not has_appointment and user.role != 'admin':
            return Response({"error": "Unauthorized access to medical records."}, status=403)
        
        # Fetch detailed history
        from apps.clinical.serializers import ConsultationLogSerializer, SelfReportedRecordSerializer, VaccinationScheduleSerializer
        from apps.clinical.models import VaccinationSchedule, VaccinationScheduleItem
        from datetime import date
        
        consultations = livestock.consultations.all().order_by('-date')
        self_reports = livestock.self_reports.all().order_by('-date')
        
        # Vaccination schedules for this livestock
        vacc_schedules = VaccinationSchedule.objects.filter(livestock=livestock).order_by('-created_at')
        
        # Upcoming vaccine alerts (next 90 days, not completed)
        today = date.today()
        from datetime import timedelta
        upcoming_items = VaccinationScheduleItem.objects.filter(
            schedule__livestock=livestock,
            is_completed=False,
            scheduled_date__gte=today,
            scheduled_date__lte=today + timedelta(days=90)
        ).order_by('scheduled_date')[:10]
        
        upcoming_alerts = []
        for item in upcoming_items:
            days_until = (item.scheduled_date - today).days
            upcoming_alerts.append({
                'id': item.id,
                'schedule_id': item.schedule_id,
                'title': item.title,
                'description': item.description,
                'item_type': item.item_type,
                'scheduled_date': item.scheduled_date.isoformat(),
                'days_until': days_until,
                'is_urgent': days_until <= 7,
            })
        
        return Response({
            "pet": LivestockSerializer(livestock).data,
            "medical_history": ConsultationLogSerializer(consultations, many=True).data,
            "self_reports": SelfReportedRecordSerializer(self_reports, many=True).data,
            "vaccination_schedules": VaccinationScheduleSerializer(vacc_schedules, many=True).data,
            "upcoming_vaccines": upcoming_alerts,
        })
