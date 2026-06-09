from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import get_user_model
from apps.users.models import Notification
from apps.public_health.tasks import send_mass_broadcast_task
from django.conf import settings
import jwt
import random

from apps.shelter.models import AdoptionApplication, AnimalInventory
from apps.citizens.models import Pet, Livestock
from apps.clinical.models import ConsultationLog

def _get_role(request):
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        try:
            token = auth_header.split(' ', 1)[1]
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
            return payload.get('role')
        except:
            return None
    return None

User = get_user_model()

def _get_user(request):
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        try:
            token = auth_header.split(' ', 1)[1]
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
            user_id = payload.get('user_id')
            return User.objects.get(id=user_id)
        except:
            return None
    return None

class ZoonoticHeatmapView(APIView):
  def get(self, request):
        if _get_role(request) not in ['civic_authority', 'admin']:
            return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
        
        disease = request.query_params.get("disease", "Rabies")
        
        from apps.citizens.models import SOSAlert
        from django.utils import timezone
        
        # Query real disease alerts (including those from vets)
        alerts = SOSAlert.objects.filter(alert_type='disease_report', animal_description__icontains=disease)
        
        clusters = []
        for alert in alerts:
            try:
                lat_str, lng_str = alert.location.split(',')
                lat = float(lat_str)
                lng = float(lng_str)
            except:
                continue # Skip if invalid location
                
            now = timezone.now()
            diff = now - alert.timestamp
            if diff.days > 0:
                time_ago = f"{diff.days} days ago"
            elif diff.seconds // 3600 > 0:
                time_ago = f"{diff.seconds // 3600} hours ago"
            else:
                time_ago = f"{diff.seconds // 60} mins ago"

            clusters.append({
                "id": alert.id,
                "latitude": lat,
                "longitude": lng,
                "intensity": random.randint(5, 10), # Simulate severity
                "disease": alert.animal_description[:50], # Actually what was reported
                "anonymized_region": f"Vicinity of {lat:.2f}, {lng:.2f}",
                "reporter": f"{alert.reporter.first_name} {alert.reporter.last_name}" if alert.reporter else "Anonymous",
                "time_ago": time_ago,
                "status": alert.status
            })
            
        return Response({"heatmap_data": clusters})

class BroadcastAlertView(APIView):
  def post(self, request):
        user = _get_user(request)
        if not user or user.role not in ['civic_authority', 'admin']:
            return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
        
        polygon = request.data.get("polygon", [])
        message = request.data.get("message", "")
        target_group = request.data.get("target_group", "all_citizens")
        
        if not polygon or not message:
            return Response({"error": "Polygon coordinates and message are required."}, status=status.HTTP_400_BAD_REQUEST)
        
        # Execute synchronously to avoid Redis hanging on local environments without Celery worker
        result_message = send_mass_broadcast_task(message, target_group, zone=user.zone)
        
        return Response({
            "message": "Broadcast executed successfully.",
            "details": result_message,
            "status": "Completed"
        })

class PublicHealthAnalyticsView(APIView):
    def get(self, request):
        if _get_role(request) not in ['civic_authority', 'admin']:
            return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
        
        total_adoptions = AdoptionApplication.objects.filter(status='Approved').count()
        intakes_this_quarter = AnimalInventory.objects.count()
        
        total_pets = Pet.objects.count()
        if total_pets > 0:
            pets_with_vax = Pet.objects.filter(consultations__vaccinations__isnull=False).distinct().count()
            compliance_percentage = int((pets_with_vax / total_pets) * 100)
        else:
            compliance_percentage = 0
            
        active_zoonotic_reports = ConsultationLog.objects.exclude(zoonotic_disease_flag__isnull=True).exclude(zoonotic_disease_flag="").count()
        
        livestocks = Livestock.objects.all()
        livestock_registry = []
        for l in livestocks:
            last_apt = l.appointments.filter(status='Completed').order_by('-date').first()
            last_checked = last_apt.date.strftime('%Y-%m-%d') if last_apt else "Pending Checkup"
            livestock_registry.append({
                "id": f"LIV-{l.id:04d}",
                "species": l.livestock_type or l.species,
                "location": l.farm_location or "Unknown Location",
                "status": getattr(l, 'health_status', 'Healthy') or 'Healthy',
                "tags": "Individual",
                "lastChecked": last_checked
            })

        return Response({
            "metrics": {
                "total_adoptions": total_adoptions,
                "intakes_this_quarter": intakes_this_quarter,
                "vaccination_compliance": f"{compliance_percentage}%",
                "active_zoonotic_reports": active_zoonotic_reports
            },
            "livestock_registry": livestock_registry
        })

class MLPredictionView(APIView):
    def get(self, request):
        if _get_role(request) not in ['civic_authority', 'admin']:
            return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
        
        # Simulate ML output
        predictions = {
            "states": [
                {"name": "Kerala", "disease_risk": 78, "disaster_risk": 42, "primary_threat": "Rabies Outbreak", "trend": "up"},
                {"name": "Tamil Nadu", "disease_risk": 65, "disaster_risk": 20, "primary_threat": "Canine Parvovirus", "trend": "stable"},
                {"name": "Karnataka", "disease_risk": 45, "disaster_risk": 85, "primary_threat": "Flooding", "trend": "up"},
                {"name": "Maharashtra", "disease_risk": 30, "disaster_risk": 50, "primary_threat": "Avian Flu", "trend": "down"},
                {"name": "Delhi", "disease_risk": 88, "disaster_risk": 30, "primary_threat": "Air Quality / Heat", "trend": "up"}
            ],
            "timeline": {
                "labels": ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5", "Week 6 (Predicted)"],
                "rabies_cases": [12, 15, 18, 22, 28, 45],
                "flooding_incidents": [2, 2, 4, 15, 40, 80]
            }
        }
        
        return Response(predictions)
