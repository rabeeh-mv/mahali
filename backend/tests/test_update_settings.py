import requests
import json

print("=== Testing Settings Update ===")

# Test data
data = {
    'id': 1,
    'theme': 'light',
    'firebase_config': '{"apiKey": "updated-test-key", "projectId": "updated-test-project"}'
}

print(f"Sending data: {data}")

# Make PUT request to update settings
response = requests.put('http://127.0.0.1:8000/api/settings/1/', json=data)

print(f"Status code: {response.status_code}")
print(f"Response: {response.json()}")