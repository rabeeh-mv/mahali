import os
import django

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mahall_backend.settings')
django.setup()

from society.models import AppSettings
from society.serializers import AppSettingsSerializer

print("=== Testing Serializer ===")

# Get existing settings
settings_instance = AppSettings.objects.first()
print(f"Settings ID: {settings_instance.id}")
print(f"Theme: {settings_instance.theme}")
print(f"Firebase config: {settings_instance.firebase_config}")

# Serialize the instance
serializer = AppSettingsSerializer(settings_instance)
print(f"Serialized data: {serializer.data}")