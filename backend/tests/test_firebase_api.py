import requests
import json

print("=== Testing Firebase Config API ===")

# Test data
test_config = {
    "apiKey": "test-key-123",
    "authDomain": "test-project.firebaseapp.com",
    "projectId": "test-project",
    "storageBucket": "test-project.appspot.com",
    "messagingSenderId": "123456789",
    "appId": "1:123456789:web:abcdef123456"
}

# Send POST request to save Firebase config
response = requests.post('http://127.0.0.1:8000/api/save-firebase-config/', 
                        json={'firebase_config': json.dumps(test_config)})

print(f"Status code: {response.status_code}")
print(f"Response: {response.json()}")

# Verify by checking the settings API
settings_response = requests.get('http://127.0.0.1:8000/api/settings/')
print(f"Settings API response: {settings_response.json()}")