import os
import django

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mahall_backend.settings')
django.setup()

from django.test import Client
from django.urls import reverse

print("=== Testing API Endpoint Directly ===")

# Create a test client
client = Client()

# Make a request to the settings API
response = client.get('/api/settings/')

print(f"Status code: {response.status_code}")
print(f"Response data: {response.data}")

# Check the content
print(f"Content: {response.content}")
print(f"JSON: {response.json()}")