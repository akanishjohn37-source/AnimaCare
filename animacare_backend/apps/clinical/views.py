from rest_framework import viewsets, status, filters
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from .models import ConsultationLog, VaccinationLog, DigitalPrescription, DiagnosticMedia, Appointment, SelfReportedRecord, VaccinationSchedule, VaccinationScheduleItem
from .serializers import (
    ConsultationLogSerializer, VaccinationLogSerializer, 
    DigitalPrescriptionSerializer, DiagnosticMediaSerializer, 
    AppointmentSerializer, SelfReportedRecordSerializer,
    VaccinationScheduleSerializer, VaccinationScheduleItemSerializer
)
from apps.users.models import Notification
from datetime import timedelta, date

class AppointmentViewSet(viewsets.ModelViewSet):
    queryset = Appointment.objects.all()
    serializer_class = AppointmentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status']
    search_fields = ['pet__name', 'vet__username', 'reason']
    ordering_fields = ['date', 'time']

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
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['diagnosis', 'treatment_plan', 'notes']
    ordering_fields = ['date']

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

        # Vet clinical public health alert logic
        if consultation.zoonotic_disease_flag:
            from apps.citizens.models import SOSAlert
            # Simulate a location near the center if actual GPS is missing
            import random
            lat = str(10.8505 + random.uniform(-0.1, 0.1))
            lng = str(76.2711 + random.uniform(-0.1, 0.1))
            
            SOSAlert.objects.create(
                reporter=self.request.user,
                alert_type='disease_report',
                animal_description=f"Clinical Report: {consultation.zoonotic_disease_flag}",
                location=f"{lat},{lng}",
                status='Pending'
            )

class SelfReportedRecordViewSet(viewsets.ModelViewSet):
    queryset = SelfReportedRecord.objects.all()
    serializer_class = SelfReportedRecordSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'notes']
    ordering_fields = ['date']

    def get_queryset(self):
        return self.queryset.filter(pet__owner=self.request.user)


# ── Vaccination Scheduler ─────────────────────────────────
ANIMAL_TRACK_MAP = {
    'dog': 'puppy',
    'cat': 'kitten',
    'cow': 'cattle',
    'bovine': 'cattle',
    'buffalo': 'cattle',
    'sheep': 'small_ruminant',
    'goat': 'small_ruminant',
    'chicken': 'poultry',
    'duck': 'poultry',
    'hen': 'poultry',
    'horse': 'equine',
    'bird': 'poultry',
}


def _generate_items(schedule, vaccines_given=None):
    """Generate all vaccination + deworming items for a schedule based on its track and what vet confirmed today."""
    items = []
    dob = schedule.date_of_birth
    name = schedule.animal_name
    track = schedule.track
    today = date.today()
    if vaccines_given is None:
        vaccines_given = []

    if track == 'puppy':
        # If vet confirmed DHPPiL Dose 1 today → schedule next booster in 28 days
        if 'dhppil_1' in vaccines_given:
            next_date = today + timedelta(days=28)
            items.append((next_date, 'vaccine', 'Second 7-in-1 Combo Vaccine (Next Booster)',
                         f"Following your vet visit today, {name} is scheduled for their next booster shot on {next_date.strftime('%b %d, %Y')}. Do not forget to deworm them 4 days before!"))
            # Then schedule final booster 28 days after that
            final_date = next_date + timedelta(days=28)
            items.append((final_date, 'vaccine', 'Final Combo Booster + Anti-Rabies',
                         f"Following your vet visit today, {name} is scheduled for their final combo booster and anti-rabies on {final_date.strftime('%b %d, %Y')}."))
            # Then annual booster
            for year in range(1, 4):
                annual_date = final_date + timedelta(days=365 * year)
                items.append((annual_date, 'annual', f'Annual Anti-Rabies & Health Booster (Year {year})',
                             f"All done for today! Your vet has logged today's shots. We will alert you next year on {annual_date.strftime('%b %d, %Y')} for {name}'s annual boosters."))

        elif '7in1' in vaccines_given:
            # Vet gave 7-in-1 today → schedule final booster in 28 days
            final_date = today + timedelta(days=28)
            items.append((final_date, 'vaccine', 'Final Combo Booster + Anti-Rabies',
                         f"Following your vet visit today, {name} is scheduled for their final combo booster and anti-rabies on {final_date.strftime('%b %d, %Y')}."))
            for year in range(1, 4):
                annual_date = final_date + timedelta(days=365 * year)
                items.append((annual_date, 'annual', f'Annual Anti-Rabies & Health Booster (Year {year})',
                             f"All done for today! We will alert you on {annual_date.strftime('%b %d, %Y')} for {name}'s annual boosters."))

        elif 'rabies_final' in vaccines_given:
            # Vet gave final booster today → schedule annual boosters
            for year in range(1, 4):
                annual_date = today + timedelta(days=365 * year)
                items.append((annual_date, 'annual', f'Annual Anti-Rabies & Health Booster (Year {year})',
                             f"All done for today! We will alert you on {annual_date.strftime('%b %d, %Y')} for {name}'s annual boosters."))

        elif 'annual_rabies' in vaccines_given:
            # Vet gave annual booster today → schedule next year
            annual_date = today + timedelta(days=365)
            items.append((annual_date, 'annual', 'Annual Anti-Rabies & Health Booster (Next Year)',
                         f"All done for today! We will alert you on {annual_date.strftime('%b %d, %Y')} for {name}'s annual boosters."))

        else:
            # Fallback: generate full timeline from DOB
            for days_offset, title, desc in [
                (42, 'First DHPPiL Combo (6 Weeks)', f"Vaccine due for {name}!"),
                (70, '7-in-1 Combo (10 Weeks)', f"Booster time for {name}!"),
                (98, 'Final Booster + Anti-Rabies (14 Weeks)', f"Important shot for {name}!"),
            ]:
                items.append((dob + timedelta(days=days_offset), 'vaccine', title, desc))
            for year in range(1, 4):
                items.append((dob + timedelta(days=98 + 365 * year), 'annual', f'Annual Booster (Year {year})',
                             f"Annual booster for {name}."))

    elif track == 'kitten':
        if 'fvrcp_1' in vaccines_given:
            next_date = today + timedelta(days=28)
            items.append((next_date, 'vaccine', 'Second FVRCP Vaccine (Next Booster)',
                         f"Following your vet visit today, {name} is scheduled for their second FVRCP on {next_date.strftime('%b %d, %Y')}."))
            final_date = next_date + timedelta(days=28)
            items.append((final_date, 'vaccine', 'Third FVRCP + Anti-Rabies',
                         f"{name} needs their third FVRCP vaccine and anti-rabies shot on {final_date.strftime('%b %d, %Y')}."))
            for year in range(1, 4):
                annual_date = final_date + timedelta(days=365 * year)
                items.append((annual_date, 'annual', f'Annual FVRCP & Anti-Rabies (Year {year})',
                             f"We will alert you on {annual_date.strftime('%b %d, %Y')} for {name}'s annual boosters."))

        elif 'fvrcp_2' in vaccines_given:
            final_date = today + timedelta(days=28)
            items.append((final_date, 'vaccine', 'Third FVRCP + Anti-Rabies',
                         f"{name} needs their third FVRCP and anti-rabies on {final_date.strftime('%b %d, %Y')}."))
            for year in range(1, 4):
                annual_date = final_date + timedelta(days=365 * year)
                items.append((annual_date, 'annual', f'Annual FVRCP & Anti-Rabies (Year {year})',
                             f"We will alert you on {annual_date.strftime('%b %d, %Y')} for {name}'s annual boosters."))

        elif 'fvrcp_3_rabies' in vaccines_given:
            for year in range(1, 4):
                annual_date = today + timedelta(days=365 * year)
                items.append((annual_date, 'annual', f'Annual FVRCP & Anti-Rabies (Year {year})',
                             f"We will alert you on {annual_date.strftime('%b %d, %Y')} for {name}'s annual boosters."))

        elif 'annual_fvrcp' in vaccines_given:
            annual_date = today + timedelta(days=365)
            items.append((annual_date, 'annual', 'Annual FVRCP & Anti-Rabies (Next Year)',
                         f"We will alert you on {annual_date.strftime('%b %d, %Y')} for {name}'s annual boosters."))
        else:
            for days_offset, title, desc in [
                (42, 'First FVRCP (6 Weeks)', f"First kitten shot for {name}!"),
                (70, 'Second FVRCP (10 Weeks)', f"Kitten booster for {name}!"),
                (98, 'Third FVRCP + Rabies (14 Weeks)', f"Full protection for {name}!"),
            ]:
                items.append((dob + timedelta(days=days_offset), 'vaccine', title, desc))
            for year in range(1, 4):
                items.append((dob + timedelta(days=98 + 365 * year), 'annual', f'Annual Booster (Year {year})',
                             f"Annual booster for {name}."))

    elif track == 'cattle':
        current_year = today.year
        for year in range(current_year, current_year + 3):
            items.append((date(year, 2, 15), 'seasonal', f'Foot & Mouth Disease Vaccine (Feb {year})',
                          f"Seasonal alert! It is time to vaccinate {name} against Foot and Mouth Disease (FMD) this month."))
            items.append((date(year, 12, 15), 'seasonal', f'Foot & Mouth Disease Vaccine (Dec {year})',
                          f"Seasonal alert! It is time to vaccinate {name} against Foot and Mouth Disease (FMD) this month."))
            items.append((date(year, 5, 15), 'seasonal', f'HS & BQ Vaccines (May {year})',
                          f"Monsoon prep! Please vaccinate {name} against HS and BQ diseases this week to keep them safe before the rains start."))
        if schedule.gender and schedule.gender.lower() == 'female':
            age_days = (today - dob).days
            if 120 <= age_days <= 240:
                items.append((today + timedelta(days=7), 'vaccine', 'One-Time Brucellosis Vaccine (Female Calf)',
                              f"One-time shield! {name} is at the right age for her lifelong Brucellosis vaccine. Please schedule it this week."))

    elif track == 'small_ruminant':
        current_year = today.year
        for year in range(current_year, current_year + 3):
            items.append((date(year, 3, 15), 'seasonal', f'PPR Vaccine (March {year})',
                          f"Spring vaccine! It is time to vaccinate {name} against the PPR virus this week."))
            items.append((date(year, 8, 15), 'seasonal', f'Enterotoxaemia Vaccine (August {year})',
                          f"Monsoon shield! Please schedule the Enterotoxaemia vaccine for {name} this week."))

    elif track == 'poultry':
        for days_offset, title, desc in [
            (5, 'Ranikhet / Newcastle Disease Vaccine (Day 5)',
             f"Chick care! Please give your birds their Ranikhet Newcastle Disease vaccine today."),
            (14, 'Gumboro Disease Vaccine (Day 14)',
             f"Flock safety! Your birds are due for their Gumboro Disease vaccine today."),
        ]:
            items.append((dob + timedelta(days=days_offset), 'vaccine', title, desc))

    elif track == 'equine':
        for year in range(0, 4):
            annual_date = today + timedelta(days=365 * year)
            items.append((annual_date, 'annual', f'Annual Equine Influenza Vaccine (Year {year + 1})',
                          f"Yearly check! {name} is due for their annual Equine Influenza vaccine today."))

    # Add deworming prep 4 days before every vaccine
    deworming_items = []
    for scheduled_date, itype, title, desc in items:
        if itype in ('vaccine', 'seasonal', 'annual'):
            deworm_date = scheduled_date - timedelta(days=4)
            deworming_items.append((deworm_date, 'deworming', f'Deworming Prep for: {title}',
                                    f"Time to prep {name}! Please give them their deworming medicine today so they are safe and ready for their upcoming vaccination in 4 days."))

    all_items = items + deworming_items

    # Create all items in DB
    created = []
    for scheduled_date, itype, title, desc in all_items:
        obj = VaccinationScheduleItem.objects.create(
            schedule=schedule,
            item_type=itype,
            title=title,
            description=desc,
            scheduled_date=scheduled_date,
        )
        created.append(obj)

    return created


class VaccinationScheduleViewSet(viewsets.ModelViewSet):
    queryset = VaccinationSchedule.objects.all()
    serializer_class = VaccinationScheduleSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return VaccinationSchedule.objects.filter(owner=self.request.user).order_by('-created_at')

    def create(self, request, *args, **kwargs):
        animal_type = request.data.get('animal_type', '').strip().lower()
        animal_name = request.data.get('animal_name', '').strip()
        date_of_birth = request.data.get('date_of_birth', '')
        gender = request.data.get('gender', '')
        pet_id = request.data.get('pet_id')
        vaccines_given = request.data.get('vaccines_given', [])

        if not animal_type or not animal_name or not date_of_birth:
            return Response({"error": "animal_type, animal_name, and date_of_birth are required."}, status=status.HTTP_400_BAD_REQUEST)

        track = ANIMAL_TRACK_MAP.get(animal_type, 'custom')

        try:
            dob = date.fromisoformat(date_of_birth)
        except ValueError:
            return Response({"error": "Invalid date_of_birth format. Use YYYY-MM-DD."}, status=status.HTTP_400_BAD_REQUEST)

        from apps.citizens.models import Pet
        pet = None
        if pet_id:
            try:
                pet = Pet.objects.get(id=pet_id)
            except Pet.DoesNotExist:
                pass

        schedule = VaccinationSchedule.objects.create(
            pet=pet,
            owner=request.user,
            animal_name=animal_name,
            animal_type=animal_type,
            gender=gender,
            date_of_birth=dob,
            track=track,
        )

        if track != 'custom':
            created_items = _generate_items(schedule, vaccines_given=vaccines_given)

            # Notify the pet owner (not the vet)
            notify_user = pet.owner if pet else request.user
            vaccine_count = len([i for i in created_items if i.item_type != 'deworming'])
            vet_name = request.user.get_full_name() or request.user.username

            Notification.objects.create(
                recipient=notify_user,
                title=f"Vaccination Timeline Generated for {animal_name}",
                message=(
                    f"Following your vet visit today with Dr. {vet_name}, a personalized vaccination timeline "
                    f"for {animal_name} ({animal_type.title()}) has been generated with {vaccine_count} upcoming "
                    f"vaccine reminders and deworming prep alerts. Check your notifications for dates!"
                )
            )

        serializer = self.get_serializer(schedule)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='mark-item')
    def mark_item_complete(self, request, pk=None):
        schedule = self.get_object()
        item_id = request.data.get('item_id')
        try:
            item = VaccinationScheduleItem.objects.get(id=item_id, schedule=schedule)
            item.is_completed = not item.is_completed
            item.save()
            return Response({"message": f"'{item.title}' status updated.", "is_completed": item.is_completed})
        except VaccinationScheduleItem.DoesNotExist:
            return Response({"error": "Item not found."}, status=status.HTTP_404_NOT_FOUND)

