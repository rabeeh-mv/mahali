import os
import django

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mahall_backend.settings')
django.setup()

from society.models import AppSettings
from society.views import AppSettingsViewSet
from rest_framework.test import APIRequestFactory
from rest_framework.response import Response

print("=== Testing ViewSet List Method ===")

# Create a request factory
factory = APIRequestFactory()

# Create a viewset instance
viewset = AppSettingsViewSet()
viewset.request = factory.get('/api/settings/')
viewset.format_kwarg = {}

# Call the list method
response = viewset.list(viewset.request)

print(f"Response status: {response.status_code}")
print(f"Response data: {response.data}")