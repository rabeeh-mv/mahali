import sqlite3
import os

# Get the path to the AppData directory
appdata_path = os.path.join(os.environ['APPDATA'], 'Mahali', 'db.sqlite3')
print(f"Checking database at: {appdata_path}")

try:
    conn = sqlite3.connect(appdata_path)
    cursor = conn.cursor()
    
    # Get all tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = cursor.fetchall()
    
    print("Tables in database:")
    for table in tables:
        print(f"  - {table[0]}")
        
    conn.close()
except Exception as e:
    print(f"Error: {e}")