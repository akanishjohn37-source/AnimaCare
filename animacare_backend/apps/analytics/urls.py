from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AnalyticalViewSet, AnimalViewSet, PetViewSet, MedicalRecordViewSet

router = DefaultRouter()
router.register(r'analytics', AnalyticalViewSet, basename='analytics')
router.register(r'animals', AnimalViewSet, basename='animals')
router.register(r'pets', PetViewSet, basename='pets')
router.register(r'medical-records', MedicalRecordViewSet, basename='medical-records')

urlpatterns = [
    path('', include(router.urls)),
]
