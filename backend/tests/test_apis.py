import os
import django
import json

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mahall_backend.settings')
django.setup()

from django.test import Client
from society.models import Area, House

def test_house_apis():
    print("Testing House APIs...")
    
    # Create or get a test area
    area, created = Area.objects.get_or_create(
        name='Test Area', 
        defaults={'description': 'Test Description'}
    )
    if created:
        print(f"Created test area: {area.name}")
    else:
        print(f"Using existing test area: {area.name}")
    
    # Test client
    c = Client()
    
    # Test GET (list)
    response = c.get('/api/houses/')
    print(f"GET /api/houses/ status: {response.status_code}")
    
    # Test POST (create)
    house_data = {
        'house_name': 'Test House',
        'family_name': 'Test Family',
        'location_name': 'Test Location',
        'area': area.id,
        'address': 'Test Address'
    }
    
    response = c.post('/api/houses/', json.dumps(house_data), content_type='application/json')
    print(f"POST /api/houses/ status: {response.status_code}")
    if response.status_code == 201:
        created_house = response.json()
        house_id = created_house.get('home_id')
        print(f"Created house with ID: {house_id}")
        
        # Verify the house was actually created in the database
        try:
            house = House.objects.get(home_id=house_id)
            print(f"Verified house exists in database: {house.house_name}")
            
            # Test PUT (update)
            update_data = {
                'house_name': 'Updated Test House',
                'family_name': 'Updated Test Family',
                'location_name': 'Updated Test Location',
                'area': area.id,
                'address': 'Updated Test Address'
            }
            
            response = c.put(f"/api/houses/{house_id}/", 
                             json.dumps(update_data), content_type='application/json')
            print(f"PUT /api/houses/{house_id}/ status: {response.status_code}")
            if response.status_code != 200:
                print(f"PUT response content: {response.content}")
            
            # Test DELETE
            response = c.delete(f"/api/houses/{house_id}/")
            print(f"DELETE /api/houses/{house_id}/ status: {response.status_code}")
            if response.status_code != 204:
                print(f"DELETE response content: {response.content}")
        except House.DoesNotExist:
            print(f"House with ID {house_id} not found in database")
    else:
        print(f"Failed to create house: {response.content}")
    
    # Clean up test area if it was newly created
    if created:
        area.delete()

if __name__ == "__main__":
    test_house_apis()