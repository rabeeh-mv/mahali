import os
import django
from django.conf import settings

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mahall_backend.settings')
django.setup()

from society.models import AppSettings

# Test saving firebase config
print("=== Testing Firebase Config Save ===")

# Get or create settings instance
if AppSettings.objects.exists():
    settings_instance = AppSettings.objects.first()
    print(f"Found existing settings with ID: {settings_instance.id}")
else:
    settings_instance = AppSettings.objects.create(theme='light')
    print(f"Created new settings with ID: {settings_instance.id}")

print(f"Current firebase_config: {settings_instance.firebase_config}")

# Try to update firebase_config
test_config = '{"apiKey": "test-key", "projectId": "test-project"}'
print(f"Setting firebase_config to: {test_config}")

settings_instance.firebase_config = test_config
settings_instance.save()

print(f"After save, firebase_config: {settings_instance.firebase_config}")

# Reload from database to verify
settings_instance.refresh_from_db()
print(f"After refresh, firebase_config: {settings_instance.firebase_config}")

# Try using update method
AppSettings.objects.filter(id=settings_instance.id).update(firebase_config=test_config)
settings_instance.refresh_from_db()
print(f"After update(), firebase_config: {settings_instance.firebase_config}")