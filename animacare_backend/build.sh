#!/usr/bin/env bash
# exit on error
set -o errexit

# Install dependencies
pip install -r requirements.txt

# Run migrations and collect static files
python manage.py collectstatic --no-input
python manage.py migrate

# Create or update default superuser to ensure it is active
python manage.py shell -c "from django.contrib.auth import get_user_model; User = get_user_model(); user, _ = User.objects.get_or_create(username='admin', defaults={'email': 'admin@example.com', 'role': 'admin'}); user.set_password('AdminPassword123!'); user.account_status = 'active'; user.is_superuser = True; user.is_staff = True; user.save()"
