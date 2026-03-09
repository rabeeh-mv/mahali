import os
import django
import sys

# Setup Django environment
sys.path.append(r'd:\work\mahall\mahali\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mahall_backend.settings')
django.setup()

from society.models import Member, House
from society.views import DigitalRequestViewSet, HouseViewSet
from rest_framework.test import APIRequestFactory

def test_fuzzy_search():
    print("--- Setting up test data ---")
    # visual check of existing data might be useful or create temp data
    
    # Let's try to search for something we know or create a dummy
    # Create a dummy member "Mohammed Ali"
    h = House.objects.create(house_name="TestHouse", family_name="TestFamily", area_id=1)
    Member.objects.create(name="Mohammed Ali", surname="K", house=h, gender="male", date_of_birth="2000-01-01")
    
    view = DigitalRequestViewSet()
    factory = APIRequestFactory()
    
    print("\n--- Testing Search: 'Muhammed' (Target: Mohammed) ---")
    request = factory.get('/search_parents/', {'search': 'Muhammed'})
    request.query_params = request.GET # Mock DRF behavior
    view.request = request
    view.format_kwarg = None
    
    response = view.search_parents(request)
    print(f"Status Code: {response.status_code}")
    found = False
    for item in response.data:
        print(f"Result: {item['name']} (ID: {item['id']})")
        if "Mohammed" in item['name']:
            found = True
            
    if found:
        print("[SUCCESS]: Found 'Mohammed' when searching for 'Muhammed'")
    else:
        print("[FAILURE]: Did not find 'Mohammed'")
        
    print("\n--- Testing House Search: 'TstHose' (Target: TestHouse) ---")
    h_view = HouseViewSet()
    request = factory.get('/check_duplicates/', {'house_name': 'TstHose'})
    request.query_params = request.GET # Mock DRF behavior
    h_view.request = request
    h_view.format_kwarg = None
    
    response = h_view.check_duplicates(request)
    found_house = False
    for item in response.data:
        print(f"Result: {item['house_name']}")
        if "TestHouse" in item['house_name']:
            found_house = True
            
    if found_house:
        print("[SUCCESS]: Found 'TestHouse' when searching for 'TstHose'")
    else:
        print("[FAILURE]: Did not find 'TestHouse'")

    # Cleanup
    Member.objects.filter(name="Mohammed Ali").delete()
    House.objects.filter(house_name="TestHouse").delete()

if __name__ == "__main__":
    test_fuzzy_search()
