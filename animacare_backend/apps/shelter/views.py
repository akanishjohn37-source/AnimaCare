from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import AnimalInventory, Shelter, AdoptionApplication
from .serializers import AnimalInventorySerializer, ShelterSerializer, AdoptionApplicationSerializer

class ShelterViewSet(viewsets.ModelViewSet):
    queryset = Shelter.objects.all()
    serializer_class = ShelterSerializer

class AnimalInventoryViewSet(viewsets.ModelViewSet):
    queryset = AnimalInventory.objects.all()
    serializer_class = AnimalInventorySerializer

    def get_queryset(self):
        queryset = AnimalInventory.objects.all()
        # If requested by a citizen (assuming no auth or standard user), filter them
        # For simplicity, we filter by params
        is_citizen = self.request.query_params.get('citizen_view')
        if is_citizen == 'true':
            queryset = queryset.filter(is_adopted=False, is_available=True)
        return queryset

class AdoptionApplicationViewSet(viewsets.ModelViewSet):
    queryset = AdoptionApplication.objects.all()
    serializer_class = AdoptionApplicationSerializer

    @action(detail=True, methods=['patch'])
    def update_status(self, request, pk=None):
        application = self.get_object()
        new_status = request.data.get('status')
        if new_status in dict(AdoptionApplication.STATUS_CHOICES):
            application.status = new_status
            application.save()
            # In a real app we might trigger a websocket notification or email here
            return Response({'status': 'Status updated'})
        return Response({'error': 'Invalid status'}, status=400)
