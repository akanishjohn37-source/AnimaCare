from django.urls import path
from .views import PendingUsersView, ApproveUserView, SuspendListingView, AuditLogsView, SystemHealthView

urlpatterns = [
    path('pending-users/', PendingUsersView.as_view(), name='pending_users'),
    path('users/<int:user_id>/approve/', ApproveUserView.as_view(), name='approve_user'),
    path('animals/<int:animal_id>/suspend/', SuspendListingView.as_view(), name='suspend_listing'),
    path('audit-logs/', AuditLogsView.as_view(), name='audit_logs'),
    path('system-health/', SystemHealthView.as_view(), name='system_health'),
]
