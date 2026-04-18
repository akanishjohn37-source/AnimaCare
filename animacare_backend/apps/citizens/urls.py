from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SOSAlertViewSet, PetViewSet

router = DefaultRouter()
router.register(r'sos', SOSAlertViewSet)
router.register(r'pets', PetViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
