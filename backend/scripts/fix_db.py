#!/usr/bin/env python
"""
Script to fix database issues in Mahali application.
This script will:
1. Check if the database exists and has the required tables
2. If not, it will initialize the database with proper migrations
3. Copy the database to the correct location for production use
"""

import os
import sys
import sqlite3
import shutil
import django
from pathlib import Path

# Add the parent directory to the path so we can import Django settings
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

def check_database(db_path):
    """Check if database exists and has required tables"""
    try:
        if not os.path.exists(db_path):
            print(f"Database file does not exist at {db_path}")
            return False
            
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='django_migrations'")
        result = cursor.fetchone()
        conn.close()
        
        if result:
            print(f"Database at {db_path} has django_migrations table")
            return True
        else:
            print(f"Database at {db_path} is missing django_migrations table")
            return False
    except Exception as e:
        print(f"Error checking database at {db_path}: {e}")
        return False

def fix_database():
    """Fix database by running migrations and copying to production location"""
    print("Fixing database...")
    
    # Set up Django
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mahall_backend.settings')
    django.setup()
    
    from django.core.management import execute_from_command_line
    from django.conf import settings
    
    try:
        # Run migrations
        execute_from_command_line(['manage.py', 'migrate'])
        print("Migrations applied successfully")
        
        # Get the Django database path
        django_db_path = settings.DATABASES['default']['NAME']
        print(f"Django database path: {django_db_path}")
        
        # Check if this is different from the AppData path
        appdata_path = Path(os.environ.get('APPDATA', '')) / 'Mahali' / 'db.sqlite3'
        print(f"AppData database path: {appdata_path}")
        
        # Copy the database to AppData location if they're different
        if str(django_db_path) != str(appdata_path):
            print("Copying database to AppData location...")
            # Create the directory if it doesn't exist
            appdata_path.parent.mkdir(parents=True, exist_ok=True)
            # Copy the database file
            shutil.copy2(django_db_path, appdata_path)
            print("Database copied successfully!")
        
        return True
    except Exception as e:
        print(f"Error fixing database: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    print("Checking Mahali database...")
    
    # Set up Django to get the correct database path
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mahall_backend.settings')
    django.setup()
    from django.conf import settings
    
    # Check the Django database path
    django_db_path = str(settings.DATABASES['default']['NAME'])
    print(f"Checking Django database at: {django_db_path}")
    
    if check_database(django_db_path):
        print("Django database is OK!")
        
        # Also check AppData database if it's different
        appdata_path = str(Path(os.environ.get('APPDATA', '')) / 'Mahali' / 'db.sqlite3')
        if django_db_path != appdata_path:
            print(f"Also checking AppData database at: {appdata_path}")
            if not check_database(appdata_path):
                print("Copying Django database to AppData location...")
                # Create the directory if it doesn't exist
                Path(appdata_path).parent.mkdir(parents=True, exist_ok=True)
                # Copy the database file
                shutil.copy2(django_db_path, appdata_path)
                print("Database copied successfully!")
        
        return 0
    else:
        print("Django database needs to be fixed...")
        if fix_database():
            print("Database has been fixed!")
            return 0
        else:
            print("Failed to fix database!")
            return 1

if __name__ == "__main__":
    sys.exit(main())