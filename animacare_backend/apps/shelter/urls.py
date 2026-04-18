from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ShelterViewSet, AnimalInventoryViewSet, AdoptionApplicationViewSet

router = DefaultRouter()
router.register(r'shelters', ShelterViewSet)
router.register(r'inventory', AnimalInventoryViewSet)
router.register(r'applications', AdoptionApplicationViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
