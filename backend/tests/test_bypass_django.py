import os
import django
import json
from datetime import datetime

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mahall_backend.settings')
django.setup()

from society.models import AppSettings

print("=== Testing Bypass Django ===")

# Get the latest settings directly from the database
settings = AppSettings.objects.all().order_by('-updated_at').first()

if settings:
    # Create the response data manually
    response_data = [{
        'id': settings.id,
        'theme': settings.theme,
        'firebase_config': settings.firebase_config,
        'created_at': settings.created_at.isoformat().replace('+00:00', 'Z'),
        'updated_at': settings.updated_at.isoformat().replace('+00:00', 'Z')
    }]
    
    print("Manual response:")
    print(json.dumps(response_data, indent=2))
else:
    print("No settings found")