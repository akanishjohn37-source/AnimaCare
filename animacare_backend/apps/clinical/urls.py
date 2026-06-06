from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AppointmentViewSet, ConsultationLogViewSet, SelfReportedRecordViewSet, 
    VaccinationScheduleViewSet, AppointmentSlotViewSet, VetScheduleDayViewSet
)

router = DefaultRouter()
router.register(r'appointments', AppointmentViewSet)
router.register(r'consultations', ConsultationLogViewSet)
router.register(r'self-reports', SelfReportedRecordViewSet)
router.register(r'vaccination-schedules', VaccinationScheduleViewSet)
router.register(r'slots', AppointmentSlotViewSet)
router.register(r'schedule-days', VetScheduleDayViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
