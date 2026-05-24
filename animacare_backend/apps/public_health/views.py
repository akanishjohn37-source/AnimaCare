from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import get_user_model
from apps.users.models import Notification
from apps.public_health.tasks import send_mass_broadcast_task
from django.conf import settings
import jwt
import random

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

class ZoonoticHeatmapView(APIView):
  def get(self, request):
        if _get_role(request) not in ['civic_authority', 'admin']:
            return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
        
        disease = request.query_params.get("disease", "Rabies")
        
        # Mocking PostGIS ST_ClusterKMeans for Zoonotic Heatmap
        clusters = []
        for i in range(15):
            clusters.append({
                "latitude": 10.8505 + random.uniform(-0.5, 0.5),
                "longitude": 76.2711 + random.uniform(-0.5, 0.5),
                "intensity": random.randint(3, 10),
                "disease": disease,
                "anonymized_region": f"Zone-{random.randint(1, 5)}"
            })
            
        return Response({"heatmap_data": clusters})

class BroadcastAlertView(APIView):
  def post(self, request):
        if _get_role(request) not in ['civic_authority', 'admin']:
            return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
        
        polygon = request.data.get("polygon", [])
        message = request.data.get("message", "")
        target_group = request.data.get("target_group", "all_citizens")
        
        if not polygon or not message:
            return Response({"error": "Polygon coordinates and message are required."}, status=status.HTTP_400_BAD_REQUEST)
        
        # Offload mass notification creation to background Celery task
        send_mass_broadcast_task.delay(message, target_group)
        
        return Response({
            "message": "Broadcast triggered successfully. Alerts are being processed in the background.", 
            "status": "Processing"
        })

class PublicHealthAnalyticsView(APIView):
  def get(self, request):
        if _get_role(request) not in ['civic_authority', 'admin']:
            return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
        
        return Response({
            "metrics": {
                "total_adoptions": 1520,
                "intakes_this_quarter": 435,
                "vaccination_compliance": "85%",
                "active_zoonotic_reports": 23
            }
        })
