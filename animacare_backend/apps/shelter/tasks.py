from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings

@shared_task
def send_adoption_status_email(recipient_email, subject, message):
    if not recipient_email:
        return "No email provided"
        
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.EMAIL_HOST_USER,
            recipient_list=[recipient_email],
            fail_silently=False,
        )
        return f"Email sent to {recipient_email}"
    except Exception as e:
        return f"Failed to send email: {str(e)}"
