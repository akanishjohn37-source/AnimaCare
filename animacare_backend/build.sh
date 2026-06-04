#!/usr/bin/env bash
# exit on error
set -o errexit

# Install dependencies
pip install -r requirements.txt

# Run migrations and collect static files
python manage.py collectstatic --no-input
python manage.py migrate

# Auto-create super admin matching local credentials if it doesn't exist
python manage.py shell -c "from apps.users.models import User; User.objects.filter(username='superadmin').exists() or User.objects.create_superuser('superadmin', 'admin@example.com', 'Admin@1234', role='admin', account_status='active', requires_approval=False)"

