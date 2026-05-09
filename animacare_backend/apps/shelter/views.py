from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import AnimalInventory, Shelter, AdoptionApplication
from .serializers import AnimalInventorySerializer, ShelterSerializer, AdoptionApplicationSerializer
from apps.users.models import Notification

class ShelterViewSet(viewsets.ModelViewSet):
    queryset = Shelter.objects.all()
    serializer_class = ShelterSerializer

class AnimalInventoryViewSet(viewsets.ModelViewSet):
    queryset = AnimalInventory.objects.all()
    serializer_class = AnimalInventorySerializer

    def get_queryset(self):
        user = self.request.user
        queryset = AnimalInventory.objects.all()
        
        # If requested by a citizen (assuming no auth or standard user), filter them
        is_citizen = self.request.query_params.get('citizen_view')
        if is_citizen == 'true':
            queryset = queryset.filter(is_adopted=False, is_available=True)
        elif user.is_authenticated and user.role == 'shelter_admin':
            # Admins see only their shelter's inventory
            queryset = queryset.filter(shelter__admin=user)
            
        return queryset

    def perform_create(self, serializer):
        # Automatically assign the shelter belonging to the logged-in admin
        try:
            shelter = self.request.user.authorized_shelter
            serializer.save(shelter=shelter)
        except AttributeError:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({"error": "Your account is not linked to an authorized shelter. Please contact support."})

class AdoptionApplicationViewSet(viewsets.ModelViewSet):
    queryset = AdoptionApplication.objects.all()
    serializer_class = AdoptionApplicationSerializer

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return AdoptionApplication.objects.none()
            
        if user.role == 'shelter_admin':
            return AdoptionApplication.objects.filter(animal__shelter__admin=user)
        elif user.role == 'citizen':
            return AdoptionApplication.objects.filter(applicant=user)
        return AdoptionApplication.objects.all()

    def perform_create(self, serializer):
        application = serializer.save(applicant=self.request.user)
        # Notify the Shelter Admin
        shelter_admin = application.animal.shelter.admin
        Notification.objects.create(
            recipient=shelter_admin,
            title="New Adoption Request!",
            message=f"Citizen {self.request.user.username} has applied to adopt {application.animal.name}."
        )

    @action(detail=True, methods=['patch'])
    def update_status(self, request, pk=None):
        application = self.get_object()
        new_status = request.data.get('status')
        if new_status in dict(AdoptionApplication.STATUS_CHOICES):
            application.status = new_status
            application.save()
            
            # Notify the Applicant
            Notification.objects.create(
                recipient=application.applicant,
                title="Adoption Update",
                message=f"The status of your application for {application.animal.name} has been updated to {new_status}."
            )
            return Response({'status': 'Status updated'})
        return Response({'error': 'Invalid status'}, status=400)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        application = self.get_object()
        # Verify ownership
        if application.applicant != request.user:
             return Response({'error': 'Unauthorized'}, status=403)
        
        application.status = 'Cancelled'
        application.save()
        
        # Notify the Shelter Admin
        shelter_admin = application.animal.shelter.admin
        Notification.objects.create(
            recipient=shelter_admin,
            title="Adoption Cancelled",
            message=f"Citizen {request.user.username} has cancelled their adoption application for {application.animal.name}."
        )
        return Response({'status': 'Application cancelled'})
