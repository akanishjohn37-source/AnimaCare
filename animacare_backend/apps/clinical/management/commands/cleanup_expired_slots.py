from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db.models import Q
from apps.clinical.models import AppointmentSlot

class Command(BaseCommand):
    help = 'Deactivates appointment slots whose end time has already passed'

    def handle(self, *args, **options):
        now = timezone.localtime(timezone.now())
        current_date = now.date()
        current_time = now.time()

        expired_slots = AppointmentSlot.objects.filter(is_active=True).filter(
            Q(date__lt=current_date) | Q(date=current_date, end_time__lt=current_time)
        )

        count = expired_slots.update(is_active=False)
        self.stdout.write(self.style.SUCCESS(f'Successfully deactivated {count} expired appointment slots.'))
