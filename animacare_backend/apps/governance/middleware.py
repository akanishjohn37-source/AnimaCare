import json
from django.utils import timezone
from apps.governance.models import AuditTrail

class AuditTrailMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # Log mutating actions for admin users
        if request.method in ['POST', 'PUT', 'PATCH', 'DELETE']:
            user = request.user
            if user.is_authenticated and user.role in ['super_admin', 'shelter_admin']:
                try:
                    # We can't always read request.body here because it might have been consumed,
                    # but for this simple middleware, we'll try to capture basic details.
                    payload = request.body.decode('utf-8')
                    if len(payload) > 1000:
                        payload = payload[:1000] + '... [truncated]'
                except Exception:
                    payload = 'Could not decode payload or body already consumed'

                # Get IP
                x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
                if x_forwarded_for:
                    ip = x_forwarded_for.split(',')[0]
                else:
                    ip = request.META.get('REMOTE_ADDR')

                AuditTrail.objects.create(
                    admin_user=user,
                    action_type=f"{request.method}_{request.path.strip('/').replace('/', '_').upper()}",
                    description=f"Action: {request.method} {request.path} | Status: {response.status_code} | Payload: {payload}",
                    ip_address=ip
                )

        return response
