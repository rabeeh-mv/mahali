import requests
import json

print("=== Testing API Response ===")

# Make a request to the API
response = requests.get('http://127.0.0.1:8000/api/settings/')

print(f"Status code: {response.status_code}")
print(f"Headers: {response.headers}")
print(f"Content: {response.text}")

# Try to parse as JSON
try:
    data = response.json()
    print(f"Parsed JSON: {json.dumps(data, indent=2)}")
except Exception as e:
    print(f"Failed to parse JSON: {e}")