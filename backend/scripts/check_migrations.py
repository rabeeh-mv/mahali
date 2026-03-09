import sqlite3
import os

# Get the path to the AppData directory
appdata_path = os.path.join(os.environ['APPDATA'], 'Mahali', 'db.sqlite3')
print(f"Checking database at: {appdata_path}")

try:
    conn = sqlite3.connect(appdata_path)
    cursor = conn.cursor()
    
    # Check if django_migrations table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='django_migrations'")
    result = cursor.fetchone()
    
    if result:
        print("django_migrations table exists")
        # Get all migrations
        cursor.execute("SELECT app, name, applied FROM django_migrations ORDER BY applied")
        migrations = cursor.fetchall()
        
        print("Applied migrations:")
        for migration in migrations:
            print(f"  - {migration[0]}.{migration[1]} (applied: {migration[2]})")
    else:
        print("django_migrations table does not exist")
        
    conn.close()
except Exception as e:
    print(f"Error: {e}")