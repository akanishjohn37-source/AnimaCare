from apps.shelter.models import AdoptionApplication
from apps.citizens.models import Pet

apps = AdoptionApplication.objects.filter(status='Approved')
print([(a.applicant.username, a.animal.name) for a in apps])
for app in apps:
    p, c = Pet.objects.get_or_create(
        owner=app.applicant, 
        name=app.animal.name, 
        species=app.animal.species, 
        defaults={
            'breed': app.animal.breed, 
            'health_status': app.animal.medical_triage_status, 
            'media_url': app.animal.media_url
        }
    )
    print(f'Pet: {p.name}, Owner: {p.owner.username}, Created: {c}')
