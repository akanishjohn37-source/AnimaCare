from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AppointmentViewSet, ConsultationLogViewSet, SelfReportedRecordViewSet, VaccinationScheduleViewSet

router = DefaultRouter()
router.register(r'appointments', AppointmentViewSet)
router.register(r'consultations', ConsultationLogViewSet)
router.register(r'self-reports', SelfReportedRecordViewSet)
router.register(r'vaccination-schedules', VaccinationScheduleViewSet)


urlpatterns = [
    path('', include(router.urls)),
]
