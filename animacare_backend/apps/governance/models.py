from django.db import models
from django.conf import settings

class AuditTrail(models.Model):
    admin_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='audit_logs')
    action_type = models.CharField(max_length=100) # e.g. "USER_APPROVAL", "LISTING_SUSPENSION"
    description = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    def __str__(self):
        return f"{self.action_type} by {self.admin_user} at {self.timestamp}"
