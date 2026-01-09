import firebase_admin
from firebase_admin import credentials, firestore
from django.conf import settings
from .models import AppSettings, House
import json
import logging

logger = logging.getLogger(__name__)

_db = None

def get_firestore_db():
    global _db
    if _db:
        return _db
    
    try:
        # Load settings
        app_settings = AppSettings.objects.first()
        if not app_settings or not app_settings.firebase_config:
            logger.warning("Firebase settings not found")
            return None
        
        # In a real scenario, firebase_config in AppSettings (which is client config) 
        # is NOT enough for Admin SDK. We need service account credentials.
        # For this implementation, we will assume the user has placed a 
        # 'serviceAccountKey.json' in the backend root or configured it via env.
        
        # However, if the user only provided the client config, we are stuck for server-side writes
        # unless we use the REST API with the API Key (which has limitations and security risks for backend usage).
        
        # BEST PRACTICE: Use Service Account.
        # Check if service account file exists
        import os
        service_account_path = os.path.join(settings.BASE_DIR, 'serviceAccountKey.json')
        
        if os.path.exists(service_account_path):
            if not firebase_admin._apps:
                cred = credentials.Certificate(service_account_path)
                firebase_admin.initialize_app(cred)
            _db = firestore.client()
            return _db
        else:
            logger.error("serviceAccountKey.json not found. Backend sync requires Service Account.")
            # Fallback (mock or error)
            return None
            
    except Exception as e:
        logger.error(f"Failed to initialize Firebase: {e}")
        return None

def sync_house_to_firebase(house_instance):
    db = get_firestore_db()
    if not db:
        return False, "Firebase DB not initialized"
    
    try:
        # If we have a firebase_id, update that document
        # If not, we might want to create one? Or wait for linking?
        
        if not house_instance.firebase_id:
            # If no ID, we can't sync TO an existing document.
            # We could create a new one, but that might duplicate if one exists but isn't linked.
            return False, "No Linked Firebase ID"

        doc_ref = db.collection('families').document(house_instance.firebase_id)
        
        # Prepare data
        # Mapping Django House -> Firestore Family
        data = {
            'houseName': house_instance.house_name,
            'familyName': house_instance.family_name,
            'locationName': house_instance.location_name,
            'address': house_instance.address,
            # We don't overwrite members here usually, unless we want to do a full sync
        }
        
        doc_ref.update(data)
        return True, "Synced House"
    except Exception as e:
        return False, str(e)

def sync_member_to_firebase(member_instance):
    # This is trickier because members are inside the 'families' document array
    db = get_firestore_db()
    if not db:
        return False, "Firebase DB not initialized"
        
    try:
        house = member_instance.house
        if not house or not house.firebase_id:
            return False, "Member not assigned to a linked House"
            
        doc_ref = db.collection('families').document(house.firebase_id)
        
        # Transactional update is best here to avoid race conditions with array
        # But for simplicity: read, modify, write
        
        doc = doc_ref.get()
        if not doc.exists:
            return False, "Firebase Document not found"
            
        doc_data = doc.to_dict()
        guardian = doc_data.get('guardian', {})
        members_list = doc_data.get('members', [])
        
        # Check if this member is the guardian
        if member_instance.isGuardian:
            # Update guardian fields
            guardian.update({
                'fullName': member_instance.name,
                'surname': member_instance.surname,
                'phone': member_instance.phone,
                'dob': str(member_instance.date_of_birth),
                # ... other fields
            })
            doc_ref.update({'guardian': guardian})
        else:
            # Update member in array
            # We need to find the member in the array. 
            # We assume 'name' matches? Or we need a stable ID in Firestore?
            # Creating a map is better, but the structure is an array.
            
            # Strategy: Look for name+surname match?
            found = False
            for i, m in enumerate(members_list):
                # Simple matching logic
                if m.get('fullName') == member_instance.name and m.get('surname') == member_instance.surname:
                    members_list[i].update({
                        'dob': str(member_instance.date_of_birth),
                        'phone': member_instance.phone,
                        'isMarried': True if member_instance.married_to else False,
                        # ...
                    })
                    found = True
                    break
            
            if not found:
                 # Add new?
                 members_list.append({
                     'fullName': member_instance.name,
                     'surname': member_instance.surname,
                     'dob': str(member_instance.date_of_birth),
                     'role': 'member'
                 })
            
            doc_ref.update({'members': members_list})
            
        return True, "Synced Member"
        
    except Exception as e:
        return False, str(e)
