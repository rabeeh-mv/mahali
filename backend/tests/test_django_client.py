import os
import django

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mahall_backend.settings')
django.setup()

from django.test import Client

print("=== Testing Django Test Client ===")

# Create a test client
client = Client()

# Make a request to the settings API
response = client.get('/api/settings/')

print(f"Status code: {response.status_code}")
print(f"Response content: {response.content.decode()}")

# Try a few more requests to see if there's any caching
print("\nMaking multiple requests:")
for i in range(3):
    response = client.get('/api/settings/')
    print(f"Request {i+1}: {response.content.decode()}")