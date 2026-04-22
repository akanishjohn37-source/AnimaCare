from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AppointmentViewSet, ConsultationLogViewSet, SelfReportedRecordViewSet

router = DefaultRouter()
router.register(r'appointments', AppointmentViewSet)
router.register(r'consultations', ConsultationLogViewSet)
router.register(r'self-reports', SelfReportedRecordViewSet)


urlpatterns = [
    path('', include(router.urls)),
]
