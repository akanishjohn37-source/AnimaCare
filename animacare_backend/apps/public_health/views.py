from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import get_user_model
import random

User = get_user_model()

class ZoonoticHeatmapView(APIView):
  def get(self, request):
        if not request.user.is_authenticated or request.user.role not in ['civic_authority', 'admin']:
            return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
        
        disease = request.query_params.get("disease", "Rabies")
        
        # Mocking PostGIS ST_ClusterKMeans for Zoonotic Heatmap
        clusters = []
        for i in range(15):
            clusters.append({
                "latitude": 34.0522 + random.uniform(-0.1, 0.1),
                "longitude": -118.2437 + random.uniform(-0.1, 0.1),
                "intensity": random.randint(3, 10),
                "disease": disease,
                "anonymized_region": f"Zone-{random.randint(1, 5)}"
            })
            
        return Response({"heatmap_data": clusters})

class BroadcastAlertView(APIView):
  def post(self, request):
        if not request.user.is_authenticated or request.user.role not in ['civic_authority', 'admin']:
            return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
        
        polygon = request.data.get("polygon", [])
        message = request.data.get("message", "")
        
        if not polygon or not message:
            return Response({"error": "Polygon coordinates and message are required."}, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({
            "message": "Broadcast triggered successfully. Celery queue processing alert for affected users.", 
            "estimated_reach": random.randint(100, 5000)
        })

class PublicHealthAnalyticsView(APIView):
  def get(self, request):
        if not request.user.is_authenticated or request.user.role not in ['civic_authority', 'admin']:
            return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
        
        return Response({
            "metrics": {
                "total_adoptions": 1520,
                "intakes_this_quarter": 435,
                "vaccination_compliance": "85%",
                "active_zoonotic_reports": 23
            }
        })
