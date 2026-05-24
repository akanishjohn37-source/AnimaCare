from celery import shared_task
from django.contrib.auth import get_user_model
from apps.users.models import Notification

User = get_user_model()

@shared_task
def send_mass_broadcast_task(message, target_group):
    # Determine target users based on group
    target_users = User.objects.none()
    
    if target_group == "all_citizens":
        target_users = User.objects.filter(role='citizen')
    elif target_group == "pet_owners":
        target_users = User.objects.filter(role='citizen', pets__isnull=False).distinct()
    elif target_group == "agricultural":
        target_users = User.objects.filter(role='citizen', livestock__isnull=False).distinct()
        
    estimated_reach = target_users.count()
    
    # Create actual notifications for targeted users
    # We do chunking if list is huge, but bulk_create is fine for now
    notifications = []
    for u in target_users:
        notifications.append(
            Notification(
                recipient=u,
                title="CIVIC HEALTH ALERT",
                message=message
            )
        )
        
    if notifications:
        Notification.objects.bulk_create(notifications)
        
    return f"Broadcasted to {estimated_reach} users."
