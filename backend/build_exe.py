import sys
import os
import subprocess
import shutil

def build_django_exe():
    # Define paths
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    server_exe = os.path.join(backend_dir, 'django_server.exe')

    # Create a temporary build directory
    temp_build_dir = os.path.join(backend_dir, 'temp_build')

    # Copy backend files to temp build dir
    if not os.path.exists(temp_build_dir):
        os.makedirs(temp_build_dir)

    # Copy necessary files
    ignore_patterns = ['__pycache__', '*.pyc', '.git', 'venv', 'temp_build']
    for root, dirs, files in os.walk(backend_dir):
        # Skip ignored directories
        dirs[:] = [d for d in dirs if not any(d.endswith(pattern[1:]) or d == pattern for pattern in ignore_patterns)]
        for file in files:
            if file.endswith(('.py', '.json', '.txt')):
                src_path = os.path.join(root, file)
                dst_path = os.path.join(temp_build_dir, os.path.relpath(src_path, backend_dir))
                os.makedirs(os.path.dirname(dst_path), exist_ok=True)
                shutil.copy2(src_path, dst_path)

    # Create a simple wrapper script that starts Django server
    wrapper_script = os.path.join(temp_build_dir, 'django_server.py')
    with open(wrapper_script, 'w') as f:
        f.write('''
import os
import sys
import subprocess
from pathlib import Path

# Set environment variable to indicate production mode
os.environ.setdefault('DJANGO_ENV', 'production')

# Change to the actual backend directory
script_dir = Path(__file__).parent
os.chdir(script_dir)

# Set Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mahall_backend.settings')

# Start Django server
try:
    from django.core.management import execute_from_command_line
    execute_from_command_line(['manage.py', 'runserver', '127.0.0.1:8000'])
except SystemExit:
    pass
''')

    # Copy manage.py to temp dir
    manage_py_src = os.path.join(backend_dir, 'manage.py')
    manage_py_dst = os.path.join(temp_build_dir, 'manage.py')
    shutil.copy2(manage_py_src, manage_py_dst)

    # Copy db.sqlite3 if it exists
    db_src = os.path.join(backend_dir, 'db.sqlite3')
    if os.path.exists(db_src):
        db_dst = os.path.join(temp_build_dir, 'db.sqlite3')
        shutil.copy2(db_src, db_dst)

    # Add media directory if it exists
    media_dir = os.path.join(backend_dir, 'media')
    if os.path.exists(media_dir):
        media_dst = os.path.join(temp_build_dir, 'media')
        if os.path.exists(media_dst):
            shutil.rmtree(media_dst)
        shutil.copytree(media_dir, media_dst)

    # Change to temp directory for build
    os.chdir(temp_build_dir)

    # Run pyinstaller on manage.py
    subprocess.run([
        'pyinstaller',
        '--onefile',
        '--name', 'django_server',
        '--distpath', temp_build_dir,
        'manage.py'
    ], cwd=temp_build_dir)

    # Copy the built executable back to backend directory
    built_exe_path = os.path.join(temp_build_dir, 'django_server.exe')
    if os.path.exists(built_exe_path):
        shutil.copy2(built_exe_path, server_exe)
        print(f"Built executable at: {server_exe}")
    else:
        print(f"Warning: Built executable not found at {built_exe_path}")

    # Back to original directory
    os.chdir(backend_dir)

    # Cleanup temp directory
    if os.path.exists(temp_build_dir):
        shutil.rmtree(temp_build_dir)

    print(f"Django server executable created at: {server_exe}")

if __name__ == '__main__':
    build_django_exe()
