from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RegisterView, LoginView, LogoutView, MeView, ChangePasswordDirectView,
    PendingUsersView, ApproveUserView, AllUsersView, UserStatsView, VetsView, NotificationViewSet
)

router = DefaultRouter()
router.register(r'notifications', NotificationViewSet, basename='notification')

urlpatterns = [
    path('', include(router.urls)),
    # Public auth
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('me/', MeView.as_view(), name='me'),
    path('change-password/', ChangePasswordDirectView.as_view(), name='change-password'),

    # Admin — user management & approval
    path('admin/users/', AllUsersView.as_view(), name='admin-users'),
    path('admin/users/pending/', PendingUsersView.as_view(), name='admin-pending-users'),
    path('admin/users/<int:user_id>/action/', ApproveUserView.as_view(), name='admin-user-action'),
    path('admin/stats/', UserStatsView.as_view(), name='admin-user-stats'),
    path('vets/', VetsView.as_view(), name='vets-list'),
]
