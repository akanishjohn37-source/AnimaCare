from apps.shelter.models import AdoptionApplication
from apps.citizens.models import Pet

apps = AdoptionApplication.objects.filter(status='Approved')
count = 0
for app in apps:
    _, created = Pet.objects.get_or_create(
        owner=app.applicant,
        name=app.animal.name,
        species=app.animal.species,
        defaults={
            'breed': app.animal.breed,
            'health_status': app.animal.medical_triage_status,
            'media_url': app.animal.media_url
        }
    )
    if created:
        count += 1
print(f'Created {count} retroactive pets')
