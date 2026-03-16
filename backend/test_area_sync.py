import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mahall_backend.settings')
django.setup()

from society.models import Area

try:
    print("Creating test area...")
    area = Area.objects.create(name="Test Area 99", description="Testing sync", head_person="Test Head")
    print(f"Created Area: {area.name}, Firebase ID: {area.firebase_id}")
    
    print("Updating test area...")
    area.description = "Updated description"
    area.save()
    print(f"Updated Area: {area.name}, Firebase ID: {area.firebase_id}")

except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
