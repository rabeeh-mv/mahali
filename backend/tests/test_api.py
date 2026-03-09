import os
import django
import json

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mahall_backend.settings')
django.setup()

from rest_framework.test import APIClient
from rest_framework import status
from django.urls import reverse
from society.models import AppSettings

# Create test client
client = APIClient()

print("=== Testing API Firebase Config Save ===")

# Get existing settings or create one
if AppSettings.objects.exists():
    settings_instance = AppSettings.objects.first()
    print(f"Found existing settings with ID: {settings_instance.id}")
else:
    settings_instance = AppSettings.objects.create(theme='light')
    print(f"Created new settings with ID: {settings_instance.id}")

print(f"Current firebase_config: {settings_instance.firebase_config}")

# Test data
test_config = '{"apiKey": "test-key", "projectId": "test-project"}'
print(f"Sending firebase_config: {test_config}")

# Test PUT request to update settings
url = f'/api/settings/{settings_instance.id}/'
data = {
    'id': settings_instance.id,
    'theme': settings_instance.theme,
    'firebase_config': test_config
}

print(f"PUT request to {url} with data: {data}")

response = client.put(url, data, format='json')
print(f"Response status: {response.status_code}")
print(f"Response data: {response.data}")

# Check what's in the database after the API call
settings_instance.refresh_from_db()
print(f"After API call, firebase_config in DB: {settings_instance.firebase_config}")