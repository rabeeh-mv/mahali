#!/usr/bin/env python
"""
Script to build Django backend as a standalone executable for Electron app
"""

import sys
import os
import subprocess
import shutil
from pathlib import Path

def build_django_executable():
    # Get the backend directory
    backend_dir = Path(__file__).parent.absolute()
    print(f"Building Django executable in: {backend_dir}")
    
    # Check if pyinstaller is installed
    try:
        subprocess.run([sys.executable, '-m', 'PyInstaller', '--version'], 
                      check=True, capture_output=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("PyInstaller not found. Installing...")
        subprocess.run([sys.executable, '-m', 'pip', 'install', 'pyinstaller'], check=True)
    
    # Create a simple server script
    server_script = backend_dir / 'run_server.py'
    with open(server_script, 'w') as f:
        f.write('''
#!/usr/bin/env python
"""
Simple Django server script for Electron app
"""

import os
import sys
import django
from django.core.management import execute_from_command_line
from django.conf import settings

# Add the backend directory to Python path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mahall_backend.settings')
django.setup()

if __name__ == '__main__':
    # Pass arguments from command line
    args = ['manage.py'] + sys.argv[1:]
    if len(args) == 1:
        # Default fallback if no args provided
        args = ['manage.py', 'runserver', '127.0.0.1:8000', '--noreload']
    execute_from_command_line(args)
''')
    
    # Create backup/restore script
    backup_script = backend_dir / 'backup_restore_cli.py'
    with open(backup_script, 'w') as f:
        f.write('''
#!/usr/bin/env python
"""
Backup and Restore CLI for Mahall Software
"""

import os
import sys
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent.absolute()
sys.path.insert(0, str(backend_dir))

# Import backup_restore module
try:
    import backup_restore
    backup_restore.main()
except ImportError as e:
    print(f"Error importing backup_restore module: {e}")
    sys.exit(1)
''')
    
    # Prepare data files (exclude database and media which should be in user data directory)
    datas = [
        ('mahall_backend/*', 'mahall_backend'),
        ('society/*', 'society'),
        ('requirements.txt', '.'),
        ('manage.py', '.'),
        ('backup_restore.py', '.'),
    ]
    
    # Note: We don't include db.sqlite3 or media directory here
    # They will be created in the user's data directory at runtime
    
    # Create spec file for Django server
    spec_content = f'''
# -*- mode: python ; coding: utf-8 -*-

block_cipher = None

a = Analysis(
    ['run_server.py'],
    pathex=['{backend_dir}'],
    binaries=[],
    datas={datas},
    hiddenimports=[
        'django',
        'rest_framework',
        'corsheaders',
        'PIL',
        'django.contrib.admin',
        'django.contrib.auth',
        'django.contrib.contenttypes',
        'django.contrib.sessions',
        'django.contrib.messages',
        'django.contrib.staticfiles',
        'mahall_backend',
        'society',
    ],
    hookspath=[],
    hooksconfig={{}},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='django_server',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
'''
    
    # Create spec file for backup/restore tool
    backup_spec_content = f'''
# -*- mode: python ; coding: utf-8 -*-

block_cipher = None

a = Analysis(
    ['backup_restore_cli.py'],
    pathex=['{backend_dir}'],
    binaries=[],
    datas={datas},
    hiddenimports=[
        'django',
        'rest_framework',
        'corsheaders',
        'PIL',
        'django.contrib.admin',
        'django.contrib.auth',
        'django.contrib.contenttypes',
        'django.contrib.sessions',
        'django.contrib.messages',
        'django.contrib.staticfiles',
        'mahall_backend',
        'society',
        'backup_restore',
    ],
    hookspath=[],
    hooksconfig={{}},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='mahall_backup_restore',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
'''
    
    # Write spec files
    spec_file = backend_dir / 'django_server.spec'
    with open(spec_file, 'w') as f:
        f.write(spec_content)
    
    backup_spec_file = backend_dir / 'mahall_backup_restore.spec'
    with open(backup_spec_file, 'w') as f:
        f.write(backup_spec_content)
    
    print("Created spec files for Django executable and backup/restore tool")
    
    # Build the server executable
    print("Building Django server executable...")
    try:
        subprocess.run([
            sys.executable, '-m', 'PyInstaller',
            '--clean',
            str(spec_file)
        ], cwd=backend_dir, check=True)
        
        # Copy the server executable to backend directory
        dist_dir = backend_dir / 'dist'
        exe_file = dist_dir / 'django_server.exe'
        target_exe = backend_dir / 'django_server.exe'
        
        if exe_file.exists():
            shutil.copy2(exe_file, target_exe)
            print(f"Django server executable created: {target_exe}")
        else:
            print("Error: Server executable not found")
            return False
            
    except subprocess.CalledProcessError as e:
        print(f"Error building server executable: {e}")
        return False
    
    # Build the backup/restore executable
    print("Building backup/restore executable...")
    try:
        subprocess.run([
            sys.executable, '-m', 'PyInstaller',
            '--clean',
            str(backup_spec_file)
        ], cwd=backend_dir, check=True)
        
        # Copy the backup/restore executable to backend directory
        dist_dir = backend_dir / 'dist'
        exe_file = dist_dir / 'mahall_backup_restore.exe'
        target_exe = backend_dir / 'mahall_backup_restore.exe'
        
        if exe_file.exists():
            shutil.copy2(exe_file, target_exe)
            print(f"Backup/restore executable created: {target_exe}")
        else:
            print("Error: Backup/restore executable not found")
            return False
            
    except subprocess.CalledProcessError as e:
        print(f"Error building backup/restore executable: {e}")
        return False
    
    # Clean up build files
    build_dir = backend_dir / 'build'
    if build_dir.exists():
        shutil.rmtree(build_dir)
    if dist_dir.exists():
        shutil.rmtree(dist_dir)
    if spec_file.exists():
        spec_file.unlink()
    if backup_spec_file.exists():
        backup_spec_file.unlink()
    if server_script.exists():
        server_script.unlink()
    if backup_script.exists():
        backup_script.unlink()
    
    print("Build completed successfully!")
    return True

if __name__ == '__main__':
    build_django_executable()