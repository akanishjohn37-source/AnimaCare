from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import AnimalInventory, Shelter, AdoptionApplication
from .serializers import AnimalInventorySerializer, ShelterSerializer, AdoptionApplicationSerializer
from apps.users.models import Notification
from .tasks import send_adoption_status_email

class ShelterViewSet(viewsets.ModelViewSet):
    queryset = Shelter.objects.all()
    serializer_class = ShelterSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['is_verified', 'location']
    search_fields = ['name', 'address']

class AnimalInventoryViewSet(viewsets.ModelViewSet):
    queryset = AnimalInventory.objects.all()
    serializer_class = AnimalInventorySerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['species', 'is_available', 'is_adopted', 'medical_triage_status']
    search_fields = ['name', 'breed']
    ordering_fields = ['intake_date']

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
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['status']
    ordering_fields = ['application_date']

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
                title = "Adoption Approved & Finalized! 🎉"
                message = (
                    f"Congratulations! Your adoption application for {application.animal.name} has been approved and finalized. "
                    f"The pet has been successfully added to your profile."
                )
                # Mark animal as adopted and remove from public market
                animal = application.animal
                animal.is_adopted = True
                animal.is_available = False
                animal.save()

                # Auto-create the Pet record in the Citizen's profile
                from apps.citizens.models import Pet
                Pet.objects.get_or_create(
                    owner=application.applicant,
                    name=animal.name,
                    species=animal.species,
                    defaults={
                        'breed': animal.breed,
                        'health_status': animal.medical_triage_status,
                        'media_url': animal.media_url
                    }
                )
            elif new_status == 'Rejected':
                title = "Adoption Application Update"
                message = f"We regret to inform you that your adoption application for {application.animal.name} was not approved at this time."
                if feedback:
                    message += f" Feedback: {feedback}"
                # Revert animal status and delete Pet profile
                animal = application.animal
                animal.is_adopted = False
                animal.is_available = True
                animal.save()
                from apps.citizens.models import Pet
                Pet.objects.filter(owner=application.applicant, name=animal.name, species=animal.species).delete()
            elif new_status == 'Cancelled':
                title = "Application Cancelled"
                message = f"Your application for {application.animal.name} has been cancelled."
                if feedback:
                    message += f" Reason: {feedback}"
                # Revert animal status and delete Pet profile
                animal = application.animal
                animal.is_adopted = False
                animal.is_available = True
                animal.save()
                from apps.citizens.models import Pet
                Pet.objects.filter(owner=application.applicant, name=animal.name, species=animal.species).delete()
            else:
                title = "Adoption Update"
                message = f"The status of your application for {application.animal.name} has been updated to {new_status}."

            Notification.objects.create(
                recipient=application.applicant,
                title=title,
                message=message
            )
            
            # Send Email via Celery
            if new_status in ['Approved', 'Rejected', 'Interview Scheduled']:
                send_adoption_status_email.delay(
                    application.applicant.email,
                    title,
                    message
                )
                
            return Response({'status': 'Status updated', 'feedback': application.feedback})
        return Response({'error': 'Invalid status'}, status=400)

    @action(detail=True, methods=['post'])
    def reply_interview(self, request, pk=None):
        """Citizen replies to the scheduled interview: 'accept' or 'reject'."""
        application = self.get_object()
        if application.applicant != request.user:
            return Response({'error': 'Unauthorized'}, status=403)
        if application.status != 'Interview Scheduled':
            return Response({'error': 'Application must be in Interview Scheduled status to reply.'}, status=400)

        response = request.data.get('response')
        if response == 'accept':
            application.applicant_confirmed = True
            application.feedback = (application.feedback or '') + ' [Interview Accepted by applicant]'
            application.save()

            # Notify the Shelter Admin
            shelter_admin = application.animal.shelter.admin
            Notification.objects.create(
                recipient=shelter_admin,
                title="Interview Confirmed! 📅",
                message=f"Citizen {request.user.username} has confirmed they will attend the interview for {application.animal.name}."
            )
            # Notify the Applicant
            Notification.objects.create(
                recipient=application.applicant,
                title="Interview Confirmed 📅",
                message=f"You have confirmed your attendance for the interview of {application.animal.name}. The shelter admin will review and complete the adoption after the interview."
            )
            return Response({'status': 'Interview Scheduled', 'applicant_confirmed': True, 'message': 'Interview schedule accepted. The shelter admin gets confirmation.'})

        elif response == 'reject':
            application.status = 'Rejected'
            application.applicant_confirmed = False
            application.feedback = (application.feedback or '') + ' [Interview Rejected by applicant]'
            application.save()

            # Notify the Shelter Admin
            shelter_admin = application.animal.shelter.admin
            Notification.objects.create(
                recipient=shelter_admin,
                title="Interview Rejected & Application Closed",
                message=f"Citizen {request.user.username} has rejected the interview for {application.animal.name}. The application has been closed."
            )
            # Notify the Applicant
            Notification.objects.create(
                recipient=application.applicant,
                title="Interview Rejected",
                message=f"You have rejected the interview request for {application.animal.name}. The application has been cancelled."
            )
            return Response({'status': 'Rejected', 'message': 'Interview rejected and application closed.'})
        else:
            return Response({'error': 'Invalid response type. Must be accept or reject.'}, status=400)

    @action(detail=True, methods=['post'])
    def accept_adoption(self, request, pk=None):
        """Applicant confirms they want the pet after approval."""
        application = self.get_object()
        if application.applicant != request.user:
            return Response({'error': 'Unauthorized'}, status=403)
        if application.status != 'Approved':
            return Response({'error': 'Application must be in Approved status to accept.'}, status=400)

        application.status = 'Accepted'
        application.applicant_confirmed = True
        application.save()

        # Mark animal as adopted and remove from public market
        animal = application.animal
        animal.is_adopted = True
        animal.is_available = False
        animal.save()

        # Auto-create the Pet record in the Citizen's profile
        from apps.citizens.models import Pet
        Pet.objects.get_or_create(
            owner=application.applicant,
            name=animal.name,
            species=animal.species,
            defaults={
                'breed': animal.breed,
                'health_status': animal.medical_triage_status,
                'media_url': animal.media_url
            }
        )

        # Notify the Shelter Admin
        shelter_admin = application.animal.shelter.admin
        Notification.objects.create(
            recipient=shelter_admin,
            title="Adoption Accepted! 🎉",
            message=f"Citizen {request.user.username} has confirmed and accepted the adoption of {application.animal.name}. The pet has been transferred to their profile."
        )
        # Notify the Applicant
        Notification.objects.create(
            recipient=application.applicant,
            title="Welcome to your new best friend! 🐾",
            message=f"You have successfully accepted {application.animal.name}. The pet has been added to your profile. Welcome to your new family member!"
        )

        return Response({'status': 'Adoption accepted and finalized.'})

    @action(detail=True, methods=['post'])
    def reject_adoption(self, request, pk=None):
        """Applicant decides they no longer want the pet after approval."""
        application = self.get_object()
        if application.applicant != request.user:
            return Response({'error': 'Unauthorized'}, status=403)
        if application.status != 'Approved':
            return Response({'error': 'Application must be in Approved status to reject.'}, status=400)

        application.status = 'Cancelled'
        application.applicant_confirmed = False
        application.feedback = (application.feedback or '') + ' [Applicant declined after approval]'
        application.save()

        # Revert animal status and delete Pet profile
        animal = application.animal
        animal.is_adopted = False
        animal.is_available = True
        animal.save()
        from apps.citizens.models import Pet
        Pet.objects.filter(owner=application.applicant, name=animal.name, species=animal.species).delete()

        # Notify the Shelter Admin
        shelter_admin = application.animal.shelter.admin
        Notification.objects.create(
            recipient=shelter_admin,
            title="Adoption Declined",
            message=f"Citizen {request.user.username} has declined the adoption of {application.animal.name} after approval. The animal remains available."
        )

        return Response({'status': 'Adoption declined by applicant.'})

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        application = self.get_object()
        # Verify ownership
        if application.applicant != request.user:
             return Response({'error': 'Unauthorized'}, status=403)
        
        application.status = 'Cancelled'
        application.save()

        # Revert animal status and delete Pet profile
        animal = application.animal
        animal.is_adopted = False
        animal.is_available = True
        animal.save()
        from apps.citizens.models import Pet
        Pet.objects.filter(owner=application.applicant, name=animal.name, species=animal.species).delete()
        
        # Notify the Shelter Admin
        shelter_admin = application.animal.shelter.admin
        Notification.objects.create(
            recipient=shelter_admin,
            title="Adoption Cancelled",
            message=f"Citizen {request.user.username} has cancelled their adoption application for {application.animal.name}."
        )
        return Response({'status': 'Application cancelled'})
