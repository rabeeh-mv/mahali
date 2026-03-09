import os
import django
import json

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mahall_backend.settings')
django.setup()

from django.test import Client
from society.models import Area, House, Member

def test_member_apis():
    print("Testing Member APIs...")
    
    # Create or get a test area
    area, area_created = Area.objects.get_or_create(
        name='Test Area', 
        defaults={'description': 'Test Description'}
    )
    if area_created:
        print(f"Created test area: {area.name}")
    else:
        print(f"Using existing test area: {area.name}")
    
    # Create or get a test house
    house, house_created = House.objects.get_or_create(
        house_name='Test House',
        family_name='Test Family',
        location_name='Test Location',
        area=area,
        address='Test Address'
    )
    # Make sure the house has a home_id
    if not house.home_id:
        house.save()
    
    if house_created:
        print(f"Created test house: {house.house_name} with ID: {house.home_id}")
    else:
        print(f"Using existing test house: {house.house_name} with ID: {house.home_id}")
    
    # Test client
    c = Client()
    
    # Test GET (list)
    response = c.get('/api/members/')
    print(f"GET /api/members/ status: {response.status_code}")
    
    # Test POST (create)
    member_data = {
        'name': 'Test Member',
        'house': house.home_id,
        'status': 'live',
        'date_of_birth': '1990-01-01',
        'phone': '1234567890',
        'isGuardian': True
    }
    
    response = c.post('/api/members/', json.dumps(member_data), content_type='application/json')
    print(f"POST /api/members/ status: {response.status_code}")
    if response.status_code == 201:
        created_member = response.json()
        member_id = created_member.get('member_id')
        print(f"Created member with ID: {member_id}")
        
        # Verify the member was actually created in the database
        try:
            member = Member.objects.get(member_id=member_id)
            print(f"Verified member exists in database: {member.name}")
            
            # Test PUT (update)
            update_data = {
                'name': 'Updated Test Member',
                'house': house.home_id,
                'status': 'live',
                'date_of_birth': '1990-01-01',
                'phone': '0987654321',
                'isGuardian': False
            }
            
            response = c.put(f"/api/members/{member_id}/", 
                             json.dumps(update_data), content_type='application/json')
            print(f"PUT /api/members/{member_id}/ status: {response.status_code}")
            if response.status_code != 200:
                print(f"PUT response content: {response.content}")
            
            # Test DELETE
            response = c.delete(f"/api/members/{member_id}/")
            print(f"DELETE /api/members/{member_id}/ status: {response.status_code}")
            if response.status_code != 204:
                print(f"DELETE response content: {response.content}")
        except Member.DoesNotExist:
            print(f"Member with ID {member_id} not found in database")
    else:
        print(f"Failed to create member: {response.content}")
    
    # Clean up test data if it was newly created
    if house_created:
        house.delete()
    if area_created:
        area.delete()

if __name__ == "__main__":
    test_member_apis()