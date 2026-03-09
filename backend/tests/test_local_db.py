import sqlite3
import os

# Check local database
local_db_path = 'db.sqlite3'
print(f"Local database path: {local_db_path}")
print(f"Local database exists: {os.path.exists(local_db_path)}")

if os.path.exists(local_db_path):
    try:
        conn = sqlite3.connect(local_db_path)
        cursor = conn.cursor()
        
        # Get all tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        tables = cursor.fetchall()
        
        print(f"Number of tables: {len(tables)}")
        print("Tables in local database:")
        for table in tables:
            print(f"  - {table[0]}")
            
        conn.close()
    except Exception as e:
        print(f"Error checking local database: {e}")
        import traceback
        traceback.print_exc()
else:
    print("Local database file not found")