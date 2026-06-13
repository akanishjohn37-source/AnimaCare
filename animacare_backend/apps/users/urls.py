from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RegisterView, LoginView, LogoutView, MeView, ChangePasswordDirectView,
    PendingUsersView, ApproveUserView, AllUsersView, UserStatsView, VetsView, NotificationViewSet,
    TokenRefreshView, UploadDocumentView,
    VerifyVetLicenseView, VerifyNGODarpanView, VerifyMunicipalRegistrationView,
    VerifyOwnerPetBindingView, OccupiedCivicZonesView,
)

router = DefaultRouter()
router.register(r'notifications', NotificationViewSet, basename='notification')

urlpatterns = [
    path('', include(router.urls)),
    # Public auth
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('me/', MeView.as_view(), name='me'),
    path('change-password/', ChangePasswordDirectView.as_view(), name='change-password'),
    path('upload/', UploadDocumentView.as_view(), name='upload-document'),

    # Admin — user management & approval
    path('admin/users/', AllUsersView.as_view(), name='admin-users'),
    path('admin/users/pending/', PendingUsersView.as_view(), name='admin-pending-users'),
    path('admin/users/<int:user_id>/action/', ApproveUserView.as_view(), name='admin-user-action'),
    path('admin/stats/', UserStatsView.as_view(), name='admin-user-stats'),
    path('vets/', VetsView.as_view(), name='vets-list'),

    # Verification engine endpoints
    path('verify-vet-license/', VerifyVetLicenseView.as_view(), name='verify-vet-license'),
    path('verify-darpan/', VerifyNGODarpanView.as_view(), name='verify-darpan'),
    path('verify-municipal/', VerifyMunicipalRegistrationView.as_view(), name='verify-municipal'),
    path('verify-ownership/', VerifyOwnerPetBindingView.as_view(), name='verify-ownership'),
    path('occupied-civic-zones/', OccupiedCivicZonesView.as_view(), name='occupied-civic-zones'),
]
