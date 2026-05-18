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
            # Only show available, unadopted pets
            queryset = queryset.filter(is_available=True, is_adopted=False)
        elif user.is_authenticated and user.role == 'shelter_admin':
            # Admins see only their shelter's inventory
            queryset = queryset.filter(shelter__admin=user)
            
        return queryset

    def perform_create(self, serializer):
        # Automatically assign the shelter belonging to the logged-in admin
        try:
            shelter = self.request.user.authorized_shelter
        except Exception:
            # Fallback: create Shelter if user has ShelterAdminProfile but no Shelter instance yet
            if hasattr(self.request.user, 'shelter_profile'):
                profile = self.request.user.shelter_profile
                from apps.shelter.models import Shelter
                shelter = Shelter.objects.create(
                    name=profile.shelter_name,
                    tax_id=profile.shelter_registration_number,
                    address=profile.shelter_address,
                    location="Pending",
                    admin=self.request.user,
                    is_verified=(self.request.user.account_status == 'active')
                )
            else:
                from rest_framework.exceptions import ValidationError
                raise ValidationError({"error": "Your account is not linked to an authorized shelter. Please contact support."})
        
        serializer.save(shelter=shelter)

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

    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        application = self.get_object()
        new_status = request.data.get('status')
        feedback = request.data.get('feedback', '')

        if new_status in dict(AdoptionApplication.STATUS_CHOICES):
            application.status = new_status
            if feedback:
                application.feedback = feedback
            application.save()
            
            # Notify the Applicant
            if new_status == 'Interview Scheduled':
                title = "Interview Scheduled!"
                if feedback:
                    message = f"Great news! The shelter has scheduled an interview for your adoption application for {application.animal.name}. Details: {feedback}. Please check your dashboard."
                else:
                    message = f"Great news! The shelter has scheduled an interview for your adoption application for {application.animal.name}. Please check your dashboard for details."
            elif new_status == 'Approved':
                title = "Adoption Approved! 🎉"
                message = f"Congratulations! Your adoption application for {application.animal.name} has been approved. Welcome to your new best friend!"
                
                # Mark animal as adopted and remove from public market
                animal = application.animal
                animal.is_adopted = True
                animal.is_available = False
                animal.save()
            elif new_status == 'Rejected':
                title = "Adoption Application Update"
                message = f"We regret to inform you that your adoption application for {application.animal.name} was not approved at this time."
                if feedback:
                    message += f" Feedback: {feedback}"
            elif new_status == 'Cancelled':
                title = "Application Cancelled"
                message = f"Your application for {application.animal.name} has been cancelled."
                if feedback:
                    message += f" Reason: {feedback}"
            else:
                title = "Adoption Update"
                message = f"The status of your application for {application.animal.name} has been updated to {new_status}."

            Notification.objects.create(
                recipient=application.applicant,
                title=title,
                message=message
            )
            return Response({'status': 'Status updated', 'feedback': application.feedback})
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
