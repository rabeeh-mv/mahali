#!/usr/bin/env python
"""
Script to clean the database and prepare a clean build
"""

import os
import sys
import subprocess
import shutil
from pathlib import Path

def clean_database():
    """Remove existing database and media files for a clean build"""
    # Get the backend directory
    backend_dir = Path(__file__).parent.absolute()
    print(f"Cleaning database in: {backend_dir}")
    
    # Set Django environment
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mahall_backend.settings')
    
    # Add backend directory to Python path
    sys.path.insert(0, str(backend_dir))
    
    try:
        import django
        django.setup()
        
        from django.conf import settings
        
        # Get database and media paths
        db_path = Path(settings.DATABASES['default']['NAME'])
        media_path = Path(settings.MEDIA_ROOT)
        
        print(f"Database path: {db_path}")
        print(f"Media path: {media_path}")
        
        # Remove database file if it exists
        if db_path.exists():
            db_path.unlink()
            print("Database file removed")
        else:
            print("No existing database file found")
        
        # Remove media directory if it exists
        if media_path.exists() and media_path.is_dir():
            shutil.rmtree(media_path)
            print("Media directory removed")
        else:
            print("No existing media directory found")
        
        # Create migrations
        print("Creating migrations...")
        subprocess.run([
            sys.executable, 'manage.py', 'makemigrations'
        ], cwd=backend_dir, check=True)
        
        # Apply migrations
        print("Applying migrations...")
        subprocess.run([
            sys.executable, 'manage.py', 'migrate'
        ], cwd=backend_dir, check=True)
        
        print("Database cleaned and initialized successfully!")
        return True
        
    except Exception as e:
        print(f"Error cleaning database: {e}")
        return False

def build_clean_executable():
    """Build Django executable with clean database"""
    backend_dir = Path(__file__).parent.absolute()
    
    # Clean database first
    if not clean_database():
        print("Failed to clean database. Aborting build.")
        return False
    
    # Now build the executable
    print("Building Django executable...")
    build_script = backend_dir / 'build_django_exe.py'
    
    try:
        subprocess.run([
            sys.executable, str(build_script)
        ], cwd=backend_dir, check=True)
        print("Build completed successfully!")
        return True
    except subprocess.CalledProcessError as e:
        print(f"Error building executable: {e}")
        return False

if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == 'clean-only':
        clean_database()
    else:
        build_clean_executable()