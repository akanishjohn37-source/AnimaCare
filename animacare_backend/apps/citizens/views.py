from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import SOSAlert, Pet
from .serializers import SOSAlertSerializer, PetSerializer
from apps.shelter.models import Shelter

class SOSAlertViewSet(viewsets.ModelViewSet):
    queryset = SOSAlert.objects.all()
    serializer_class = SOSAlertSerializer

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
