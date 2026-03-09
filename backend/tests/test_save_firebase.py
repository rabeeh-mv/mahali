import os
import django

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mahall_backend.settings')
django.setup()

from society.models import AppSettings
from society.serializers import AppSettingsSerializer

print("=== Testing Saving Firebase Config ===")

# Get or create settings instance
if AppSettings.objects.exists():
    settings_instance = AppSettings.objects.first()
    print(f"Found existing settings with ID: {settings_instance.id}")
else:
    settings_instance = AppSettings.objects.create(theme='light')
    print(f"Created new settings with ID: {settings_instance.id}")

print(f"Current theme: {settings_instance.theme}")
print(f"Current firebase_config: {repr(settings_instance.firebase_config)}")

# Test data
test_config = '{"apiKey": "AIzaSyTestKey", "authDomain": "test-project.firebaseapp.com", "projectId": "test-project", "storageBucket": "test-project.appspot.com", "messagingSenderId": "1234567890", "appId": "1:1234567890:web:abcdef123456"}'
print(f"Setting firebase_config to: {test_config}")

# Update using the serializer
serializer = AppSettingsSerializer(settings_instance, data={
    'id': settings_instance.id,
    'theme': settings_instance.theme,
    'firebase_config': test_config
}, partial=True)

if serializer.is_valid():
    updated_settings = serializer.save()
    print(f"Successfully saved firebase_config")
    print(f"Updated theme: {updated_settings.theme}")
    print(f"Updated firebase_config: {repr(updated_settings.firebase_config)}")
else:
    print(f"Serializer errors: {serializer.errors}")

# Refresh from database
settings_instance.refresh_from_db()
print(f"After refresh - Theme: {settings_instance.theme}")
print(f"After refresh - Firebase config: {repr(settings_instance.firebase_config)}")