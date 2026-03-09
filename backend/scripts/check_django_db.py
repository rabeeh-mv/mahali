import os
import django
from django.conf import settings

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mahall_backend.settings')
django.setup()

# Now we can import Django modules
from django.db import connection

# Check what database file Django is using
print(f"Database file: {settings.DATABASES['default']['NAME']}")

# Check what tables exist
cursor = connection.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()

print("Tables in database:")
for table in tables:
    print(f"  - {table[0]}")