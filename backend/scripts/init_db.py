import os
import django

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mahall_backend.settings')
django.setup()

# Now we can import Django modules
from django.core.management import execute_from_command_line
from django.db import connection

print("Initializing database...")

# Run migrations
try:
    execute_from_command_line(['manage.py', 'migrate'])
    print("Migrations applied successfully")
except Exception as e:
    print(f"Error applying migrations: {e}")

# Check what tables exist
try:
    cursor = connection.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    tables = cursor.fetchall()
    print("Tables in database:")
    for table in tables:
        print(f"  - {table[0]}")
except Exception as e:
    print(f"Error checking tables: {e}")