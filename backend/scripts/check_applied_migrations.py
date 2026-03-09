import os
import django

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mahall_backend.settings')
django.setup()

# Now we can import Django modules
from django.db import connection

# Check what migrations have been applied
cursor = connection.cursor()
cursor.execute("SELECT app, name FROM django_migrations ORDER BY applied")
migrations = cursor.fetchall()

print("Applied migrations:")
for migration in migrations:
    print(f"  - {migration[0]}.{migration[1]}")