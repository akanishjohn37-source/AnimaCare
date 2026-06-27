from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView
from django.conf import settings
from django.conf.urls.static import static


def api_status(request):
    return JsonResponse({
        "status": "online",
        "project": "AnimaCare REST Framework",
        "message": "Django Engine is securely active! Successfully mapped front-end to backend.",
        "module_1": "Ready to commence Pet Owners & Citizens database logic."
    })

urlpatterns = [
    path('', api_status),           # root → API status (eliminates 404 on /)
    path('admin/', admin.site.urls),
    path('api/status/', api_status),
    path('api/auth/', include('apps.users.urls')),          # ← Auth / RBAC
    path('api/shelter/', include('apps.shelter.urls')),
    path('api/superadmin/', include('apps.governance.urls')),
    path('api/citizens/', include('apps.citizens.urls')),
    path('api/public-health/', include('apps.public_health.urls')),
    path('api/clinical/', include('apps.clinical.urls')),
    
    # OpenAPI Swagger Docs
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
