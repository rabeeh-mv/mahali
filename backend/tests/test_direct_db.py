import os
import django
import sqlite3

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mahall_backend.settings')
django.setup()

from django.conf import settings
from society.models import AppSettings

print("=== Testing Direct Database Access ===")

# Get the database path
db_path = settings.DATABASES['default']['NAME']
print(f"Database path: {db_path}")

# Connect directly to the database
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Query the appsettings table
cursor.execute("SELECT id, theme, firebase_config, updated_at FROM society_appsettings ORDER BY updated_at DESC")
rows = cursor.fetchall()

print("Database records:")
for row in rows:
    print(f"ID: {row[0]}, Theme: {row[1]}, Firebase: {repr(row[2])}, Updated: {row[3]}")

conn.close()

# Check Django model
print("\nDjango model records:")
for settings in AppSettings.objects.all().order_by('-updated_at'):
    print(f"ID: {settings.id}, Theme: {settings.theme}, Firebase: {repr(settings.firebase_config)}, Updated: {settings.updated_at}")