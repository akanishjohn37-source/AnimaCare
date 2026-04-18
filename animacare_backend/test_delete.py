import traceback
from rest_framework.test import APIClient
from apps.users.models import User
try:
    u = User.objects.get(username='Anish')
    c = APIClient()
    c.force_authenticate(user=u)
    r = c.delete('/api/citizens/pets/1/')
    print("STATUS", r.status_code)
    print("CONTENT", r.content)
except Exception as e:
    print(traceback.format_exc())
