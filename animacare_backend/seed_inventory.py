from apps.shelter.models import Shelter, AnimalInventory
from apps.users.models import User

# 1. Create dummy shelter admins
shelter_names = ['City Rescue Shelter', 'Hope Animal Foundation', 'Feline Friends Hub']
shelters = {}

for name in shelter_names:
    username = name.replace(' ', '').lower() + '_admin'
    admin_user, _ = User.objects.get_or_create(username=username, defaults={'role': 'shelter_admin'})
    shelter, _ = Shelter.objects.get_or_create(
        name=name,
        defaults={
            'tax_id': f"TX-{username}",
            'address': '123 Fake St',
            'location': 'Downtown',
            'admin': admin_user,
            'is_verified': True
        }
    )
    shelters[name] = shelter

# 2. Seed animals
animals_data = [
    {'name': 'Bella', 'age': '2 yrs', 'breed': 'Labrador Mix', 'species': 'Dog', 'shelter': 'City Rescue Shelter', 'img': 'https://images.unsplash.com/photo-1544568100-847a948585b9'},
    {'name': 'Oliver', 'age': '6 mos', 'breed': 'Tabby Cat', 'species': 'Cat', 'shelter': 'Hope Animal Foundation', 'img': 'https://images.unsplash.com/photo-1513360371669-4adf3dd7dff8'},
    {'name': 'Max', 'age': '4 yrs', 'breed': 'German Shepherd', 'species': 'Dog', 'shelter': 'City Rescue Shelter', 'img': 'https://images.unsplash.com/photo-1589941013453-ec89f33b6e95'},
    {'name': 'Chloe', 'age': '1 yr', 'breed': 'Siamese', 'species': 'Cat', 'shelter': 'Feline Friends Hub', 'img': 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba'}
]

for anim in animals_data:
    AnimalInventory.objects.get_or_create(
        name=anim['name'],
        shelter=shelters[anim['shelter']],
        defaults={
            'species': anim['species'],
            'breed': anim['breed'],
            'behavioral_traits': f"Age: {anim['age']}", # Using this to store age string since no explicit Age string field exists
            'medical_triage_status': 'Healthy',
            'kennel_zone_id': 'Zone A',
            'media_url': anim['img'] + '?w=300&h=300&fit=crop',
            'is_available': True
        }
    )

print(f"Seeded {AnimalInventory.objects.count()} animals in the inventory.")
