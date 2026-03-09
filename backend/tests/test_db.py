import os
import sqlite3

# Get the path to the AppData directory
appdata_path = os.path.join(os.environ['APPDATA'], 'Mahali', 'db.sqlite3')
print(f"Database path: {appdata_path}")
print(f"Database exists: {os.path.exists(appdata_path)}")

try:
    conn = sqlite3.connect(appdata_path)
    cursor = conn.cursor()
    
    # Get all tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    tables = cursor.fetchall()
    
    print(f"Number of tables: {len(tables)}")
    print("Tables in database:")
    for table in tables:
        print(f"  - {table[0]}")
        
    conn.close()
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()