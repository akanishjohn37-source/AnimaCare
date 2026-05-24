from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SOSAlertViewSet, PetViewSet, LivestockViewSet

router = DefaultRouter()
router.register(r'sos', SOSAlertViewSet)
router.register(r'pets', PetViewSet)
router.register(r'livestocks', LivestockViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
