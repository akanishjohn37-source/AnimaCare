from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from .models import SOSAlert, Pet
from .serializers import SOSAlertSerializer, PetSerializer
from apps.shelter.models import Shelter

class SOSAlertViewSet(viewsets.ModelViewSet):
    queryset = SOSAlert.objects.all()
    serializer_class = SOSAlertSerializer

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def nearby(self, request):
        # Return all unresolved alerts OR alerts accepted by this specific shelter
        alerts = SOSAlert.objects.filter(is_resolved=False).order_by('-timestamp')
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

    def create(self, request, *args, **kwargs):
        # Expecting lat, lng, animal_description, reporter
        data = request.data
        lat = data.get('lat')
        lng = data.get('lng')
        
        if lat and lng:
            location = f"{lat},{lng}"
            sos = SOSAlert.objects.create(
                reporter_id=data.get('reporter'),
                animal_description=data.get('animal_description'),
                location=location
            )
            # Find shelters nearby (dummy mock for non-GIS local dev)
            nearby_shelters = Shelter.objects.filter(is_verified=True)[:5]
            
            shelters_contacted = [s.id for s in nearby_shelters]
            # In a real scenario, we send websocket signals to those shelters
            
            return Response({'message': 'SOS routed successfully.', 'contacted_shelters': shelters_contacted}, status=status.HTTP_201_CREATED)
        else:
            return Response({'error': 'Missing coordinates.'}, status=status.HTTP_400_BAD_REQUEST)

class PetViewSet(viewsets.ModelViewSet):
    queryset = Pet.objects.all()
    serializer_class = PetSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Only return pets belonging to the logged-in user
        if getattr(self, 'swagger_fake_view', False):
            return self.queryset.none()
        return self.queryset.filter(owner=self.request.user)

    def perform_create(self, serializer):
        # Automatically assign the logged-in user as the owner
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=['get'])
    def medical_report(self, request, pk=None):
        pet = self.get_object()
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
        from apps.clinical.serializers import ConsultationLogSerializer, SelfReportedRecordSerializer
        consultations = pet.consultations.all().order_by('-date')
        self_reports = pet.self_reports.all().order_by('-date')
        
        return Response({
            "pet": PetSerializer(pet).data,
            "medical_history": ConsultationLogSerializer(consultations, many=True).data,
            "self_reports": SelfReportedRecordSerializer(self_reports, many=True).data
        })

