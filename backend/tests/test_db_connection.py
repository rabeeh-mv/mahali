import os
import django

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mahall_backend.settings')
django.setup()

from django.db import connection
from society.models import AppSettings

print("=== Testing Database Connection ===")

# Force a new database connection
connection.close()

# Get the settings record
settings = AppSettings.objects.first()
print(f"ID: {settings.id}")
print(f"Theme: {settings.theme}")
print(f"Firebase config: {repr(settings.firebase_config)}")
print(f"Updated at: {settings.updated_at}")

# Try to refresh from database
settings.refresh_from_db()
print(f"After refresh - Theme: {settings.theme}")
print(f"After refresh - Firebase config: {repr(settings.firebase_config)}")
print(f"After refresh - Updated at: {settings.updated_at}")