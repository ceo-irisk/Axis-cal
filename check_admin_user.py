#!/usr/bin/env python3

import requests
import sys

def test_admin_user_creation():
    """Test if admin@example.com user exists or needs to be created"""
    base_url = "https://single-server-app.preview.emergentagent.com"
    
    # First try to login with admin@example.com
    login_data = {
        "email": "admin@example.com",
        "password": "admin123"
    }
    
    response = requests.post(f"{base_url}/api/auth/login", json=login_data, timeout=10)
    
    if response.status_code == 200:
        print("✅ admin@example.com user exists and login works")
        return True
    elif response.status_code == 401:
        print("❌ admin@example.com user does not exist or password is wrong")
        
        # Try to login with the default admin to create the user
        default_login = {
            "email": "admin@company.com",
            "password": "admin123"
        }
        
        admin_response = requests.post(f"{base_url}/api/auth/login", json=default_login, timeout=10)
        
        if admin_response.status_code == 200:
            admin_data = admin_response.json()
            admin_token = admin_data['access_token']
            
            print("✅ Logged in as default admin, creating admin@example.com user...")
            
            # Create the admin@example.com user
            user_data = {
                "email": "admin@example.com",
                "name": "Admin Example",
                "password": "admin123",
                "role": "admin",
                "timezone": "Europe/Moscow"
            }
            
            headers = {
                'Authorization': f'Bearer {admin_token}',
                'Content-Type': 'application/json'
            }
            
            create_response = requests.post(f"{base_url}/api/users", json=user_data, headers=headers, timeout=10)
            
            if create_response.status_code == 200:
                print("✅ Successfully created admin@example.com user")
                
                # Test login again
                test_response = requests.post(f"{base_url}/api/auth/login", json=login_data, timeout=10)
                if test_response.status_code == 200:
                    print("✅ admin@example.com login now works")
                    return True
                else:
                    print("❌ admin@example.com login still fails after creation")
                    return False
            else:
                print(f"❌ Failed to create admin@example.com user: {create_response.text}")
                return False
        else:
            print("❌ Cannot login as default admin either")
            return False
    else:
        print(f"❌ Unexpected response: {response.status_code} - {response.text}")
        return False

if __name__ == "__main__":
    success = test_admin_user_creation()
    sys.exit(0 if success else 1)