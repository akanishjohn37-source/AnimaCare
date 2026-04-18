from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import AnimalInventory, LifestyleAssessment, AICompatibilityScore, Pet, HealthRiskFlag, MedicalRecord
from .serializers import (
    AnimalInventorySerializer, LifestyleAssessmentSerializer, 
    AICompatibilityScoreSerializer, PetSerializer, HealthRiskFlagSerializer, MedicalRecordSerializer
)
from django.contrib.auth.models import User

class AnalyticalViewSet(viewsets.ViewSet):
    """
    Endpoints for Module 4: AI & Predictive Analytics
    """

    @action(detail=False, methods=['post'])
    def submit_lifestyle(self, request):
        user = request.user if request.user.is_authenticated else User.objects.first() # Dummy auth
        if not user:
            user = User.objects.create(username="dummy_user")
            
        data = request.data
        
        # update or create
        instance, created = LifestyleAssessment.objects.update_or_create(
            user=user,
            defaults={
                'housing_type': data.get('housing_type', 'Apartment'),
                'activity_level': data.get('activity_level', 5),
                'has_children': data.get('has_children', False),
                'has_other_pets': data.get('has_other_pets', False)
            }
        )

        # Trigger AI Match Calculation (Normally a celery task)
        self._calculate_compatibility_scores(user, instance)

        return Response(LifestyleAssessmentSerializer(instance).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def recommendations(self, request):
        user = request.user if request.user.is_authenticated else User.objects.first()
        if not user:
            return Response([])
            
        scores = AICompatibilityScore.objects.filter(user=user).order_by('-score_percentage')
        return Response(AICompatibilityScoreSerializer(scores, many=True).data)

    def _calculate_compatibility_scores(self, user, lifestyle):
        # A simple ML simulation (Euclidean distance or rule-based)
        # We clear old scores
        AICompatibilityScore.objects.filter(user=user).delete()

        animals = AnimalInventory.objects.all()
        for animal in animals:
            score = 100
            reasons = []

            if lifestyle.housing_type == 'Apartment' and not animal.good_for_apartments:
                score -= 30
                reasons.append("Needs more space (Not ideal for apartments)")
            elif lifestyle.housing_type == 'Apartment' and animal.good_for_apartments:
                reasons.append("Great for apartments")

            if lifestyle.has_children and not animal.good_with_children:
                score -= 40
                reasons.append("Caution with children")
            elif lifestyle.has_children and animal.good_with_children:
                reasons.append("Excellent with kids")

            activity_diff = abs(lifestyle.activity_level - animal.energy_level)
            score -= (activity_diff * 5)
            if activity_diff <= 2:
                reasons.append("Energy levels match perfectly")

            # Final constraint
            score = max(0, min(100, score))

            if score > 50: # Only save good matches
                AICompatibilityScore.objects.create(
                    user=user,
                    animal=animal,
                    score_percentage=score,
                    match_reasons=reasons
                )

    @action(detail=False, methods=['get'])
    def pet_health_dashboard(self, request):
        user = request.user if request.user.is_authenticated else User.objects.first()
        pets = Pet.objects.filter(owner=user)
        return Response(PetSerializer(pets, many=True).data)

    @action(detail=False, methods=['post'])
    def trigger_health_analysis(self, request):
        """
        Simulates the 2:00 AM Celery Cron Job that assesses weight trajectory
        against the standard baseline curve for that specific breed.
        """
        pets = Pet.objects.all()
        flags_created = 0

        # Baseline dictionary (mock)
        baselines = {
            'Golden Retriever': {'ideal_weight': 30.0, 'variance_allowed': 0.15},
            'Labrador': {'ideal_weight': 32.0, 'variance_allowed': 0.15},
            'Pug': {'ideal_weight': 8.0, 'variance_allowed': 0.10},
        }

        for pet in pets:
            # Get latest weight from medical records, or pet's current weight
            latest_record = pet.medical_records.order_by('-date').first()
            current_weight = latest_record.weight_kg if latest_record else pet.current_weight_kg

            baseline = baselines.get(pet.breed)
            if baseline:
                upper_limit = baseline['ideal_weight'] * (1 + baseline['variance_allowed'])
                lower_limit = baseline['ideal_weight'] * (1 - baseline['variance_allowed'])

                if current_weight > upper_limit:
                    HealthRiskFlag.objects.create(
                        pet=pet,
                        risk_type="Overweight / Obesity Risk",
                        severity="High" if current_weight > (upper_limit * 1.1) else "Medium",
                        description=f"{pet.breed} baseline is {baseline['ideal_weight']}kg. Current weight {current_weight}kg is dangerously high. High risk for Hip Dysplasia and joint issues."
                    )
                    flags_created += 1
                elif current_weight < lower_limit:
                    HealthRiskFlag.objects.create(
                        pet=pet,
                        risk_type="Underweight Risk",
                        severity="Medium",
                        description=f"Current weight {current_weight}kg is below safe threshold for {pet.breed}."
                    )
                    flags_created += 1

        return Response({"message": f"Processed batch. {flags_created} flags generated."}, status=status.HTTP_200_OK)

class AnimalViewSet(viewsets.ModelViewSet):
    queryset = AnimalInventory.objects.all()
    serializer_class = AnimalInventorySerializer

class PetViewSet(viewsets.ModelViewSet):
    queryset = Pet.objects.all()
    serializer_class = PetSerializer

class MedicalRecordViewSet(viewsets.ModelViewSet):
    queryset = MedicalRecord.objects.all()
    serializer_class = MedicalRecordSerializer
