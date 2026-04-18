import sys, traceback
from apps.citizens.models import Pet
try:
    Pet.objects.get(id=1).delete()
    print("DELETE SUCCESSFUL")
except Exception as e:
    print("DELETE ERROR:", repr(e))
    traceback.print_exc(file=sys.stdout)
